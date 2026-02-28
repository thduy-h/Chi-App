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

function parseJoinedCoupleId(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (Array.isArray(payload)) {
    const first = payload[0]
    if (typeof first === 'string' && first.trim()) {
      return first
    }
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as { couple_id?: unknown; id?: unknown }
    if (typeof candidate.couple_id === 'string' && candidate.couple_id.trim()) {
      return candidate.couple_id
    }
    if (typeof candidate.id === 'string' && candidate.id.trim()) {
      return candidate.id
    }
  }

  return null
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

    const { data: joinedData, error: joinError } = await supabase.rpc('join_by_code', { p_code: code })

    if (joinError) {
      const normalized = `${joinError.message ?? ''} ${joinError.details ?? ''}`.toLowerCase()
      const invalidCode =
        joinError.code === 'P0001' || normalized.includes('invalid') || normalized.includes('not found')

      return NextResponse.json(
        { error: invalidCode ? 'Couple code not found' : joinError.message },
        { status: invalidCode ? 404 : 500 }
      )
    }

    const joinedCoupleId = parseJoinedCoupleId(joinedData)
    if (!joinedCoupleId) {
      return NextResponse.json({ error: 'Unable to resolve joined couple id' }, { status: 500 })
    }

    const { data: membership, error: membershipError } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (membershipError || !membership?.couple_id) {
      return NextResponse.json(
        { error: membershipError?.message ?? 'Unable to verify joined membership' },
        { status: 500 }
      )
    }

    const current = await getCurrentCoupleForUser(supabase, user.id)
    if (current.coupleId && current.coupleCode) {
      return NextResponse.json(
        { couple: toCouplePayload({ id: current.coupleId, code: current.coupleCode }) },
        { status: 200 }
      )
    }

    return NextResponse.json({ couple: toCouplePayload({ id: membership.couple_id, code }) }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Unable to join couple right now' }, { status: 500 })
  }
}
