'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setAlert } from '@/lib/features/alert/alertSlice'
import type { HomeMode } from '@/lib/home-mode'
import { useResolvedHomeMode } from '@/lib/hooks/use-resolved-home-mode'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths
} from 'date-fns'

interface CycleSettings {
  lastPeriodStart: string
  cycleLength: number
  periodLength: number
}

interface CycleHistoryItem extends CycleSettings {
  savedAt: string
  predictedNextStart: string
}

interface CoupleResponse {
  user: { id: string; email: string } | null
  couple: { id: string; code: string } | null
}

type CycleSettingsRow = Database['public']['Tables']['cycle_settings']['Row']

const SETTINGS_KEY = 'lovehub.cycle.settings.v1'
const HISTORY_KEY = 'lovehub.cycle.history.v1'

const DEFAULT_SETTINGS: CycleSettings = {
  lastPeriodStart: format(new Date(), 'yyyy-MM-dd'),
  cycleLength: 28,
  periodLength: 5
}

const clampInteger = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

const normalizeSettings = (raw: unknown): CycleSettings => {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS
  const item = raw as Partial<CycleSettings>
  const parsedDate = item.lastPeriodStart ? parseISO(item.lastPeriodStart) : null
  const hasDate = parsedDate && !Number.isNaN(parsedDate.getTime())

  return {
    lastPeriodStart: hasDate ? format(parsedDate, 'yyyy-MM-dd') : DEFAULT_SETTINGS.lastPeriodStart,
    cycleLength: clampInteger(Number(item.cycleLength), 20, 40),
    periodLength: clampInteger(Number(item.periodLength), 2, 10)
  }
}

const normalizeHistory = (raw: unknown): CycleHistoryItem[] => {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const candidate = item as Partial<CycleHistoryItem>
      const settings = normalizeSettings(candidate)
      if (!candidate.savedAt || !candidate.predictedNextStart) return null
      return {
        ...settings,
        savedAt: String(candidate.savedAt),
        predictedNextStart: String(candidate.predictedNextStart)
      }
    })
    .filter((item): item is CycleHistoryItem => Boolean(item))
}

const toCycleSettingsFromRow = (row: CycleSettingsRow): CycleSettings =>
  normalizeSettings({
    lastPeriodStart: row.last_period_start,
    cycleLength: row.cycle_length,
    periodLength: row.period_length
  })

export const CycleTracker = ({ mode: initialMode = 'c' }: { mode?: HomeMode }) => {
  const dispatch = useDispatch()
  const mode = useResolvedHomeMode(initialMode)
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const isPremiumMode = mode === 'a' || mode === 'b'
  const palette = useMemo(
    () =>
      isPremiumMode
        ? {
            heroBackdrop:
              'pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-rose-100/80 via-white to-white dark:from-rose-950/20 dark:via-gray-900 dark:to-gray-900',
            badge:
              'inline-flex rounded-full border border-rose-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 shadow-sm dark:border-rose-900 dark:bg-gray-900 dark:text-rose-300',
            inputRing: 'ring-rose-300 focus:ring-rose-300',
            primaryButton: 'bg-rose-600 hover:bg-rose-700',
            periodDay: 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20',
            nextStartChip: 'bg-rose-600 text-white',
            periodChip: 'bg-rose-200 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
            disclaimer: 'border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-900/20',
            modePanel:
              'rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-rose-900/40 dark:bg-gray-900 dark:text-gray-200'
          }
        : {
            heroBackdrop:
              'pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-sky-100/80 via-white to-white dark:from-sky-950/20 dark:via-gray-900 dark:to-gray-900',
            badge:
              'inline-flex rounded-full border border-sky-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 shadow-sm dark:border-sky-900 dark:bg-gray-900 dark:text-sky-300',
            inputRing: 'ring-sky-300 focus:ring-sky-300',
            primaryButton: 'bg-sky-600 hover:bg-sky-700',
            periodDay: 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-900/20',
            nextStartChip: 'bg-sky-600 text-white',
            periodChip: 'bg-sky-200 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
            disclaimer: 'border-sky-200 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-900/20',
            modePanel:
              'rounded-xl border border-sky-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-sky-900/40 dark:bg-gray-900 dark:text-gray-200'
          },
    [isPremiumMode]
  )
  const badgeLabel = `${mode === 'a' ? 'Nhà Cáo Thỏ' : 'LoveHub'} • Chu kỳ`
  const [settings, setSettings] = useState<CycleSettings>(DEFAULT_SETTINGS)
  const [history, setHistory] = useState<CycleHistoryItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()))
  const [syncMode, setSyncMode] = useState<'local' | 'supabase'>('local')
  const [activeCoupleId, setActiveCoupleId] = useState<string | null>(null)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [isLoadingRemote, setIsLoadingRemote] = useState(false)
  const lastSyncedSettingsKeyRef = useRef('')

  const isSupabaseMode = syncMode === 'supabase' && Boolean(activeCoupleId && activeUserId)

  const loadLocalData = useCallback(() => {
    const storedSettings = localStorage.getItem(SETTINGS_KEY)
    const storedHistory = localStorage.getItem(HISTORY_KEY)

    if (storedSettings) {
      try {
        setSettings(normalizeSettings(JSON.parse(storedSettings)))
      } catch {
        setSettings(DEFAULT_SETTINGS)
      }
    } else {
      setSettings(DEFAULT_SETTINGS)
    }

    if (storedHistory) {
      try {
        setHistory(normalizeHistory(JSON.parse(storedHistory)))
      } catch {
        setHistory([])
      }
    } else {
      setHistory([])
    }
  }, [])

  const loadSupabaseSettings = useCallback(
    async (coupleId: string, userId: string) => {
      if (!supabase) {
        loadLocalData()
        return
      }

      setIsLoadingRemote(true)
      try {
        const { data, error } = await supabase
          .from('cycle_settings')
          .select(
            'id, couple_id, user_id, last_period_start, cycle_length, period_length, created_at, updated_at'
          )
          .eq('couple_id', coupleId)
          .eq('user_id', userId)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!data) {
          const { data: inserted, error: insertError } = await supabase
            .from('cycle_settings')
            .insert({
              couple_id: coupleId,
              user_id: userId,
              last_period_start: DEFAULT_SETTINGS.lastPeriodStart,
              cycle_length: DEFAULT_SETTINGS.cycleLength,
              period_length: DEFAULT_SETTINGS.periodLength
            })
            .select(
              'id, couple_id, user_id, last_period_start, cycle_length, period_length, created_at, updated_at'
            )
            .single()

          if (insertError) {
            throw insertError
          }

          const normalized = toCycleSettingsFromRow(inserted as CycleSettingsRow)
          setSettings(normalized)
          lastSyncedSettingsKeyRef.current = JSON.stringify(normalized)
          return
        }

        const normalized = toCycleSettingsFromRow(data as CycleSettingsRow)
        setSettings(normalized)
        lastSyncedSettingsKeyRef.current = JSON.stringify(normalized)
      } catch {
        setSyncMode('local')
        setActiveCoupleId(null)
        setActiveUserId(null)
        loadLocalData()
        dispatch(
          setAlert({
            title: 'Tải dữ liệu thất bại',
            message: 'Không thể tải cài đặt chu kỳ từ Supabase. Đang dùng dữ liệu local.',
            type: 'warning'
          })
        )
      } finally {
        setIsLoadingRemote(false)
      }
    },
    [dispatch, loadLocalData, supabase]
  )

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      loadLocalData()

      if (!supabase) {
        if (!cancelled) {
          setHydrated(true)
        }
        return
      }

      try {
        const response = await fetch('/api/couple/current', {
          method: 'GET',
          cache: 'no-store'
        })
        const payload = (await response.json()) as CoupleResponse
        if (cancelled) return

        if (payload.user?.id && payload.couple?.id) {
          setSyncMode('supabase')
          setActiveCoupleId(payload.couple.id)
          setActiveUserId(payload.user.id)
          await loadSupabaseSettings(payload.couple.id, payload.user.id)
        } else {
          setSyncMode('local')
          setActiveCoupleId(null)
          setActiveUserId(null)
        }
      } catch {
        if (!cancelled) {
          setSyncMode('local')
          setActiveCoupleId(null)
          setActiveUserId(null)
        }
      } finally {
        if (!cancelled) {
          setHydrated(true)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [loadLocalData, loadSupabaseSettings, supabase])

  useEffect(() => {
    if (!hydrated || isSupabaseMode) return
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings, hydrated, isSupabaseMode])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }, [history, hydrated])

  useEffect(() => {
    if (!hydrated || !isSupabaseMode || !supabase || !activeCoupleId || !activeUserId) {
      return
    }

    const settingsKey = JSON.stringify(settings)
    if (settingsKey === lastSyncedSettingsKeyRef.current) {
      return
    }

    let cancelled = false

    const upsertSettings = async () => {
      try {
        const { error } = await supabase.from('cycle_settings').upsert(
          {
            couple_id: activeCoupleId,
            user_id: activeUserId,
            last_period_start: settings.lastPeriodStart,
            cycle_length: settings.cycleLength,
            period_length: settings.periodLength
          },
          { onConflict: 'couple_id,user_id' }
        )

        if (error) {
          throw error
        }

        if (!cancelled) {
          lastSyncedSettingsKeyRef.current = settingsKey
        }
      } catch {
        if (!cancelled) {
          dispatch(
            setAlert({
              title: 'Đồng bộ thất bại',
              message: 'Không thể lưu cài đặt chu kỳ lên Supabase.',
              type: 'error'
            })
          )
        }
      }
    }

    void upsertSettings()

    return () => {
      cancelled = true
    }
  }, [
    activeCoupleId,
    activeUserId,
    dispatch,
    hydrated,
    isSupabaseMode,
    settings,
    supabase
  ])

  const parsedLastStart = useMemo(() => parseISO(settings.lastPeriodStart), [settings.lastPeriodStart])

  const hasValidDate = useMemo(
    () => !Number.isNaN(parsedLastStart.getTime()),
    [parsedLastStart]
  )

  const predictedNextStart = useMemo(() => {
    if (!hasValidDate) return null
    return addDays(parsedLastStart, settings.cycleLength)
  }, [parsedLastStart, settings.cycleLength, hasValidDate])

  const predictedPeriodDays = useMemo(() => {
    if (!predictedNextStart) return []
    return Array.from({ length: settings.periodLength }).map((_, index) =>
      addDays(predictedNextStart, index)
    )
  }, [predictedNextStart, settings.periodLength])

  const countdown = useMemo(() => {
    if (!predictedNextStart) return null
    return differenceInCalendarDays(startOfDay(predictedNextStart), startOfDay(new Date()))
  }, [predictedNextStart])

  useEffect(() => {
    if (predictedNextStart) {
      setVisibleMonth(startOfMonth(predictedNextStart))
    }
  }, [predictedNextStart])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth)
    const monthEnd = endOfMonth(visibleMonth)
    const start = startOfWeek(monthStart, { weekStartsOn: 1 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [visibleMonth])

  const submitSettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!hasValidDate) {
      dispatch(
        setAlert({
          title: 'Ngày không hợp lệ',
          message: 'Vui lòng chọn ngày bắt đầu kỳ kinh gần nhất.',
          type: 'error'
        })
      )
      return
    }

    const nextStart = addDays(parsedLastStart, settings.cycleLength)
    const historyItem: CycleHistoryItem = {
      ...settings,
      savedAt: new Date().toISOString(),
      predictedNextStart: format(nextStart, 'yyyy-MM-dd')
    }

    setHistory((prev) => [historyItem, ...prev].slice(0, 12))
    setVisibleMonth(startOfMonth(nextStart))

    dispatch(
      setAlert({
        title: 'Đã cập nhật',
        message: 'Thông tin chu kỳ đã được lưu.',
        type: 'success'
      })
    )
  }

  if (!hydrated || isLoadingRemote) {
    return (
      <main className="container mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-300">Đang tải trình theo dõi chu kỳ...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative overflow-hidden">
      <div className={palette.heroBackdrop} />

      <section className="relative container mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <span className={palette.badge}>
            {badgeLabel}
          </span>
          {isPremiumMode ? (
            <span className="ml-2 inline-flex rounded-full border border-amber-300 bg-amber-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900 shadow-sm">
              Premium
            </span>
          ) : null}
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Theo dõi chu kỳ
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Theo dõi chu kỳ cơ bản với dự đoán ngày bắt đầu kỳ tiếp theo và lịch tháng.
          </p>
          <div className={`mt-3 ${palette.modePanel}`}>
            <p>
              <span className="font-semibold">Chế độ dữ liệu:</span> {isSupabaseMode ? 'Đồng bộ' : 'Cục bộ'}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                isSupabaseMode
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              Trạng thái: {isSupabaseMode ? 'ĐÃ ĐỒNG BỘ' : 'CỤC BỘ'}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <form
              onSubmit={submitSettings}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70"
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                Cài đặt chu kỳ
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Ngày bắt đầu kỳ gần nhất
                  </label>
                  <input
                    type="date"
                    value={settings.lastPeriodStart}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, lastPeriodStart: event.target.value }))
                    }
                    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${palette.inputRing}`}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Độ dài chu kỳ (ngày)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={40}
                    value={settings.cycleLength}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        cycleLength: clampInteger(Number(event.target.value), 20, 40)
                      }))
                    }
                    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${palette.inputRing}`}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Độ dài kỳ kinh (ngày)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={settings.periodLength}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        periodLength: clampInteger(Number(event.target.value), 2, 10)
                      }))
                    }
                    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${palette.inputRing}`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${palette.primaryButton}`}
              >
                Lưu cài đặt
              </button>
            </form>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                Lịch sử cập nhật
              </h2>
              {history.length < 1 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có bản ghi lịch sử.</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 5).map((item) => (
                    <div
                      key={`${item.savedAt}-${item.lastPeriodStart}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <p className="font-semibold text-gray-700 dark:text-gray-200">
                        {formatDateSafe(item.savedAt)}
                      </p>
                      <p>Kỳ gần nhất: {formatDateSafe(item.lastPeriodStart)}</p>
                      <p>Dự đoán tiếp: {formatDateSafe(item.predictedNextStart)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                title="Kỳ tiếp theo"
                value={predictedNextStart ? format(predictedNextStart, 'dd/MM/yyyy') : '--'}
              />
              <SummaryCard
                title="Countdown"
                value={
                  countdown === null
                    ? '--'
                    : countdown >= 0
                      ? `${countdown} ngày`
                      : `Trễ ${Math.abs(countdown)} ngày`
                }
              />
              <SummaryCard title="Độ dài kỳ kinh" value={`${settings.periodLength} ngày`} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                  Lịch tháng
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((prev) => startOfMonth(subMonths(prev, 1)))}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Trước
                  </button>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {format(visibleMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((prev) => startOfMonth(addMonths(prev, 1)))}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Sau
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const inMonth = isSameMonth(day, visibleMonth)
                  const isPeriodDay = predictedPeriodDays.some((periodDay) => isSameDay(periodDay, day))
                  const isNextStart = predictedNextStart ? isSameDay(predictedNextStart, day) : false

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[4.2rem] rounded-lg border px-2 py-2 text-xs ${inMonth
                        ? 'border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
                        : 'border-transparent bg-gray-100/70 text-gray-400 dark:bg-gray-900/50 dark:text-gray-500'
                        } ${isPeriodDay ? palette.periodDay : ''}`}
                    >
                      <p className="font-semibold">{format(day, 'd')}</p>
                      {isNextStart && (
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${palette.nextStartChip}`}>
                          Bắt đầu
                        </span>
                      )}
                      {!isNextStart && isPeriodDay && (
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${palette.periodChip}`}>
                          Kỳ kinh
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`rounded-xl border p-4 text-sm font-medium text-gray-800 dark:text-gray-100 ${palette.disclaimer}`}>
              Chỉ mang tính tham khảo, không thay thế tư vấn y tế.
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

const SummaryCard = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-xl bg-gray-50 p-2 shadow-sm dark:bg-gray-900/70">
    <div className="px-4 pb-2 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h3>
    </div>
    <p className="truncate rounded-xl bg-white px-4 py-7 text-center text-xl font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
      {value}
    </p>
  </div>
)

const formatDateSafe = (value: string) => {
  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, 'dd/MM/yyyy')
}

