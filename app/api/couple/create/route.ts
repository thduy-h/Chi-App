import { NextResponse } from 'next/server'

import {
  generateCoupleCode,
  getCurrentCoupleForUser,
  toCouplePayload
} from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

interface CouplePayload {
  id: string
  code: string
}

function parseCreatedCouple(payload: unknown): CouplePayload | null {
  if (!payload) {
    return null
  }

  if (Array.isArray(payload)) {
    const first = payload[0]
    if (first && typeof first === 'object') {
      const candidate = first as { id?: unknown; code?: unknown }
      if (typeof candidate.id === 'string' && typeof candidate.code === 'string') {
        return { id: candidate.id, code: candidate.code }
      }
    }
    return null
  }

  if (typeof payload === 'object') {
    const candidate = payload as { id?: unknown; code?: unknown }
    if (typeof candidate.id === 'string' && typeof candidate.code === 'string') {
      return { id: candidate.id, code: candidate.code }
    }
  }

  return null
}

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
      const { data, error } = await supabase.rpc('create_couple', { p_code: code })

      if (error) {
        lastErrorMessage = error?.message ?? lastErrorMessage
        continue
      }

      const parsed = parseCreatedCouple(data)
      if (parsed) {
        couple = parsed
        break
      }

      lastErrorMessage = 'create_couple did not return {id, code}'
    }

    if (!couple) {
      return NextResponse.json({ error: lastErrorMessage }, { status: 500 })
    }
    console.debug('[couple/create] created couple row:', couple)

    return NextResponse.json({ couple: toCouplePayload(couple) }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Unable to create couple right now' }, { status: 500 })
  }
}
