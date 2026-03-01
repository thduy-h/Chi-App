import { NextResponse } from 'next/server'

import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

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

  const nowIso = new Date().toISOString()
  const { error: integrationError } = await supabase.from('user_integrations').upsert(
    {
      user_id: user.id,
      telegram_chat_id: null,
      telegram_linked_at: null,
      updated_at: nowIso
    },
    { onConflict: 'user_id' }
  )

  if (integrationError) {
    return NextResponse.json({ error: integrationError.message }, { status: 500 })
  }

  const couple = await getCurrentCoupleForUser(supabase, user.id)
  if (couple.coupleId) {
    await supabase
      .from('notification_prefs')
      .update({ enabled: false })
      .eq('couple_id', couple.coupleId)
      .eq('user_id', user.id)
      .eq('channel', 'telegram')
  }

  return NextResponse.json({ ok: true })
}