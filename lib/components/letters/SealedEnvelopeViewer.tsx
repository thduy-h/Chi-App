'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDispatch } from 'react-redux'

import type { HomeMode } from '@/lib/home-mode'
import { useResolvedHomeMode } from '@/lib/hooks/use-resolved-home-mode'
import { LetterPaper } from '@/lib/components/letters/LetterPaper'
import { setAlert } from '@/lib/features/alert/alertSlice'
import { getLetterDisplayTitle, type LetterRecord } from '@/lib/letters/types'

interface SealedEnvelopeViewerProps {
  letter: LetterRecord
  canDelete: boolean
  mode?: HomeMode
}

export function SealedEnvelopeViewer({
  letter,
  canDelete,
  mode: initialMode = 'c'
}: SealedEnvelopeViewerProps) {
  const mode = useResolvedHomeMode(initialMode)
  const router = useRouter()
  const dispatch = useDispatch()

  const [isOpen, setIsOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const colorMode = mode === 'c' ? 'blue' : 'pink'
  const theme =
    colorMode === 'pink'
      ? {
          panel: 'border-rose-100 from-rose-50 to-fuchsia-50 dark:border-rose-900/40 dark:from-rose-950/20 dark:to-fuchsia-950/20',
          badge: 'text-rose-600 dark:text-rose-300',
          envelope: 'border-rose-200 dark:border-rose-900/50',
          icon: 'bg-rose-100 dark:bg-rose-900/30',
          primary: 'bg-rose-600 hover:bg-rose-700',
          danger:
            'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-900/30'
        }
      : {
          panel: 'border-sky-100 from-sky-50 to-indigo-50 dark:border-sky-900/40 dark:from-sky-950/20 dark:to-indigo-950/20',
          badge: 'text-sky-600 dark:text-sky-300',
          envelope: 'border-sky-200 dark:border-sky-900/50',
          icon: 'bg-sky-100 dark:bg-sky-900/30',
          primary: 'bg-sky-600 hover:bg-sky-700',
          danger:
            'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800/70 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:bg-sky-900/30'
        }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: letter.id })
      })
        .then(async (response) => {
          if (response.ok) {
            return
          }
          const payload = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error || 'Không thể cập nhật trạng thái đã mở.')
        })
        .catch((error) => {
          dispatch(
            setAlert({
              type: 'warning',
              title: 'Chưa lưu trạng thái đọc',
              message:
                error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đã đọc.'
            })
          )
        })
    }, 450)
  }

  const onDeleteLetter = async () => {
    if (!canDelete || isDeleting) {
      return
    }

    const confirmed = window.confirm(
      'Bạn chắc chắn muốn xoá lá thư này? Hành động này không thể hoàn tác.'
    )
    if (!confirmed) {
      return
    }

    try {
      setIsDeleting(true)
      const response = await fetch('/api/letters', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: letter.id })
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Không thể xoá thư.')
      }

      dispatch(
        setAlert({
          type: 'success',
          title: 'Đã xoá thư',
          message: 'Lá thư của bạn đã được xoá.'
        })
      )

      router.push('/letters')
      router.refresh()
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Xoá thư thất bại',
          message: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
        })
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${theme.panel}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.badge}`}>
          Kho thư LoveHub
        </p>

        {!isOpen ? (
          <div className="mx-auto mt-6 max-w-xl">
            <div
              className={`relative overflow-hidden rounded-3xl border bg-white p-8 text-center shadow-sm transition-all duration-500 dark:bg-gray-900 ${theme.envelope} ${
                isOpening ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'
              }`}
            >
              <div
                className={`mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${theme.icon}`}
              >
                💌
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {getLetterDisplayTitle(letter)}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Một phong thư đang niêm phong, mở ra để xem lời nhắn.
              </p>

              <button
                type="button"
                onClick={openLetter}
                disabled={isOpening}
                className={`mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${theme.primary}`}
              >
                {isOpening ? 'Đang mở thư...' : 'Mở thư'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 animate-[fadeIn_.35s_ease]">
            <LetterPaper letter={letter} colorMode={colorMode} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/letters/new"
            className={`inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white transition ${theme.primary}`}
          >
            Viết thư mới
          </Link>
          <Link
            href="/letters"
            className="inline-flex rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Quay lại
          </Link>
          {canDelete ? (
            <button
              type="button"
              onClick={() => void onDeleteLetter()}
              disabled={isDeleting}
              className={`inline-flex rounded-full border px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.danger}`}
            >
              {isDeleting ? 'Đang xoá...' : 'Xoá thư của mình'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
