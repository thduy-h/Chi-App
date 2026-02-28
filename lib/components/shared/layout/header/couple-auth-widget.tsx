'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient, hasSupabaseEnv } from '@/lib/supabase/browser'
import { clearActiveCoupleCache, readActiveCoupleCache } from '@/lib/supabase/couples'

interface CouplePayload {
  id: string
  code: string
}

interface CurrentCoupleResponse {
  user: { id: string; email: string } | null
  couple: CouplePayload | null
}

function compactEmail(email: string) {
  if (email.length <= 24) {
    return email
  }
  return `${email.slice(0, 10)}...${email.slice(-10)}`
}

export function CoupleAuthWidget() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [coupleCode, setCoupleCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const canUseSupabase = hasSupabaseEnv()

  const loadCurrent = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/couple/current', {
        method: 'GET',
        cache: 'no-store'
      })
      const payload = (await response.json()) as CurrentCoupleResponse
      setEmail(payload.user?.email ?? null)
      setCoupleCode(payload.couple?.code ?? null)

      if (!payload.couple) {
        const cached = readActiveCoupleCache()
        setCoupleCode(cached?.code ?? null)
      }
    } catch {
      const cached = readActiveCoupleCache()
      setCoupleCode(cached?.code ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCurrent()
  }, [loadCurrent])

  const onLogout = async () => {
    try {
      setIsLoggingOut(true)
      if (canUseSupabase) {
        const supabase = createClient()
        if (supabase) {
          await supabase.auth.signOut()
        }
      }
    } finally {
      clearActiveCoupleCache()
      setEmail(null)
      setCoupleCode(null)
      router.push('/auth')
      router.refresh()
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="hidden rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs text-gray-600 dark:border-rose-900/40 dark:bg-gray-800 dark:text-gray-200 md:block">
        Loading...
      </div>
    )
  }

  if (!email) {
    return (
      <Link
        href="/auth"
        className="hidden rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 md:inline-flex"
      >
        Đăng nhập
      </Link>
    )
  }

  return (
    <div className="hidden items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs dark:border-rose-900/40 dark:bg-gray-800 md:flex">
      <span className="font-medium text-gray-700 dark:text-gray-200">{compactEmail(email)}</span>
      <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-gray-900 dark:text-rose-200 dark:ring-rose-800">
        {coupleCode ? `#${coupleCode}` : 'No couple'}
      </span>
      <Link href="/setup" className="text-rose-600 hover:underline dark:text-rose-300">
        Setup
      </Link>
      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="rounded-full border border-gray-200 px-2 py-0.5 text-gray-600 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
      >
        {isLoggingOut ? '...' : 'Logout'}
      </button>
    </div>
  )
}
