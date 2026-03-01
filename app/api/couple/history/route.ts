import { NextResponse } from 'next/server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

interface HistoryItem {
  id: string
  code: string
  created_at: string | null
  memberCount: number
  isCurrentMember: boolean
}

export async function GET() {
  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ history: [], error: 'Supabase chưa được cấu hình.' }, { status: 500 })
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ history: [] }, { status: 200 })
    }

    const admin = createSupabaseAdminClient()
    const dbClient = admin ?? supabase

    const { data: couples, error: couplesError } = await dbClient
      .from('couples')
      .select('id, code, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (couplesError) {
      return NextResponse.json({ history: [], error: couplesError.message }, { status: 500 })
    }

    const coupleRows = couples || []
    if (coupleRows.length < 1) {
      return NextResponse.json({ history: [] }, { status: 200 })
    }

    const coupleIds = coupleRows.map((row) => row.id)
    const { data: members, error: membersError } = await dbClient
      .from('couple_members')
      .select('couple_id, user_id')
      .in('couple_id', coupleIds)

    if (membersError) {
      return NextResponse.json({ history: [], error: membersError.message }, { status: 500 })
    }

    const memberCountMap = new Map<string, number>()
    const myMembershipMap = new Map<string, boolean>()

    for (const row of members || []) {
      memberCountMap.set(row.couple_id, (memberCountMap.get(row.couple_id) || 0) + 1)
      if (row.user_id === user.id) {
        myMembershipMap.set(row.couple_id, true)
      }
    }

    const history: HistoryItem[] = coupleRows.map((row) => ({
      id: row.id,
      code: row.code,
      created_at: row.created_at,
      memberCount: memberCountMap.get(row.id) || 0,
      isCurrentMember: Boolean(myMembershipMap.get(row.id))
    }))

    return NextResponse.json({ history }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ history: [], error: message }, { status: 500 })
  }
}
