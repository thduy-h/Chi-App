'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDispatch } from 'react-redux'

import { LetterPaper } from '@/lib/components/letters/LetterPaper'
import { setAlert } from '@/lib/features/alert/alertSlice'
import { getLetterDisplayTitle, type LetterRecord } from '@/lib/letters/types'

interface SealedEnvelopeViewerProps {
  letter: LetterRecord
  canDelete: boolean
}

export function SealedEnvelopeViewer({ letter, canDelete }: SealedEnvelopeViewerProps) {
  const router = useRouter()
  const dispatch = useDispatch()

  const [isOpen, setIsOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const openLetter = () => {
    if (isOpen || isOpening) {
      return
    }

    setIsOpening(true)
    window.setTimeout(() => {
      setIsOpen(true)
      setIsOpening(false)
      void fetch('/api/letters/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: letter.id })
      }).then(async (response) => {
        if (response.ok) {
          return
        }

        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || 'KhÃ´ng thá»ƒ cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Ã£ má»Ÿ.')
      }).catch((error) => {
        dispatch(
          setAlert({
            type: 'warning',
            title: 'ChÆ°a lÆ°u tráº¡ng thÃ¡i Ä‘á»c',
            message: error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ cáº­p nháº­t tráº¡ng thÃ¡i Ä‘á»c.'
          })
        )
      })
    }, 450)
  }

  const onDeleteLetter = async () => {
    if (!canDelete || isDeleting) {
      return
    }

    const confirmed = window.confirm('Báº¡n cháº¯c cháº¯n muá»‘n xoÃ¡ lÃ¡ thÆ° nÃ y? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.')
    if (!confirmed) {
      return
    }

    try {
      setIsDeleting(true)

      const response = await fetch('/api/letters', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: letter.id })
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'KhÃ´ng thá»ƒ xoÃ¡ thÆ°.')
      }

      dispatch(
        setAlert({
          type: 'success',
          title: 'ÄÃ£ xoÃ¡ thÆ°',
          message: 'LÃ¡ thÆ° cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c xoÃ¡.'
        })
      )

      router.push('/letters')
      router.refresh()
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'XoÃ¡ thÆ° tháº¥t báº¡i',
          message: error instanceof Error ? error.message : 'ÄÃ£ xáº£y ra lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh.'
        })
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-indigo-50 p-5 shadow-sm dark:border-sky-900/40 dark:from-sky-950/20 dark:to-indigo-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
          Kho thÆ° LoveHub
        </p>

        {!isOpen ? (
          <div className="mx-auto mt-6 max-w-xl">
            <div
              className={`relative overflow-hidden rounded-3xl border border-sky-200 bg-white p-8 text-center shadow-sm transition-all duration-500 dark:border-sky-900/50 dark:bg-gray-900 ${
                isOpening ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'
              }`}
            >
              <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-3xl dark:bg-sky-900/30">
                ðŸ’Œ
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {getLetterDisplayTitle(letter)}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Má»™t phong thÆ° Ä‘ang niÃªm phong, má»Ÿ ra Ä‘á»ƒ xem lá»i nháº¯n.
              </p>

              <button
                type="button"
                onClick={openLetter}
                disabled={isOpening}
                className="mt-6 inline-flex rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isOpening ? 'Äang má»Ÿ thÆ°...' : 'Má»Ÿ thÆ°'}
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
            className="inline-flex rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Viáº¿t thÆ° má»›i
          </Link>
          <Link
            href="/letters"
            className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Quay láº¡i
          </Link>
          {canDelete ? (
            <button
              type="button"
              onClick={() => void onDeleteLetter()}
              disabled={isDeleting}
              className="inline-flex rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800/70 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-900/30"
            >
              {isDeleting ? 'Äang xoÃ¡...' : 'XoÃ¡ thÆ° cá»§a mÃ¬nh'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
