'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'

type LetterMode = 'feedback' | 'love'
type InboxState = 'ready' | 'logged_out' | 'no_couple' | 'error'

interface InboxLetter {
  id: string
  kind: LetterMode
  title: string
  message: string
  mood: string | null
  anonymous: boolean
  created_at: string | null
}

const modeMeta: Record<LetterMode, { title: string; subtitle: string; button: string }> = {
  feedback: {
    title: 'Góp ý cho LoveHub',
    subtitle: 'G?i góp ý d? LoveHub ngày càng h?u ích hon cho c? hai.',
    button: 'G?i góp ý'
  },
  love: {
    title: 'Thu tình',
    subtitle: 'Vi?t m?t lá thu ng?n, ?m áp và chân thành.',
    button: 'G?i thu tình'
  }
}

const moodOptions = [
  { value: '', label: 'Không ch?n' },
  { value: 'happy', label: 'Vui v?' },
  { value: 'calm', label: 'Bình yên' },
  { value: 'excited', label: 'Hào h?ng' },
  { value: 'grateful', label: 'Bi?t on' },
  { value: 'romantic', label: 'Lãng m?n' }
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
    source: 'supabase' | 'webhook'
  } | null>(null)

  const [inbox, setInbox] = useState<InboxLetter[]>([])
  const [inboxLoading, setInboxLoading] = useState(true)
  const [inboxState, setInboxState] = useState<InboxState>('ready')
  const [inboxCoupleCode, setInboxCoupleCode] = useState<string | null>(null)

  const currentModeMeta = useMemo(() => modeMeta[mode], [mode])

  const loadInbox = useCallback(async () => {
    try {
      setInboxLoading(true)
      const response = await fetch('/api/letters', {
        method: 'GET',
        cache: 'no-store'
      })

      if (response.status === 401) {
        setInbox([])
        setInboxState('logged_out')
        setInboxCoupleCode(null)
        return
      }

      const payload = (await response.json().catch(() => ({}))) as {
        letters?: InboxLetter[]
        reason?: string
        coupleCode?: string | null
      }

      if (payload.reason === 'no-couple') {
        setInbox([])
        setInboxState('no_couple')
        setInboxCoupleCode(null)
        return
      }

      setInbox(Array.isArray(payload.letters) ? payload.letters : [])
      setInboxCoupleCode(payload.coupleCode || null)
      setInboxState('ready')
    } catch {
      setInbox([])
      setInboxState('error')
      setInboxCoupleCode(null)
    } finally {
      setInboxLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInbox()
  }, [loadInbox])

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
      const errorMessage = 'Vui lòng nh?p d?y d? tiêu d? và n?i dung.'
      setSubmitError(errorMessage)
      dispatch(
        setAlert({
          title: 'Thi?u thông tin',
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

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        source?: 'supabase' | 'webhook'
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Không th? g?i thu lúc này.')
      }

      const source = payload.source || 'webhook'

      setConfirmation({
        mode,
        title: title.trim(),
        createdAt: new Date().toISOString(),
        source
      })
      resetForm()

      if (source === 'supabase') {
        void loadInbox()
      }

      dispatch(
        setAlert({
          title: 'G?i thành công',
          message:
            source === 'supabase'
              ? 'Thu dã du?c luu vào Inbox Supabase c?a couple.'
              : 'Ðã g?i qua webhook d? phòng (Formspree/Webhook).',
          type: 'success'
        })
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ðã x?y ra l?i khi g?i thu.'
      setSubmitError(errorMessage)

      dispatch(
        setAlert({
          title: 'G?i th?t b?i',
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-sky-100/80 via-white to-white dark:from-sky-950/20 dark:via-gray-900 dark:to-gray-900" />

      <section className="relative container mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <span className="inline-flex rounded-full border border-sky-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 shadow-sm dark:border-sky-900 dark:bg-gray-900 dark:text-sky-300">
            LoveHub Lá Thu
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            G?i góp ý và thu tình
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300 sm:text-base">
            N?u dã dang nh?p và có couple, thu s? du?c luu trong Supabase Inbox. N?u chua dang
            nh?p, g?i thu s? fallback qua webhook.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-sky-100 bg-white p-2 shadow-sm dark:border-sky-900/40 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('feedback')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === 'feedback'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-gray-700 hover:bg-sky-50 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Góp ý
            </button>
            <button
              type="button"
              onClick={() => setMode('love')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === 'love'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-gray-700 hover:bg-sky-50 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Thu tình
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm dark:border-sky-900/40 dark:bg-gray-900 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{currentModeMeta.title}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{currentModeMeta.subtitle}</p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="letters-title"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Tiêu d?
                </label>
                <input
                  id="letters-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder={
                    mode === 'feedback'
                      ? 'Ví d?: C?n thêm b? l?c theo ngày'
                      : 'Ví d?: G?i em m?t ngày d?u dàng'
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="letters-message"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  N?i dung
                </label>
                <textarea
                  id="letters-message"
                  rows={6}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder={
                    mode === 'feedback'
                      ? 'Mô t? góp ý c? th? c?a b?n...'
                      : 'Vi?t vài dòng cho ngu?i b?n thuong...'
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="letters-mood"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Tâm tr?ng (tu? ch?n)
                  </label>
                  <select
                    id="letters-mood"
                    value={mood}
                    onChange={(event) => setMood(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
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
                      className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    G?i ?n danh
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
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Ðang g?i...' : currentModeMeta.button}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Làm m?i
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm dark:border-sky-900/40 dark:bg-gray-900">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-300">
                Ghi chú LoveHub
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>- Góp ý giúp app thân thi?n hon.</li>
                <li>- Thu tình gi? l?i c?m xúc m?i ngày.</li>
                <li>- Ðang nh?p + có couple: luu vào b?ng `letters` trên Supabase.</li>
                <li>- Chua dang nh?p/chua có couple: g?i qua webhook d? phòng.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm dark:border-sky-900/40 dark:bg-gray-900">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-300">
                H?p thu couple
              </h3>
              {inboxCoupleCode && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Mã couple #{inboxCoupleCode}</p>
              )}

              {inboxLoading && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Ðang t?i inbox...</p>
              )}

              {!inboxLoading && inboxState === 'logged_out' && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Ðang nh?p d? xem inbox couple.
                </p>
              )}

              {!inboxLoading && inboxState === 'no_couple' && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  B?n c?n t?o/join couple ? /setup d? luu và xem inbox Supabase.
                </p>
              )}

              {!inboxLoading && inboxState === 'error' && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-300">Không th? t?i inbox lúc này.</p>
              )}

              {!inboxLoading && inboxState === 'ready' && inbox.length < 1 && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Inbox dang tr?ng.</p>
              )}

              {!inboxLoading && inboxState === 'ready' && inbox.length > 0 && (
                <div className="mt-3 space-y-2">
                  {inbox.slice(0, 50).map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-700 dark:text-gray-200">
                          {item.kind === 'feedback' ? 'Góp ý' : 'Thu tình'}: {item.title}
                        </p>
                        <span className="text-gray-500 dark:text-gray-400">
                          {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '--'}
                        </span>
                      </div>
                      <p className="mt-1 text-gray-600 dark:text-gray-300">{item.message}</p>
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        Tâm tr?ng: {item.mood || '-'} | {item.anonymous ? '?n danh' : 'Có tên'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {confirmation && (
              <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-5 shadow-sm dark:border-sky-900/40 dark:from-sky-900/20 dark:to-indigo-900/10">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-300">
                  Ðã g?i thành công
                </p>
                <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                  {confirmation.mode === 'feedback' ? 'C?m on góp ý c?a b?n' : 'Lá thu dã bay d?n noi'}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">"{confirmation.title}"</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Ngu?n g?i: {confirmation.source}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(confirmation.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
