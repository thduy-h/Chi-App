'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setAlert } from '@/lib/features/alert/alertSlice'

type EntryType = 'income' | 'expense'

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

const INCOME_CATEGORIES = ['Luong', 'Thuong', 'Qua tang', 'Khac']
const EXPENSE_CATEGORIES = ['An uong', 'Di chuyen', 'Mua sam', 'Hen ho', 'Du lich', 'Hoa don', 'Khac']

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

const sanitizeType = (value: unknown): EntryType | null => {
  if (value === 'income' || value === 'expense') return value
  return null
}

const normalizeEntry = (value: unknown): FinanceEntry | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<FinanceEntry>
  const type = sanitizeType(raw.type)
  const amount = Number(raw.amount)
  const category = String(raw.category || '').trim()
  const date = String(raw.date || '').trim()

  if (!type || !Number.isFinite(amount) || amount <= 0 || !category || !date) return null

  return {
    id: String(raw.id || `${Date.now()}-${Math.random()}`),
    type,
    amount,
    category,
    date,
    note: raw.note ? String(raw.note) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString()
  }
}

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

export const FinanceDashboard = () => {
  const dispatch = useDispatch()
  const importRef = useRef<HTMLInputElement>(null)

  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [hydrated, setHydrated] = useState(false)

  const [type, setType] = useState<EntryType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [date, setDate] = useState(getToday())
  const [note, setNote] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [formError, setFormError] = useState('')

  const categoryOptions = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setEntries([])
      setHydrated(true)
      return
    }

    try {
      const parsed = JSON.parse(raw) as unknown
      const sourceArray = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { entries?: unknown[] }).entries)
          ? (parsed as { entries: unknown[] }).entries
          : []

      const normalized = sourceArray
        .map((entry) => normalizeEntry(entry))
        .filter((entry): entry is FinanceEntry => Boolean(entry))

      setEntries(normalized)
    } catch {
      setEntries([])
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries, hydrated])

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

  const handleAddEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    const amountValue = Number(amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFormError('So tien khong hop le.')
      return
    }

    if (!category.trim() || !date) {
      setFormError('Vui long dien day du danh muc va ngay.')
      return
    }

    const nextEntry: FinanceEntry = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      type,
      amount: amountValue,
      category: category.trim(),
      date,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString()
    }

    setEntries((prev) => [...prev, nextEntry])
    setAmount('')
    setNote('')

    dispatch(
      setAlert({
        title: 'Da them giao dich',
        message: 'Giao dich moi da duoc luu vao bang tai chinh.',
        type: 'success'
      })
    )
  }

  const handleDeleteEntry = (entryId: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
    dispatch(
      setAlert({
        title: 'Da xoa',
        message: 'Giao dich da duoc xoa.',
        type: 'info'
      })
    )
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
      const sourceArray = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === 'object' &&
            Array.isArray((parsed as { entries?: unknown[] }).entries)
          ? (parsed as { entries: unknown[] }).entries
          : []

      const normalized = sourceArray
        .map((entry) => normalizeEntry(entry))
        .filter((entry): entry is FinanceEntry => Boolean(entry))

      if (normalized.length < 1) {
        throw new Error('No valid entries found')
      }

      setEntries(normalized)

      dispatch(
        setAlert({
          title: 'Nhap du lieu thanh cong',
          message: 'Du lieu tai chinh da duoc cap nhat tu file backup.',
          type: 'success'
        })
      )
    } catch {
      dispatch(
        setAlert({
          title: 'Nhap du lieu that bai',
          message: 'File JSON khong hop le.',
          type: 'error'
        })
      )
    } finally {
      event.target.value = ''
    }
  }

  if (!hydrated) {
    return (
      <main className="container mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-300">Dang tai bang tai chinh...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-rose-100/80 via-white to-white dark:from-rose-950/20 dark:via-gray-900 dark:to-gray-900" />

      <section className="relative container mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-rose-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 shadow-sm dark:border-rose-900 dark:bg-gray-900 dark:text-rose-300">
              LoveHub Finance
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Finance tracker dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Dashboard inspired by `_refs/nextjs-dashboard` cards/layout, simplified for localStorage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Thang</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard title="Thu nhap" value={monthIncome} color="green" />
              <SummaryCard title="Chi tieu" value={monthExpense} color="rose" />
              <SummaryCard title="So du rong" value={monthNet} color={monthNet >= 0 ? 'blue' : 'red'} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                  Chi tieu theo danh muc
                </h2>
                {expenseByCategory.length < 1 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Chua co du lieu chi tieu trong thang nay.
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
                              className="h-2 rounded-full bg-rose-500"
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
                  Xu huong 6 thang
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
                  Xanh la so du duong, do la am.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                  Giao dich trong thang
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {monthEntries.length} giao dich
                </span>
              </div>

              {monthEntries.length < 1 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chua co giao dich cho thang da chon.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <th className="py-2 pr-3">Ngay</th>
                        <th className="py-2 pr-3">Loai</th>
                        <th className="py-2 pr-3">Danh muc</th>
                        <th className="py-2 pr-3">So tien</th>
                        <th className="py-2 pr-3">Ghi chu</th>
                        <th className="py-2 text-right">Tac vu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthEntries.map((entry) => (
                        <tr key={entry.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="py-2 pr-3 text-gray-700 dark:text-gray-200">{formatDate(entry.date)}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${entry.type === 'income'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                }`}
                            >
                              {entry.type === 'income' ? 'Thu' : 'Chi'}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-gray-700 dark:text-gray-200">{entry.category}</td>
                          <td
                            className={`py-2 pr-3 font-semibold ${entry.type === 'income'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-rose-700 dark:text-rose-300'
                              }`}
                          >
                            {entry.type === 'income' ? '+' : '-'} {formatCurrency(entry.amount)}
                          </td>
                          <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{entry.note || '-'}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                            >
                              Xoa
                            </button>
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
                Them giao dich
              </h2>

              <form className="space-y-3" onSubmit={handleAddEntry}>
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
                    So tien
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
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Danh muc
                  </label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
                    Ngay
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Ghi chu
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    placeholder="Them ghi chu neu can..."
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
                  Them giao dich
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                Backup JSON
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Import
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
                Luu va khoi phuc du lieu tai chinh qua file JSON.
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
