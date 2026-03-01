'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'

import type { HomeMode } from '@/lib/home-mode'
import { LetterEnvelopeCard } from '@/lib/components/letters/LetterEnvelopeCard'
import { setAlert } from '@/lib/features/alert/alertSlice'
import type { LetterKind, LetterRecord } from '@/lib/letters/types'

type InboxState = 'ready' | 'no_couple' | 'error'
type KindFilter = 'all' | LetterKind
type OpenedFilter = 'all' | 'unopened' | 'opened'

interface InboxPayload {
  letters?: LetterRecord[]
  reason?: string
  error?: string
  coupleCode?: string | null
}

export function LettersInboxPage({ mode = 'c' }: { mode?: HomeMode }) {
  const dispatch = useDispatch()
  const colorMode = mode === 'c' ? 'blue' : 'pink'

  const [letters, setLetters] = useState<LetterRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<InboxState>('ready')
  const [coupleCode, setCoupleCode] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [openedFilter, setOpenedFilter] = useState<OpenedFilter>('all')

  const theme = useMemo(
    () =>
      colorMode === 'pink'
        ? {
            glow: 'bg-rose-200/60 dark:bg-rose-900/20',
            badge: 'text-rose-600 dark:text-rose-300',
            primary: 'bg-rose-600 hover:bg-rose-700',
            panel: 'border-rose-100 dark:border-rose-900/40',
            activeChip: 'bg-rose-600 text-white',
            inactiveChip:
              'border border-gray-300 bg-white text-gray-600 hover:bg-rose-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
            empty: 'border-rose-200 dark:border-rose-900/40'
          }
        : {
            glow: 'bg-sky-200/60 dark:bg-sky-900/20',
            badge: 'text-sky-600 dark:text-sky-300',
            primary: 'bg-sky-600 hover:bg-sky-700',
            panel: 'border-sky-100 dark:border-sky-900/40',
            activeChip: 'bg-sky-600 text-white',
            inactiveChip:
              'border border-gray-300 bg-white text-gray-600 hover:bg-sky-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
            empty: 'border-sky-200 dark:border-sky-900/40'
          },
    [colorMode]
  )

  const badgeText = mode === 'a' ? 'Nhà Cáo Thỏ • Letters' : 'LoveHub • Letters'

  const getOpenedStatus = useCallback((letter: LetterRecord) => {
    const opened = letter.createdByMe ? Boolean(letter.openedByPartner) : Boolean(letter.openedByMe)
    const label = letter.createdByMe ? (opened ? 'Người ấy đã mở' : 'Người ấy chưa mở') : opened ? 'Đã mở' : 'Chưa mở'
    return { opened, label }
  }, [])

  const reloadInbox = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/letters', { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as InboxPayload

      if (!response.ok && response.status !== 200) {
        throw new Error(payload.error || 'Không thể tải hộp thư.')
      }

      if (payload.reason === 'no-couple') {
        setLetters([])
        setCoupleCode(null)
        setState('no_couple')
        return
      }

      const nextLetters = Array.isArray(payload.letters) ? payload.letters : []
      setLetters(nextLetters)
      setCoupleCode(payload.coupleCode || null)
      setState('ready')
    } catch (error) {
      setState('error')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Tải hộp thư thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải dữ liệu.'
        })
      )
    } finally {
      setLoading(false)
    }
  }, [dispatch])

  useEffect(() => {
    void reloadInbox()
  }, [reloadInbox])

  const filteredLetters = useMemo(() => {
    return letters.filter((letter) => {
      const opened = getOpenedStatus(letter).opened
      const passKind = kindFilter === 'all' ? true : letter.kind === kindFilter
      const passOpened =
        openedFilter === 'all' ? true : openedFilter === 'opened' ? opened : !opened
      return passKind && passOpened
    })
  }, [getOpenedStatus, kindFilter, letters, openedFilter])

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute left-1/2 top-[-8rem] h-[22rem] w-[22rem] -translate-x-1/2 rounded-full blur-3xl ${theme.glow}`} />
      </div>

      <section className="relative container mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex flex-wrap items-center gap-2">
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.badge}`}>{badgeText}</p>
              {mode !== 'c' ? (
                <span className="inline-flex rounded-full border border-amber-300 bg-amber-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-900 shadow-sm">
                  Premium
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Hộp thư của hai bạn
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {coupleCode ? `Couple #${coupleCode}` : 'Những lá thư và góp ý mới nhất'}
            </p>
          </div>

          <Link
            href="/letters/new"
            className={`inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white transition ${theme.primary}`}
          >
            Viết thư mới 💌
          </Link>
        </div>

        <div className={`mb-4 rounded-2xl border bg-white/90 p-4 shadow-sm dark:bg-gray-900/80 ${theme.panel}`}>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Loại</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'love', label: 'Thư tình' },
                { id: 'feedback', label: 'Góp ý' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKindFilter(item.id as KindFilter)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${kindFilter === item.id ? theme.activeChip : theme.inactiveChip}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Đã mở</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'unopened', label: 'Chưa mở' },
                { id: 'opened', label: 'Đã mở' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenedFilter(item.id as OpenedFilter)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${openedFilter === item.id ? theme.activeChip : theme.inactiveChip}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className={`rounded-2xl border bg-white p-6 text-sm text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-300 ${theme.panel}`}>
            Đang tải hộp thư...
          </div>
        ) : null}

        {!loading && state === 'no_couple' ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
            Bạn chưa có couple. Vào trang thiết lập để tạo hoặc tham gia couple trước nhé.
            <div className="mt-3">
              <Link href="/setup" className="font-semibold underline">
                Đi tới /setup
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && state === 'error' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200">
            Không thể tải hộp thư lúc này. Vui lòng thử lại sau.
          </div>
        ) : null}

        {!loading && state === 'ready' && filteredLetters.length < 1 ? (
          <div className={`rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-300 ${theme.empty}`}>
            Chưa có lá thư nào theo bộ lọc hiện tại.
          </div>
        ) : null}

        {!loading && state === 'ready' && filteredLetters.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredLetters.map((letter) => {
              const openedStatus = getOpenedStatus(letter)
              return (
                <LetterEnvelopeCard
                  key={letter.id}
                  letter={letter}
                  opened={openedStatus.opened}
                  openedLabel={openedStatus.label}
                  href={`/letters/${letter.id}`}
                  colorMode={colorMode}
                />
              )
            })}
          </div>
        ) : null}
      </section>
    </main>
  )
}
