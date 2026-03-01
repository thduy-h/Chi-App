import { randomBytes } from 'crypto'

import { NextResponse } from 'next/server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function generateLinkToken() {
  return randomBytes(24).toString('base64url')
}

function formatDbError(error: {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}) {
  const message = error.message || 'Không thể tạo mã liên kết Telegram.'
  const code = error.code ? ` (${error.code})` : ''
  const details = error.details ? ` Chi tiết: ${error.details}` : ''
  const hint = error.hint ? ` Gợi ý: ${error.hint}` : ''
  return `${message}${code}${details}${hint}`
}

export async function POST() {
  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase chưa được cấu hình.' }, { status: 500 })
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 })
    }

    const token = generateLinkToken()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const admin = createSupabaseAdminClient()
    const dbClient = admin ?? supabase

    const { error: cleanupError } = await dbClient
      .from('telegram_link_tokens')
      .delete()
      .eq('user_id', user.id)

    if (cleanupError) {
      console.error('[telegram/link-token] cleanup failed', {
        code: cleanupError.code,
        message: cleanupError.message,
        details: cleanupError.details,
        hint: cleanupError.hint
      })

      return NextResponse.json({ error: formatDbError(cleanupError) }, { status: 500 })
    }

    const { error: insertError } = await dbClient.from('telegram_link_tokens').insert({
      token,
      user_id: user.id,
      expires_at: expiresAt
    })

    if (insertError) {
      console.error('[telegram/link-token] insert failed', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })

      if (insertError.code === '42P01') {
        return NextResponse.json(
          {
            error:
              'Thiếu bảng telegram_link_tokens trên Supabase. Hãy chạy migration 20260301_telegram_notifications.sql trước.'
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ error: formatDbError(insertError) }, { status: 500 })
    }

    const instructions = `Mở Telegram, nhắn bot: /start ${token}`

    return NextResponse.json({
      token,
      expiresAt,
      instructions
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    console.error('[telegram/link-token] unexpected error', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
