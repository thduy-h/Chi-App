'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

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

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-rose-100/70 bg-white/90 shadow-sm backdrop-blur dark:border-rose-900/40 dark:bg-gray-900/90">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
              <span className="text-sm font-semibold tracking-wide text-gray-800 dark:text-white sm:text-base">
                LoveHub
              </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive(item.href)
                      ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800'
                      : 'text-gray-700 hover:bg-rose-50 hover:text-rose-700 dark:text-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <CoupleAuthWidget />
              <DarkModeToggle />
              <Cart />

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                type="button"
                className="ml-1 text-gray-500 hover:text-gray-700 focus:text-gray-700 focus:outline-none dark:text-gray-200 dark:hover:text-gray-400 dark:focus:text-gray-400 md:hidden"
                aria-label="Mở hoặc đóng menu"
                aria-expanded={isMenuOpen}
              >
                {!isMenuOpen && (
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
                )}
                {isMenuOpen && (
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
          className={`border-t border-rose-100/80 bg-white/95 transition-all duration-200 dark:border-rose-900/30 dark:bg-gray-900/95 md:hidden ${
            isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 overflow-hidden opacity-0'
          }`}
        >
          <div className="container mx-auto grid grid-cols-2 gap-2 px-4 py-3 sm:px-6">
            {navLinks.map((item) => (
              <Link
                key={`mobile-${item.href}`}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800'
                    : 'bg-gray-50 text-gray-700 hover:bg-rose-50 hover:text-rose-700 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}
