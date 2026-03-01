import { NextResponse } from 'next/server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ members: [], error: 'Supabase chưa được cấu hình.' }, { status: 500 })
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ members: [], error: 'Bạn cần đăng nhập.' }, { status: 401 })
    }

    const currentCouple = await getCurrentCoupleForUser(supabase, user.id)
    if (!currentCouple.coupleId) {
      return NextResponse.json({ members: [], coupleId: null }, { status: 200 })
    }

    const admin = createSupabaseAdminClient()
    const dbClient = admin ?? supabase

    const { data: rows, error: rowsError } = await dbClient
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', currentCouple.coupleId)
      .order('created_at', { ascending: true })

    if (rowsError) {
      return NextResponse.json({ members: [], error: rowsError.message }, { status: 500 })
    }

    const members = Array.from(new Set((rows || []).map((row) => row.user_id).filter(Boolean)))
    const partnerUserId = members.find((memberId) => memberId !== user.id) ?? null

    return NextResponse.json(
      {
        coupleId: currentCouple.coupleId,
        currentUserId: user.id,
        partnerUserId,
        members
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ members: [], error: message }, { status: 500 })
  }
}
