import { randomBytes } from 'crypto'

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

function generateLinkToken() {
  return randomBytes(24).toString('base64url')
}

export async function POST() {
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

  const { error: cleanupError } = await supabase
    .from('telegram_link_tokens')
    .delete()
    .eq('user_id', user.id)

  if (cleanupError) {
    return NextResponse.json({ error: cleanupError.message }, { status: 500 })
  }

  const { error: insertError } = await supabase.from('telegram_link_tokens').insert({
    token,
    user_id: user.id,
    expires_at: expiresAt
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const instructions = `Mở Telegram, nhắn bot: /start ${token}`

  return NextResponse.json({
    token,
    expiresAt,
    instructions
  })
}