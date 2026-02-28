import { NextResponse } from 'next/server'

import {
  generateCoupleCode,
  getCurrentCoupleForUser,
  toCouplePayload
} from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
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
    console.debug('[couple/create] current user id:', user.id)

    const existing = await getCurrentCoupleForUser(supabase, user.id)
    if (existing.coupleId && existing.coupleCode) {
      return NextResponse.json(
        { couple: { id: existing.coupleId, code: existing.coupleCode }, alreadyJoined: true },
        { status: 200 }
      )
    }

    let couple: { id: string; code: string } | null = null
    let lastErrorMessage = 'Unable to create couple'

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCoupleCode()
      const { data, error } = await supabase
        .from('couples')
        .insert({ code })
        .select('id, code')
        .single()

      if (!error && data) {
        couple = data
        break
      }

      lastErrorMessage = error?.message ?? lastErrorMessage
    }

    if (!couple) {
      return NextResponse.json({ error: lastErrorMessage }, { status: 500 })
    }
    console.debug('[couple/create] created couple row:', couple)

    const { error: membershipError } = await supabase
      .from('couple_members')
      .insert({ couple_id: couple.id, user_id: user.id })

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    return NextResponse.json({ couple: toCouplePayload(couple) }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Unable to create couple right now' }, { status: 500 })
  }
}
