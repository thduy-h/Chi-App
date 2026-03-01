'use client'

import Link from 'next/link'
import { useState } from 'react'

import { LetterPaper } from '@/lib/components/letters/LetterPaper'
import { markOpened } from '@/lib/letters/openedLocal'
import { getLetterDisplayTitle, type LetterRecord } from '@/lib/letters/types'

export function SealedEnvelopeViewer({
  letter,
  coupleId
}: {
  letter: LetterRecord
  coupleId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)

  const openLetter = () => {
    if (isOpen || isOpening) {
      return
    }

    setIsOpening(true)
    window.setTimeout(() => {
      setIsOpen(true)
      setIsOpening(false)
      markOpened(coupleId, letter.id)
    }, 450)
  }

  return (
    <section className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50 p-5 shadow-sm dark:border-rose-900/40 dark:from-rose-950/20 dark:to-pink-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
          Kho thư LoveHub
        </p>

        {!isOpen ? (
          <div className="mx-auto mt-6 max-w-xl">
            <div
              className={`relative overflow-hidden rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm transition-all duration-500 dark:border-rose-900/50 dark:bg-gray-900 ${
                isOpening ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'
              }`}
            >
              <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl dark:bg-rose-900/30">
                💌
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{getLetterDisplayTitle(letter)}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Một phong thư đang niêm phong, mở ra để xem lời nhắn.
              </p>

              <button
                type="button"
                onClick={openLetter}
                disabled={isOpening}
                className="mt-6 inline-flex rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isOpening ? 'Đang mở thư...' : 'Mở thư'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 animate-[fadeIn_.35s_ease]">
            <LetterPaper letter={letter} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/letters/new"
            className="inline-flex rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Viết thư mới
          </Link>
          <Link
            href="/letters"
            className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Quay lại
          </Link>
        </div>
      </div>
    </section>
  )
}
