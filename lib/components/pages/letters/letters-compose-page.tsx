'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import type { LetterKind } from '@/lib/letters/types'

const moodOptions = ['Vui vẻ', 'Bình yên', 'Nhớ nhung', 'Biết ơn', 'Lãng mạn', 'Hào hứng']

export function LettersComposePage() {
  const router = useRouter()
  const dispatch = useDispatch()

  const [kind, setKind] = useState<LetterKind>('love')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [mood, setMood] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const messageCount = useMemo(() => message.trim().length, [message])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!message.trim()) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'Thiếu nội dung',
          message: 'Vui lòng nhập nội dung thư.'
        })
      )
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: kind,
          title: title.trim() || undefined,
          message: message.trim(),
          mood: kind === 'love' && mood ? mood : undefined,
          anonymous
        })
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Không thể gửi thư lúc này.')
      }

      dispatch(
        setAlert({
          type: 'success',
          title: 'Gửi thành công',
          message: kind === 'love' ? 'Lá thư của bạn đã được gửi 💌' : 'Góp ý của bạn đã được gửi 📝'
        })
      )

      router.push('/letters')
      router.refresh()
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Gửi thất bại',
          message: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
        })
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-4rem] top-[-5rem] h-56 w-56 rounded-full bg-indigo-200/60 blur-3xl dark:bg-indigo-900/20" />
      </div>

      <section className="relative container mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
              Compose
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Viết thư mới
            </h1>
          </div>

          <Link
            href="/letters"
            className="inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Quay lại hộp thư
          </Link>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm dark:border-sky-900/40 dark:bg-gray-900">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-sky-100 bg-sky-50/70 p-2 dark:border-sky-900/50 dark:bg-sky-950/20">
            <button
              type="button"
              onClick={() => setKind('love')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                kind === 'love'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-900'
              }`}
            >
              Thư tình
            </button>
            <button
              type="button"
              onClick={() => setKind('feedback')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                kind === 'feedback'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-900'
              }`}
            >
              Góp ý
            </button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="letters-title" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tiêu đề (tuỳ chọn)
              </label>
              <input
                id="letters-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={kind === 'love' ? 'Một chút dịu dàng...' : 'Ý kiến của mình...'}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {kind === 'love' ? (
              <div>
                <label htmlFor="letters-mood" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tâm trạng (tuỳ chọn)
                </label>
                <select
                  id="letters-mood"
                  value={mood}
                  onChange={(event) => setMood(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">Không chọn</option>
                  {moodOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label htmlFor="letters-message" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nội dung
              </label>
              <textarea
                id="letters-message"
                rows={8}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={
                  kind === 'love'
                    ? 'Viết vài lời yêu thương cho người ấy...'
                    : 'Chia sẻ góp ý của bạn một cách cụ thể...'
                }
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">{messageCount} ký tự</p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
              Gửi ẩn danh
            </label>

            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting
                  ? 'Đang gửi...'
                  : kind === 'love'
                    ? 'Niêm phong & Gửi 💌'
                    : 'Gửi góp ý 📝'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
