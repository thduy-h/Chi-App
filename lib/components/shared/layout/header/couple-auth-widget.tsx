'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'

import type { HomeMode } from '@/lib/home-mode'
import { setAlert } from '@/lib/features/alert/alertSlice'
import { useCoupleContext } from '@/lib/hooks/use-couple-context'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { clearLovehubLocalStorage } from '@/lib/supabase/couples'

function compactEmail(email: string) {
  const firstPart = email.split('@')[0] || email
  if (firstPart.length <= 14) {
    return firstPart
  }
  return `${firstPart.slice(0, 11)}...`
}

export function CoupleAuthWidget({ mode = 'c' }: { mode?: HomeMode }) {
  const router = useRouter()
  const dispatch = useDispatch()
  const menuRef = useRef<HTMLDivElement | null>(null)

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const { user, couple, loading, refreshCouple } = useCoupleContext()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const colorMode = mode === 'c' ? 'blue' : 'pink'
  const theme =
    colorMode === 'pink'
      ? {
          loadingWrap: 'border-rose-100 bg-rose-50 dark:border-rose-900/40',
          loadingDot: 'bg-rose-400',
          login: 'bg-rose-500 hover:bg-rose-600',
          button:
            'border-rose-100 bg-rose-50 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-gray-800 dark:hover:bg-gray-700',
          coupleText: 'text-rose-600 dark:text-rose-300',
          coupleButton:
            'border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-gray-800',
          setupLink: 'text-rose-600 hover:underline dark:text-rose-300'
        }
      : {
          loadingWrap: 'border-sky-100 bg-sky-50 dark:border-sky-900/40',
          loadingDot: 'bg-sky-400',
          login: 'bg-sky-500 hover:bg-sky-600',
          button:
            'border-sky-100 bg-sky-50 hover:bg-sky-100 dark:border-sky-900/40 dark:bg-gray-800 dark:hover:bg-gray-700',
          coupleText: 'text-sky-600 dark:text-sky-300',
          coupleButton:
            'border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-200 dark:hover:bg-gray-800',
          setupLink: 'text-sky-600 hover:underline dark:text-sky-300'
        }

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
      setMenuOpen(false)
      await refreshCouple(false)

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
      <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-200 ${theme.loadingWrap}`}>
        <span className={`inline-flex h-2 w-2 animate-pulse rounded-full ${theme.loadingDot}`} />
        Đang tải...
      </div>
    )
  }

  if (!user?.email) {
    return (
      <Link
        href="/auth"
        className={`rounded-full px-4 py-2 text-sm font-medium text-white transition ${theme.login}`}
      >
        Đăng nhập
      </Link>
    )
  }

  return (
    <div className="relative z-[80]" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((previous) => !previous)}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 transition dark:text-gray-200 ${theme.button}`}
      >
        <span>{compactEmail(user.email)}</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">v</span>
      </button>

      {menuOpen ? (
        <div className="absolute right-0 z-[90] mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <p className="px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400">{user.email}</p>

          {couple?.code ? (
            <div className="mb-2 flex items-center justify-between gap-2 px-2 pb-2">
              <p className={`text-[11px] ${theme.coupleText}`}>Mã couple: {couple.code}</p>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(couple.code || '')}
                className={`rounded-md border px-2 py-1 text-[10px] font-medium transition ${theme.coupleButton}`}
              >
                Sao chép
              </button>
            </div>
          ) : (
            <div className="mb-2 px-2 pb-2">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Chưa ghép đôi</p>
              <Link
                href="/setup"
                onClick={() => setMenuOpen(false)}
                className={`text-[11px] font-medium ${theme.setupLink}`}
              >
                Tạo hoặc tham gia couple
              </Link>
            </div>
          )}

          <Link
            href="/setup"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg px-2 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Thiết lập couple
          </Link>
          <Link
            href="/settings/notifications"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg px-2 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cài đặt thông báo
          </Link>
          <Link
            href="/settings/nicknames"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg px-2 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cài đặt biệt danh
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
