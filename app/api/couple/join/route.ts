import { NextResponse } from 'next/server'

import {
  getCurrentCoupleForUser,
  normalizeCoupleCode,
  toCouplePayload
} from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

interface JoinPayload {
  code?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JoinPayload
    const code = body.code ? normalizeCoupleCode(body.code) : ''
    if (!code) {
      return NextResponse.json({ error: 'Please enter a valid couple code' }, { status: 400 })
    }

    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase env is missing' }, { status: 500 })
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await getCurrentCoupleForUser(supabase, user.id)
    if (existing.coupleId && existing.coupleCode) {
      return NextResponse.json(
        { couple: { id: existing.coupleId, code: existing.coupleCode }, alreadyJoined: true },
        { status: 200 }
      )
    }

    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('id, code')
      .eq('code', code)
      .maybeSingle()

    if (coupleError) {
      return NextResponse.json({ error: coupleError.message }, { status: 500 })
    }

    if (!couple) {
      return NextResponse.json({ error: 'Couple code not found' }, { status: 404 })
    }

    const { error: membershipError } = await supabase
      .from('couple_members')
      .insert({ couple_id: couple.id, user_id: user.id })

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    return NextResponse.json({ couple: toCouplePayload(couple) }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Unable to join couple right now' }, { status: 500 })
  }
}
