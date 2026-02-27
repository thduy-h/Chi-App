'use client'

import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setAlert } from '@/lib/features/alert/alertSlice'

type LetterMode = 'feedback' | 'love'

const modeMeta: Record<LetterMode, { title: string; subtitle: string; button: string }> = {
  feedback: {
    title: 'Góp ý cho LoveHub',
    subtitle: 'Gửi góp ý để LoveHub ngày càng hữu ích hơn cho cả hai.',
    button: 'Gửi góp ý'
  },
  love: {
    title: 'Thư tình',
    subtitle: 'Viết một lá thư ngắn, ấm áp và chân thành.',
    button: 'Gửi thư tình'
  }
}

const moodOptions = [
  { value: '', label: 'Không chọn' },
  { value: 'happy', label: 'Vui vẻ' },
  { value: 'calm', label: 'Bình yên' },
  { value: 'excited', label: 'Hào hứng' },
  { value: 'grateful', label: 'Biết ơn' },
  { value: 'romantic', label: 'Lãng mạn' }
]

export const LettersPage = () => {
  const dispatch = useDispatch()

  const [mode, setMode] = useState<LetterMode>('feedback')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [mood, setMood] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmation, setConfirmation] = useState<{
    mode: LetterMode
    title: string
    createdAt: string
  } | null>(null)

  const currentModeMeta = useMemo(() => modeMeta[mode], [mode])

  const resetForm = () => {
    setTitle('')
    setMessage('')
    setMood('')
    setAnonymous(false)
    setSubmitError('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')

    if (!title.trim() || !message.trim()) {
      const errorMessage = 'Vui lòng nhập đầy đủ tiêu đề và nội dung.'
      setSubmitError(errorMessage)
      dispatch(
        setAlert({
          title: 'Thiếu thông tin',
          message: errorMessage,
          type: 'warning'
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
          mode,
          title: title.trim(),
          message: message.trim(),
          mood: mood || undefined,
          anonymous
        })
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể gửi thư lúc này.')
      }

      setConfirmation({
        mode,
        title: title.trim(),
        createdAt: new Date().toISOString()
      })
      resetForm()

      dispatch(
        setAlert({
          title: 'Gửi thành công',
          message:
            mode === 'feedback'
              ? 'Cảm ơn góp ý của bạn. LoveHub đã nhận được.'
              : 'Lá thư tình đã được gửi đi.',
          type: 'success'
        })
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi gửi thư.'
      setSubmitError(errorMessage)

      dispatch(
        setAlert({
          title: 'Gửi thất bại',
          message: errorMessage,
          type: 'error'
        })
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-rose-100/80 via-white to-white dark:from-rose-950/20 dark:via-gray-900 dark:to-gray-900" />

      <section className="relative container mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <span className="inline-flex rounded-full border border-rose-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 shadow-sm dark:border-rose-900 dark:bg-gray-900 dark:text-rose-300">
            LoveHub Letters
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Gửi góp ý và thư tình
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300 sm:text-base">
            Dựa trên form submission pattern từ Formspree reference, được tích hợp thành route
            server-side an toàn cho LoveHub.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-rose-100 bg-white p-2 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('feedback')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === 'feedback'
                ? 'bg-rose-600 text-white shadow'
                : 'text-gray-700 hover:bg-rose-50 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
            >
              Góp ý
            </button>
            <button
              type="button"
              onClick={() => setMode('love')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === 'love'
                ? 'bg-rose-600 text-white shadow'
                : 'text-gray-700 hover:bg-rose-50 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
            >
              Thư tình
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-rose-900/40 dark:bg-gray-900 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{currentModeMeta.title}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{currentModeMeta.subtitle}</p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="letters-title"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Tiêu đề
                </label>
                <input
                  id="letters-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder={mode === 'feedback' ? 'Ví dụ: Cần thêm lọc theo ngày' : 'Ví dụ: Gửi em một ngày dịu dàng'}
                />
              </div>

              <div>
                <label
                  htmlFor="letters-message"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Nội dung
                </label>
                <textarea
                  id="letters-message"
                  rows={6}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder={
                    mode === 'feedback'
                      ? 'Mô tả góp ý cụ thể của bạn...'
                      : 'Viết vài dòng cho người bạn thương...'
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="letters-mood"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Mood (tuỳ chọn)
                  </label>
                  <select
                    id="letters-mood"
                    value={mood}
                    onChange={(event) => setMood(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {moodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(event) => setAnonymous(event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    Gửi ẩn danh
                  </label>
                </div>
              </div>

              {submitError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  {submitError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Đang gửi...' : currentModeMeta.button}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Làm mới
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">
                LoveHub Notes
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>- Góp ý giúp app thân thiện hơn.</li>
                <li>- Thư tình giữ lại cảm xúc mỗi ngày.</li>
                <li>- Dữ liệu gửi qua route server-side, không lộ secret.</li>
              </ul>
            </div>

            {confirmation && (
              <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 p-5 shadow-sm dark:border-rose-900/40 dark:from-rose-900/20 dark:to-pink-900/10">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">
                  Đã gửi thành công
                </p>
                <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                  {confirmation.mode === 'feedback' ? 'Cảm ơn góp ý của bạn' : 'Lá thư đã bay đến nơi'}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  “{confirmation.title}”
                </p>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(confirmation.createdAt).toLocaleString('vi-VN')}
                </p>
                <div className="mt-4 text-xl">💌 💖 ✨</div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
