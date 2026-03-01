import { NextResponse } from 'next/server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

interface TelegramUpdate {
  message?: {
    text?: string
    chat?: {
      id?: number | string
    }
  }
}

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return
  }

  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`
  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    }),
    cache: 'no-store'
  })
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  const providedSecret = request.headers.get('x-telegram-bot-api-secret-token')

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized webhook call.' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Missing Supabase admin configuration.' }, { status: 500 })
  }

  const payload = (await request.json().catch(() => null)) as TelegramUpdate | null
  if (!payload?.message?.text || payload.message.chat?.id === undefined) {
    return NextResponse.json({ ok: true })
  }

  const text = payload.message.text.trim()
  const chatId = String(payload.message.chat.id)
  const match = text.match(/^\/start(?:@[a-zA-Z0-9_]+)?\s+([A-Za-z0-9_-]+)$/)

  if (!match) {
    return NextResponse.json({ ok: true })
  }

  const token = match[1]
  const { data: tokenRow, error: tokenError } = await admin
    .from('telegram_link_tokens')
    .select('token, user_id, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 })
  }

  if (!tokenRow) {
    await sendTelegramMessage(chatId, 'Mã liên kết không hợp lệ hoặc đã được sử dụng.')
    return NextResponse.json({ ok: true })
  }

  const isExpired = new Date(tokenRow.expires_at).getTime() < Date.now()
  if (isExpired) {
    await admin.from('telegram_link_tokens').delete().eq('token', token)
    await sendTelegramMessage(chatId, 'Mã liên kết đã hết hạn. Vui lòng tạo mã mới trong LoveHub.')
    return NextResponse.json({ ok: true })
  }

  const nowIso = new Date().toISOString()
  const { error: upsertError } = await admin.from('user_integrations').upsert(
    {
      user_id: tokenRow.user_id,
      telegram_chat_id: chatId,
      telegram_linked_at: nowIso,
      updated_at: nowIso
    },
    { onConflict: 'user_id' }
  )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  await admin.from('telegram_link_tokens').delete().eq('token', token)
  await sendTelegramMessage(chatId, 'Liên kết Telegram với LoveHub thành công ✅')

  return NextResponse.json({ ok: true })
}