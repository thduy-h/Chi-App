import { NextResponse } from 'next/server'

import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ user: null, couple: null, error: 'Supabase env is missing' }, { status: 200 })
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ user: null, couple: null }, { status: 200 })
    }

    const currentCouple = await getCurrentCoupleForUser(supabase, user.id)

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email ?? ''
        },
        couple:
          currentCouple.coupleId && currentCouple.coupleCode
            ? { id: currentCouple.coupleId, code: currentCouple.coupleCode }
            : null
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { user: null, couple: null, error: 'Unable to load current couple context' },
      { status: 200 }
    )
  }
}
