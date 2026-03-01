import { NextResponse } from 'next/server'

import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

interface MarkReadPayload {
  id?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as MarkReadPayload
    const letterId = body.id?.trim()
    if (!letterId) {
      return NextResponse.json({ error: 'Thiếu id thư.' }, { status: 400 })
    }

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

    const currentCouple = await getCurrentCoupleForUser(supabase, user.id)
    if (!currentCouple.coupleId) {
      return NextResponse.json({ error: 'Bạn chưa có couple.' }, { status: 403 })
    }

    const { data: letterRow, error: letterError } = await supabase
      .from('letters')
      .select('id')
      .eq('id', letterId)
      .eq('couple_id', currentCouple.coupleId)
      .maybeSingle()

    if (letterError) {
      return NextResponse.json({ error: letterError.message }, { status: 500 })
    }
    if (!letterRow) {
      return NextResponse.json({ error: 'Không tìm thấy thư.' }, { status: 404 })
    }

    const { error: upsertError } = await supabase.from('letter_reads').upsert(
      {
        couple_id: currentCouple.coupleId,
        letter_id: letterId,
        user_id: user.id,
        opened_at: new Date().toISOString()
      },
      {
        onConflict: 'letter_id,user_id',
        ignoreDuplicates: true
      }
    )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
