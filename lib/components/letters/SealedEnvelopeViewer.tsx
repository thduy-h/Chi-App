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
        throw new Error(payload.error || 'Không thể cập nhật trạng thái đã mở.')
      }).catch((error) => {
        dispatch(
          setAlert({
            type: 'warning',
            title: 'Chưa lưu trạng thái đọc',
            message: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đọc.'
          })
        )
      })
    }, 450)
  }

  const onDeleteLetter = async () => {
    if (!canDelete || isDeleting) {
      return
    }

    const confirmed = window.confirm('Bạn chắc chắn muốn xoá lá thư này? Hành động này không thể hoàn tác.')
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
          {canDelete ? (
            <button
              type="button"
              onClick={() => void onDeleteLetter()}
              disabled={isDeleting}
              className="inline-flex rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800/70 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-900/30"
            >
              {isDeleting ? 'Đang xoá...' : 'Xoá thư của mình'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
