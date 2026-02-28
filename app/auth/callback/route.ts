import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const nextPath = requestUrl.searchParams.get('next') ?? '/setup'
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null

  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.redirect(new URL('/auth?error=missing-env', requestUrl.origin))
    }

    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    } else if (tokenHash && type) {
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type
      })
    }
  } catch {
    return NextResponse.redirect(new URL('/auth?error=callback', requestUrl.origin))
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
}
