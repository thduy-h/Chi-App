'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import { createSupabaseBrowserClient, hasSupabaseEnv } from '@/lib/supabase/client'
import { clearLovehubLocalStorage, readActiveCoupleCache } from '@/lib/supabase/couples'

interface CouplePayload {
  id: string
  code: string
}

interface CurrentCoupleResponse {
  user: { id: string; email: string } | null
  couple: CouplePayload | null
}

function compactEmail(email: string) {
  const firstPart = email.split('@')[0] || email
  if (firstPart.length <= 14) {
    return firstPart
  }
  return `${firstPart.slice(0, 11)}...`
}

export function CoupleAuthWidget() {
  const router = useRouter()
  const dispatch = useDispatch()
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [email, setEmail] = useState<string | null>(null)
  const [coupleCode, setCoupleCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const canUseSupabase = hasSupabaseEnv()
  const supabase = useMemo(() => {
    if (!canUseSupabase) {
      return null
    }
    return createSupabaseBrowserClient()
  }, [canUseSupabase])

  const loadCurrent = useCallback(
    async (withSpinner = true) => {
      try {
        if (withSpinner) {
          setLoading(true)
        }

        let clientEmail: string | null = null
        if (supabase) {
          const {
            data: { user }
          } = await supabase.auth.getUser()
          clientEmail = user?.email ?? null
          setEmail(clientEmail)
        }

        const response = await fetch('/api/couple/current', {
          method: 'GET',
          cache: 'no-store'
        })
        const payload = (await response.json()) as CurrentCoupleResponse

        setEmail(payload.user?.email ?? clientEmail ?? null)

        if (payload.couple?.code) {
          setCoupleCode(payload.couple.code)
        } else {
          const cached = readActiveCoupleCache()
          setCoupleCode(cached?.code ?? null)
        }
      } catch {
        const cached = readActiveCoupleCache()
        setCoupleCode(cached?.code ?? null)
      } finally {
        if (withSpinner) {
          setLoading(false)
        }
      }
    },
    [supabase]
  )

  useEffect(() => {
    void loadCurrent(true)
  }, [loadCurrent])

  useEffect(() => {
    if (!supabase) {
      return
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextEmail = session?.user?.email ?? null
      setEmail(nextEmail)

      if (!nextEmail) {
        setCoupleCode(null)
        setMenuOpen(false)
        return
      }

      void loadCurrent(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadCurrent, supabase])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return
      }
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const onLogout = async () => {
    try {
      setIsLoggingOut(true)
      if (supabase) {
        await supabase.auth.signOut()
      }
      clearLovehubLocalStorage()
      setEmail(null)
      setCoupleCode(null)
      setMenuOpen(false)
      dispatch(
        setAlert({
          type: 'success',
          title: 'Đăng xuất',
          message: 'Đã đăng xuất'
        })
      )
      router.push('/auth')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs text-gray-600 dark:border-rose-900/40 dark:bg-gray-800 dark:text-gray-200">
        Đang tải...
      </div>
    )
  }

  if (!email) {
    return (
      <Link
        href="/auth"
        className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
      >
        Đăng nhập
      </Link>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((previous) => !previous)}
        className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <span>{compactEmail(email)}</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">v</span>
      </button>

      {menuOpen ? (
        <div className="absolute right-0 z-40 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <p className="px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400">{email}</p>
          <p className="px-2 pb-2 text-[11px] text-rose-600 dark:text-rose-300">
            {coupleCode ? `Mã couple: ${coupleCode}` : 'Chưa có couple'}
          </p>
          <Link
            href="/setup"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg px-2 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Thiết lập couple
          </Link>
          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={isLoggingOut}
            className="mt-1 block w-full rounded-lg px-2 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
