'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { HomeMode } from '@/lib/home-mode'
import { useResolvedHomeMode } from '@/lib/hooks/use-resolved-home-mode'
import { Cart } from '@/lib/components/shared/cart'
import { Logo } from '@/lib/components/shared/logo'
import { CoupleAuthWidget } from '@/lib/components/shared/layout/header/couple-auth-widget'
import { DarkModeToggle } from '@/lib/components/shared/layout/header/dark-mode-toggle'

const navLinks = [
  { href: '/food', label: 'Món ăn' },
  { href: '/cycle', label: 'Chu kỳ' },
  { href: '/tasks', label: 'Việc chung' },
  { href: '/finance', label: 'Tài chính' },
  { href: '/letters', label: 'Lá thư' }
]

export const Header = ({ mode: initialMode = 'c' }: { mode?: HomeMode }) => {
  const mode = useResolvedHomeMode(initialMode)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const colorMode = mode === 'c' ? 'blue' : 'pink'
  const isPremiumMode = mode === 'a' || mode === 'b'
  const brandLabel = mode === 'a' ? 'Nhà Cáo Thỏ' : 'LoveHub'

  useEffect(() => {
    const root = document.documentElement
    root.dataset.homeMode = mode
    root.classList.toggle('mode-premium', isPremiumMode)
  }, [isPremiumMode, mode])

  const theme =
    colorMode === 'pink'
      ? {
          navWrap: 'border-rose-100/70 dark:border-rose-900/40',
          navActive:
            'bg-rose-100 text-rose-700 ring-1 ring-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800',
          navIdle: 'text-gray-700 hover:bg-rose-50 hover:text-rose-700 dark:text-gray-200 dark:hover:bg-gray-800',
          mobileWrap: 'border-rose-100/80 dark:border-rose-900/30',
          mobileIdle:
            'bg-gray-50 text-gray-700 hover:bg-rose-50 hover:text-rose-700 dark:bg-gray-800 dark:text-gray-200'
        }
      : {
          navWrap: 'border-sky-100/70 dark:border-sky-900/40',
          navActive:
            'bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-sky-800',
          navIdle: 'text-gray-700 hover:bg-sky-50 hover:text-sky-700 dark:text-gray-200 dark:hover:bg-gray-800',
          mobileWrap: 'border-sky-100/80 dark:border-sky-900/30',
          mobileIdle:
            'bg-gray-50 text-gray-700 hover:bg-sky-50 hover:text-sky-700 dark:bg-gray-800 dark:text-gray-200'
        }

  return (
    <nav
      className={`sticky top-0 z-50 overflow-visible border-b bg-white/90 shadow-sm backdrop-blur dark:bg-gray-900/90 ${theme.navWrap}`}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 max-w-[52vw] items-center gap-2 sm:max-w-none">
            <Logo colorMode={colorMode} />
            <span className="truncate text-sm font-semibold tracking-wide text-gray-800 dark:text-white sm:text-base">
              {brandLabel}
            </span>
            {isPremiumMode ? (
              <span className="inline-flex shrink-0 rounded-full border border-amber-300 bg-amber-200 px-1.5 py-0.5 text-[9px] font-semibold text-amber-900 shadow-sm md:px-2.5 md:py-1 md:text-[10px] md:uppercase md:tracking-[0.16em]">
                <span className="md:hidden">PRE</span>
                <span className="hidden md:inline">Premium</span>
              </span>
            ) : null}
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive(item.href) ? theme.navActive : theme.navIdle
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative z-[70] hidden md:block">
              <CoupleAuthWidget mode={mode} />
            </div>
            <DarkModeToggle />
            <Cart />

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              className="ml-1 text-gray-500 hover:text-gray-700 focus:text-gray-700 focus:outline-none dark:text-gray-200 dark:hover:text-gray-400 dark:focus:text-gray-400 md:hidden"
              aria-label="Mở hoặc đóng menu"
              aria-expanded={isMenuOpen}
            >
              {!isMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`border-t bg-white/95 transition-all duration-200 dark:bg-gray-900/95 md:hidden ${
          theme.mobileWrap
        } ${isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 overflow-hidden opacity-0'}`}
      >
        <div className="container mx-auto grid grid-cols-2 gap-2 px-4 py-3 sm:px-6">
          <div className="col-span-2 mb-1 flex justify-end">
            <CoupleAuthWidget mode={mode} />
          </div>
          {navLinks.map((item) => (
            <Link
              key={`mobile-${item.href}`}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive(item.href) ? theme.navActive : theme.mobileIdle
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
