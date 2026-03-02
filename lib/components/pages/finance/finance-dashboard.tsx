'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setAlert } from '@/lib/features/alert/alertSlice'
import type { HomeMode } from '@/lib/home-mode'
import { useResolvedHomeMode } from '@/lib/hooks/use-resolved-home-mode'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { logGetMyCoupleRawOnce, normalizeRpcRow } from '@/lib/supabase/couples'
import type { Database } from '@/lib/supabase/types'

type EntryType = 'income' | 'expense'
type SyncMode = 'local' | 'supabase'
type FinanceRow = Database['public']['Tables']['finance_entries']['Row']

interface FinanceEntry {
  id: string
  type: EntryType
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
}

const STORAGE_KEY = 'lovehub.finance.entries.v1'
const IMPORT_FLAG_PREFIX = 'lovehub_finance_imported_'

const INCOME_CATEGORIES = ['Lương', 'Thưởng', 'Quà tặng', 'Khác']
const EXPENSE_CATEGORIES = ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Hẹn hò', 'Du lịch', 'Hóa đơn', 'Khác']

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value)

const formatDate = (value: string) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}

const getCurrentMonth = () => new Date().toISOString().slice(0, 7)
const getToday = () => new Date().toISOString().slice(0, 10)
const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const rand = Math.floor(Math.random() * 16)
      const value = char === 'x' ? rand : (rand & 0x3) | 0x8
      return value.toString(16)
    })
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const toIsoDateString = (value: string) => {
  const trimmed = String(value || '').trim()
  if (ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return getToday()
}

const logFinanceQueryError = (context: string, error: unknown) => {
  const candidate = error as {
    message?: string | null
    details?: string | null
    code?: string | null
  }
  console.error(`[finance/${context}] ${candidate?.message ?? 'lỗi không xác định'}`, {
    details: candidate?.details ?? null,
    code: candidate?.code ?? null
  })
}

const sanitizeType = (value: unknown): EntryType | null => {
  if (value === 'income' || value === 'expense') return value
  return null
}

const normalizeEntry = (value: unknown): FinanceEntry | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<FinanceEntry> & { entry_date?: unknown }
  const type = sanitizeType(raw.type)
  const amount = Number(raw.amount)
  const category = String(raw.category || '').trim()
  const date = String(raw.date || raw.entry_date || '').trim()

  if (!type || !Number.isFinite(amount) || amount <= 0 || !category || !date) return null

  return {
    id: String(raw.id || createId()),
    type,
    amount,
    category,
    date,
    note: raw.note ? String(raw.note) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString()
  }
}

const mapRowToEntry = (row: FinanceRow): FinanceEntry => ({
  id: row.id,
  type: row.type,
  amount: Number(row.amount),
  category: row.category,
  date: row.entry_date,
  note: row.note ?? undefined,
  createdAt: row.created_at ?? new Date().toISOString()
})

const getRecentMonths = (baseMonth: string, count: number): string[] => {
  const [yearRaw, monthRaw] = baseMonth.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return []

  const results: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(year, month - 1 - offset, 1)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    results.push(`${y}-${m}`)
  }
  return results
}

const getMonthDateRange = (monthValue: string) => {
  const [yearRaw, monthRaw] = monthValue.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return {
      from: `${monthValue}-01`,
      to: `${monthValue}-31`
    }
  }

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)

  return {
    from: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`,
    to: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(
      end.getDate()
    ).padStart(2, '0')}`
  }
}

const parseImportEntries = (parsed: unknown): FinanceEntry[] => {
  const sourceArray = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { entries?: unknown[] }).entries)
      ? (parsed as { entries: unknown[] }).entries
      : []

  return sourceArray
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is FinanceEntry => Boolean(entry))
}

export const FinanceDashboard = ({ mode: initialMode = 'c' }: { mode?: HomeMode }) => {
  const dispatch = useDispatch()
  const importRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const mode = useResolvedHomeMode(initialMode)
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
            modePanel:
              'rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-rose-900/40 dark:bg-gray-900 dark:text-gray-200'
          }
        : {
            heroBackdrop:
              'pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-sky-100/80 via-white to-white dark:from-sky-950/20 dark:via-gray-900 dark:to-gray-900',
            badge:
              'inline-flex rounded-full border border-sky-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 shadow-sm dark:border-sky-900 dark:bg-gray-900 dark:text-sky-300',
            inputRing: 'ring-sky-300 focus:ring-sky-300',
            modePanel:
              'rounded-xl border border-sky-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-sky-900/40 dark:bg-gray-900 dark:text-gray-200'
          },
    [isPremiumMode]
  )
  const badgeLabel = `${mode === 'a' ? 'Nhà Cáo Thỏ' : 'LoveHub'} • Tài chính`

  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [syncMode, setSyncMode] = useState<SyncMode>('local')
  const [activeCoupleId, setActiveCoupleId] = useState<string | null>(null)
  const [activeCoupleCode, setActiveCoupleCode] = useState<string | null>(null)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [isLoadingRemote, setIsLoadingRemote] = useState(false)
  const [showImportBanner, setShowImportBanner] = useState(false)
  const [isImportingOffline, setIsImportingOffline] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)

  const [type, setType] = useState<EntryType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [date, setDate] = useState(getToday())
  const [note, setNote] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [formError, setFormError] = useState('')

  const categoryOptions = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const isSupabaseMode = syncMode === 'supabase' && Boolean(activeCoupleId)

  const fillForm = (entry: FinanceEntry | null) => {
    if (!entry) {
      setEditingEntryId(null)
      setType('expense')
      setAmount('')
      setCategory(EXPENSE_CATEGORIES[0])
      setDate(getToday())
      setNote('')
      return
    }

    setEditingEntryId(entry.id)
    setType(entry.type)
    setAmount(String(entry.amount))
    setCategory(entry.category)
    setDate(entry.date)
    setNote(entry.note || '')
  }

  const getLocalEntriesSnapshot = useCallback(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return [] as FinanceEntry[]
    }

    try {
      const parsed = JSON.parse(raw) as unknown
      return parseImportEntries(parsed)
    } catch {
      return [] as FinanceEntry[]
    }
  }, [])

  const loadLocalEntries = useCallback(() => {
    setEntries(getLocalEntriesSnapshot())
  }, [getLocalEntriesSnapshot])

  const hasLocalEntries = useCallback(() => getLocalEntriesSnapshot().length > 0, [getLocalEntriesSnapshot])

  const loadSupabaseEntries = useCallback(async () => {
    if (!supabase || !activeCoupleId) {
      return
    }

    const range = getMonthDateRange(selectedMonth)
    setIsLoadingRemote(true)
    try {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('id, couple_id, type, amount, category, entry_date, note, created_at')
        .eq('couple_id', activeCoupleId)
        .gte('entry_date', range.from)
        .lte('entry_date', range.to)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setEntries((data || []).map((row) => mapRowToEntry(row as FinanceRow)))
    } catch (error) {
      logFinanceQueryError('load_entries', error)
      dispatch(
        setAlert({
          title: 'Tải dữ liệu thất bại',
          message: 'Không thể tải dữ liệu tài chính từ Supabase.',
          type: 'warning'
        })
      )
    } finally {
      setIsLoadingRemote(false)
    }
  }, [activeCoupleId, dispatch, selectedMonth, supabase])

  const loadCoupleContext = useCallback(async () => {
    if (!supabase) {
      setCurrentEmail(null)
      setSyncMode('local')
      setActiveCoupleId(null)
      setActiveCoupleCode(null)
      setShowImportBanner(false)
      loadLocalEntries()
      return
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[finance/loadCoupleContext] auth.getUser failed', userError)
    }

    if (!user) {
      setCurrentEmail(null)
      setSyncMode('local')
      setActiveCoupleId(null)
      setActiveCoupleCode(null)
      setShowImportBanner(false)
      loadLocalEntries()
      return
    }

    setCurrentEmail(user.email ?? null)

    const { data: coupleData, error: coupleError } = await supabase.rpc('get_my_couple')
    logGetMyCoupleRawOnce('finance/loadCoupleContext', coupleData)
    if (coupleError) {
      console.error('[finance/loadCoupleContext] rpc.get_my_couple failed', {
        code: coupleError.code,
        message: coupleError.message,
        details: coupleError.details,
        hint: coupleError.hint
      })
      dispatch(
        setAlert({
          title: 'Cảnh báo',
          message: `Không thể tải dữ liệu couple (${coupleError.code ?? 'unknown'})`,
          type: 'warning'
        })
      )
      setSyncMode('local')
      setActiveCoupleId(null)
      setActiveCoupleCode(null)
      setShowImportBanner(false)
      loadLocalEntries()
      return
    }

    const couple = normalizeRpcRow(coupleData)
    if (!couple?.id) {
      setSyncMode('local')
      setActiveCoupleId(null)
      setActiveCoupleCode(null)
      setShowImportBanner(false)
      loadLocalEntries()
      return
    }

    setSyncMode('supabase')
    setActiveCoupleId(couple.id)
    setActiveCoupleCode(couple.code ?? null)
    const importedKey = `${IMPORT_FLAG_PREFIX}${couple.id}`
    const imported = localStorage.getItem(importedKey) === 'true'
    setShowImportBanner(!imported && hasLocalEntries())
  }, [dispatch, hasLocalEntries, loadLocalEntries, supabase])

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        await loadCoupleContext()
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
  }, [loadCoupleContext])

  useEffect(() => {
    if (!hydrated) return
    if (isSupabaseMode) {
      void loadSupabaseEntries()
      return
    }
    loadLocalEntries()
  }, [hydrated, isSupabaseMode, loadSupabaseEntries, loadLocalEntries, selectedMonth])

  useEffect(() => {
    if (!hydrated || isSupabaseMode) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries, hydrated, isSupabaseMode])

  useEffect(() => {
    if (!categoryOptions.includes(category)) {
      setCategory(categoryOptions[0])
    }
  }, [type, category, categoryOptions])

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const dateDiff = b.date.localeCompare(a.date)
        if (dateDiff !== 0) return dateDiff
        return b.createdAt.localeCompare(a.createdAt)
      }),
    [entries]
  )

  const monthEntries = useMemo(
    () => sortedEntries.filter((entry) => entry.date.startsWith(selectedMonth)),
    [sortedEntries, selectedMonth]
  )

  const monthIncome = useMemo(
    () => monthEntries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0),
    [monthEntries]
  )

  const monthExpense = useMemo(
    () => monthEntries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0),
    [monthEntries]
  )

  const monthNet = monthIncome - monthExpense

  const expenseByCategory = useMemo(() => {
    const bucket = new Map<string, number>()
    monthEntries
      .filter((entry) => entry.type === 'expense')
      .forEach((entry) => {
        bucket.set(entry.category, (bucket.get(entry.category) || 0) + entry.amount)
      })

    return Array.from(bucket.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
  }, [monthEntries])

  const recentSeries = useMemo(() => {
    const months = getRecentMonths(selectedMonth, 6)
    return months.map((month) => {
      const monthData = entries.filter((entry) => entry.date.startsWith(month))
      const income = monthData
        .filter((entry) => entry.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0)
      const expense = monthData
        .filter((entry) => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0)

      return {
        month,
        label: new Date(`${month}-01`).toLocaleDateString('vi-VN', { month: 'short' }),
        net: income - expense
      }
    })
  }, [entries, selectedMonth])

  const maxAbsNet = useMemo(() => {
    const values = recentSeries.map((item) => Math.abs(item.net))
    return Math.max(1, ...values)
  }, [recentSeries])

  const upsertSupabaseEntry = async (entry: FinanceEntry) => {
    if (!supabase || !activeCoupleId) return
    const { error } = await supabase.from('finance_entries').upsert(
      {
        id: entry.id,
        couple_id: activeCoupleId,
        type: entry.type,
        amount: entry.amount,
        category: entry.category,
        entry_date: toIsoDateString(entry.date),
        note: entry.note ?? null
      },
      { onConflict: 'id' }
    )
    if (error) {
      throw error
    }
  }

  const deleteSupabaseEntry = async (entryId: string) => {
    if (!supabase || !activeCoupleId) return
    const { error } = await supabase
      .from('finance_entries')
      .delete()
      .eq('id', entryId)
      .eq('couple_id', activeCoupleId)
    if (error) {
      throw error
    }
  }

  const upsertEntriesBatch = useCallback(
    async (rawEntries: FinanceEntry[], coupleId: string) => {
      if (!supabase) {
        throw new Error('Supabase client unavailable')
      }

      const payload = rawEntries.map((entry) => ({
        id: UUID_PATTERN.test(entry.id) ? entry.id : createId(),
        couple_id: coupleId,
        type: entry.type,
        amount: entry.amount,
        category: entry.category,
        entry_date: toIsoDateString(entry.date),
        note: entry.note ?? null
      }))

      for (let index = 0; index < payload.length; index += 50) {
        const batch = payload.slice(index, index + 50)
        const { error } = await supabase.from('finance_entries').upsert(batch, { onConflict: 'id' })
        if (error) {
          throw error
        }
      }
    },
    [supabase]
  )

  const handleImportOfflineToCloud = useCallback(async () => {
    if (!supabase || !activeCoupleId || !isSupabaseMode) {
      return
    }

    setIsImportingOffline(true)
    try {
      const localEntries = getLocalEntriesSnapshot()
      if (localEntries.length < 1) {
        localStorage.setItem(`${IMPORT_FLAG_PREFIX}${activeCoupleId}`, 'true')
        setShowImportBanner(false)
        dispatch(
          setAlert({
            title: 'Không có dữ liệu',
            message: 'Không tìm thấy dữ liệu offline để import.',
            type: 'info'
          })
        )
        return
      }

      await upsertEntriesBatch(localEntries, activeCoupleId)
      localStorage.setItem(`${IMPORT_FLAG_PREFIX}${activeCoupleId}`, 'true')
      setShowImportBanner(false)
      await loadSupabaseEntries()

      dispatch(
        setAlert({
          title: 'Import thành công',
          message: `Đã import ${localEntries.length} giao dịch lên cloud.`,
          type: 'success'
        })
      )
    } catch (error) {
      logFinanceQueryError('import_offline', error)
      dispatch(
        setAlert({
          title: 'Import thất bại',
          message: 'Không thể import dữ liệu offline lên Supabase.',
          type: 'error'
        })
      )
    } finally {
      setIsImportingOffline(false)
    }
  }, [activeCoupleId, dispatch, getLocalEntriesSnapshot, isSupabaseMode, loadSupabaseEntries, supabase, upsertEntriesBatch])

  const handleAddOrUpdateEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    const amountValue = Number(amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFormError('Số tiền không hợp lệ.')
      return
    }

    if (!category.trim() || !date) {
      setFormError('Vui lòng điền đầy đủ danh mục và ngày.')
      return
    }

    const existing = editingEntryId ? entries.find((entry) => entry.id === editingEntryId) : null
    const nextEntry: FinanceEntry = {
      id: existing?.id || createId(),
      type,
      amount: amountValue,
      category: category.trim(),
      date: toIsoDateString(date),
      note: note.trim() || undefined,
      createdAt: existing?.createdAt || new Date().toISOString()
    }

    const previousEntries = entries
    const nextEntries = existing
      ? entries.map((entry) => (entry.id === existing.id ? nextEntry : entry))
      : [...entries, nextEntry]
    setEntries(nextEntries)
    fillForm(null)

    try {
      if (isSupabaseMode) {
        await upsertSupabaseEntry(nextEntry)
      }
      dispatch(
        setAlert({
          title: existing ? 'Đã cập nhật giao dịch' : 'Đã thêm giao dịch',
          message: existing
            ? 'Giao dịch đã được cập nhật.'
            : 'Giao dịch mới đã được lưu vào bảng tài chính.',
          type: 'success'
        })
      )
    } catch (error) {
      logFinanceQueryError('upsert_entry', error)
      setEntries(previousEntries)
      dispatch(
        setAlert({
          title: 'Đồng bộ thất bại',
          message: 'Không thể lưu giao dịch lên Supabase.',
          type: 'error'
        })
      )
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    const previousEntries = entries
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
    if (editingEntryId === entryId) {
      fillForm(null)
    }

    try {
      if (isSupabaseMode) {
        await deleteSupabaseEntry(entryId)
      }
      dispatch(
        setAlert({
          title: 'Đã xóa',
          message: 'Giao dịch đã được xóa.',
          type: 'info'
        })
      )
    } catch (error) {
      logFinanceQueryError('delete_entry', error)
      setEntries(previousEntries)
      dispatch(
        setAlert({
          title: 'Đồng bộ thất bại',
          message: 'Không thể xóa giao dịch trên Supabase.',
          type: 'error'
        })
      )
    }
  }

  const handleEditEntry = (entry: FinanceEntry) => {
    fillForm(entry)
    setFormError('')
  }

  const handleExport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lovehub-finance-backup.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const normalized = parseImportEntries(parsed)

      if (normalized.length < 1) {
        throw new Error('Không tìm thấy bản ghi hợp lệ')
      }

      if (isSupabaseMode) {
        const previousEntries = entries
        setEntries(normalized)
        try {
          if (!activeCoupleId) {
            throw new Error('Thiếu couple id')
          }
          await upsertEntriesBatch(normalized, activeCoupleId)
        } catch {
          setEntries(previousEntries)
          throw new Error('Không thể đồng bộ dữ liệu import lên Supabase')
        }
      } else {
        setEntries(normalized)
      }

      dispatch(
        setAlert({
          title: 'Nhập dữ liệu thành công',
          message: 'Dữ liệu tài chính đã được cập nhật từ file backup.',
          type: 'success'
        })
      )
    } catch (error) {
      logFinanceQueryError('import_json', error)
      dispatch(
        setAlert({
          title: 'Nhập dữ liệu thất bại',
          message: 'File JSON không hợp lệ.',
          type: 'error'
        })
      )
    } finally {
      event.target.value = ''
    }
  }

  if (!hydrated || isLoadingRemote) {
    return (
      <main className="container mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-300">Đang tải bảng tài chính...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative overflow-hidden">
      <div className={palette.heroBackdrop} />

      <section className="relative container mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className={palette.badge}>
              {badgeLabel}
            </span>
            {isPremiumMode ? (
              <span className="ml-2 inline-flex rounded-full border border-amber-300 bg-amber-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900 shadow-sm">
                Premium
              </span>
            ) : null}
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Bảng theo dõi tài chính
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Giao diện dashboard gọn nhẹ, tối ưu cho theo dõi thu chi hằng ngày.
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
              {currentEmail && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email: {currentEmail}</p>}
              {activeCoupleCode && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Couple: #{activeCoupleCode}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Tháng</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${palette.inputRing}`}
            />
          </div>
        </div>

        {isSupabaseMode && showImportBanner && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
            <p className="font-semibold">Bạn có dữ liệu tài chính offline. Import lên cloud?</p>
            <p className="mt-1 text-xs opacity-80">
              Sau khi import, dữ liệu tài chính sẽ ưu tiên đọc từ Supabase cho couple hiện tại.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleImportOfflineToCloud()}
                disabled={isImportingOffline}
                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isImportingOffline ? 'Đang import...' : 'Nhập lên cloud'}
              </button>
              <button
                type="button"
                onClick={() => setShowImportBanner(false)}
                disabled={isImportingOffline}
                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
              >
                Để sau
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard title="Thu nhập" value={monthIncome} color="green" />
              <SummaryCard title="Chi tiêu" value={monthExpense} color="rose" />
              <SummaryCard title="Số dư ròng" value={monthNet} color={monthNet > 0 ? 'blue' : 'rose'} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                  Chi tiêu theo danh mục
                </h2>
                {expenseByCategory.length < 1 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Chưa có dữ liệu chi tiêu trong tháng này.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {expenseByCategory.map((item) => {
                      const max = expenseByCategory[0]?.total || 1
                      const width = Math.max(8, (item.total / max) * 100)
                      return (
                        <div key={item.name}>
                          <div className="mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                            <span>{item.name}</span>
                            <span>{formatCurrency(item.total)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className="h-2 rounded-full bg-rose-500 dark:bg-rose-400"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                  Xu hướng 6 tháng
                </h2>
                <div className="grid grid-cols-6 items-end gap-2">
                  {recentSeries.map((item) => {
                    const height = Math.max(8, (Math.abs(item.net) / maxAbsNet) * 120)
                    const positive = item.net >= 0
                    return (
                      <div key={item.month} className="flex flex-col items-center gap-2">
                        <div
                          className={`w-full rounded-t-md ${positive ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ height: `${height}px` }}
                          title={`${item.label}: ${formatCurrency(item.net)}`}
                        />
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.label}</p>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Xanh là số dư dương, đỏ là âm.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                  Giao dịch trong tháng
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {monthEntries.length} giao dịch
                </span>
              </div>

              {monthEntries.length < 1 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chưa có giao dịch cho tháng đã chọn.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        <th className="py-2 pr-3">Ngày</th>
                        <th className="py-2 pr-3">Loại</th>
                        <th className="py-2 pr-3">Danh mục</th>
                        <th className="py-2 pr-3">Số tiền</th>
                        <th className="py-2 pr-3">Ghi chú</th>
                        <th className="py-2 text-right">Tác vụ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthEntries.map((entry, index) => (
                        <tr
                          key={entry.id}
                          className={`border-t border-gray-200 dark:border-gray-700 ${
                            index % 2 === 0 ? 'bg-white/80 dark:bg-gray-800/20' : 'bg-gray-50/70 dark:bg-gray-900/20'
                          }`}
                        >
                          <td className="py-2 pr-3 text-gray-700 dark:text-gray-200">{formatDate(entry.date)}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${entry.type === 'income'
                                ? 'border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100'
                                : 'border border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-100'
                                }`}
                            >
                              {entry.type === 'income' ? 'Thu' : 'Chi'}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-gray-700 dark:text-gray-200">{entry.category}</td>
                          <td
                            className={`py-2 pr-3 font-semibold ${entry.type === 'income'
                              ? 'text-emerald-800 dark:text-emerald-200'
                              : 'text-rose-700 dark:text-rose-300'
                              }`}
                          >
                            {entry.type === 'income' ? '+' : '-'} {formatCurrency(entry.amount)}
                          </td>
                          <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{entry.note || '-'}</td>
                          <td className="py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditEntry(entry)}
                                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteEntry(entry.id)}
                                className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                              >
                                Xoá
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                {editingEntryId ? 'Cập nhật giao dịch' : 'Thêm giao dịch'}
              </h2>

              <form className="space-y-3" onSubmit={(event) => void handleAddOrUpdateEntry(event)}>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${type === 'income'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                  >
                    Thu
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${type === 'expense'
                      ? 'bg-rose-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                  >
                    Chi
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Số tiền
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value)
                      if (formError) setFormError('')
                    }}
                    placeholder="500000"
                    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${palette.inputRing}`}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Danh mục
                  </label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${palette.inputRing}`}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Ngày
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${palette.inputRing}`}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Ghi chú
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${palette.inputRing}`}
                    placeholder="Thêm ghi chú nếu cần..."
                  />
                </div>

                {formError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                >
                  {editingEntryId ? 'Cập nhật giao dịch' : 'Thêm giao dịch'}
                </button>
                {editingEntryId && (
                  <button
                    type="button"
                    onClick={() => fillForm(null)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Huỷ sửa
                  </button>
                )}
              </form>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                Sao lưu JSON
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Xuất
                </button>
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Nhập
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImport}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Lưu và khôi phục dữ liệu tài chính qua file JSON.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

const SummaryCard = ({
  title,
  value,
  color
}: {
  title: string
  value: number
  color: 'green' | 'rose' | 'blue' | 'red'
}) => {
  const colorMap: Record<
    typeof color,
    {
      iconBg: string
      iconText: string
      valueText: string
    }
  > = {
    green: {
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconText: 'text-emerald-700 dark:text-emerald-300',
      valueText: 'text-emerald-700 dark:text-emerald-300'
    },
    rose: {
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconText: 'text-rose-700 dark:text-rose-300',
      valueText: 'text-rose-700 dark:text-rose-300'
    },
    blue: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconText: 'text-blue-700 dark:text-blue-300',
      valueText: 'text-blue-700 dark:text-blue-300'
    },
    red: {
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconText: 'text-red-700 dark:text-red-300',
      valueText: 'text-red-700 dark:text-red-300'
    }
  }

  return (
    <div className="rounded-xl bg-gray-50 p-2 shadow-sm dark:bg-gray-900/70">
      <div className="flex items-center p-4">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${colorMap[color].iconBg} ${colorMap[color].iconText}`}
        >
          ₫
        </span>
        <h3 className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">{title}</h3>
      </div>
      <p className={`truncate rounded-xl bg-white px-4 py-7 text-center text-2xl font-semibold dark:bg-gray-800 ${colorMap[color].valueText}`}>
        {formatCurrency(value)}
      </p>
    </div>
  )
}

