'use client'

import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setAlert } from '@/lib/features/alert/alertSlice'
import { ItineraryDay } from '@/lib/components/pages/tasks/types'

const cloneDays = (days: ItineraryDay[]) => days.map((day) => ({ ...day }))

export const ItineraryPlanner = ({
  storageKey,
  defaultDays
}: {
  storageKey: string
  defaultDays: ItineraryDay[]
}) => {
  const dispatch = useDispatch()
  const [days, setDays] = useState<ItineraryDay[]>(cloneDays(defaultDays))
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      setDays(cloneDays(defaultDays))
      setHydrated(true)
      return
    }

    try {
      const parsed = JSON.parse(raw) as ItineraryDay[]
      if (Array.isArray(parsed)) {
        setDays(
          parsed
            .map((day, index) => ({
              id: String(day.id || `${Date.now()}-${index}`),
              title: String(day.title || `Ngày ${index + 1}`),
              date: String(day.date || ''),
              activities: String(day.activities || '')
            }))
            .filter((day) => day.title)
        )
      } else {
        setDays(cloneDays(defaultDays))
      }
    } catch {
      setDays(cloneDays(defaultDays))
    } finally {
      setHydrated(true)
    }
  }, [storageKey, defaultDays])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(storageKey, JSON.stringify(days))
  }, [days, hydrated, storageKey])

  const addDay = () => {
    const nextIndex = days.length + 1
    setDays((prev) => [
      ...prev,
      {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        title: `Ngày ${nextIndex}`,
        date: '',
        activities: ''
      }
    ])
  }

  const updateDay = (dayId: string, key: keyof ItineraryDay, value: string) => {
    setDays((prev) => prev.map((day) => (day.id === dayId ? { ...day, [key]: value } : day)))
  }

  const removeDay = (dayId: string) => {
    setDays((prev) => prev.filter((day) => day.id !== dayId))
  }

  const exportDays = () => {
    const blob = new Blob([JSON.stringify(days, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lovehub-travel-itinerary.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const importDays = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text) as ItineraryDay[]
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid itinerary format')
        }

        const imported = parsed
          .map((day, index) => ({
            id:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${index}`,
            title: String(day.title || `Ngày ${index + 1}`),
            date: String(day.date || ''),
            activities: String(day.activities || '')
          }))
          .filter((day) => day.title)

        if (imported.length < 1) {
          throw new Error('No valid itinerary day found')
        }

        setDays(imported)
        dispatch(
          setAlert({
            title: 'Nhập lịch trình thành công',
            message: 'Danh sách ngày du lịch đã được cập nhật.',
            type: 'success'
          })
        )
      })
      .catch(() => {
        dispatch(
          setAlert({
            title: 'Nhập lịch trình thất bại',
            message: 'File JSON không đúng định dạng.',
            type: 'error'
          })
        )
      })
      .finally(() => {
        event.target.value = ''
      })
  }

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-300">Đang tải lịch trình...</p>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-rose-100 bg-white shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Lịch trình theo ngày</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ghi nhanh hoạt động chính cho từng ngày của chuyến đi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addDay}
            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
          >
            + Thêm ngày
          </button>
          <button
            type="button"
            onClick={exportDays}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Xuất JSON
          </button>
          <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            Nhập JSON
            <input type="file" accept="application/json" className="hidden" onChange={importDays} />
          </label>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        {days.map((day) => (
          <article
            key={day.id}
            className="rounded-xl border border-gray-100 bg-rose-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/40"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <input
                value={day.title}
                onChange={(event) => updateDay(day.id, 'title', event.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeDay(day.id)}
                className="rounded-md p-1 text-red-600 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <span className="sr-only">Xóa ngày</span>
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h.293l.853 10.243A2 2 0 007.14 18h5.72a2 2 0 001.994-1.757L15.707 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-1 4a1 1 0 012 0v8a1 1 0 11-2 0V6zm4-1a1 1 0 00-1 1v8a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Ngày
              </label>
              <input
                type="date"
                value={day.date}
                onChange={(event) => updateDay(day.id, 'date', event.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Hoạt động
              </label>
              <textarea
                value={day.activities}
                onChange={(event) => updateDay(day.id, 'activities', event.target.value)}
                rows={4}
                placeholder="- Check-in khách sạn&#10;- Cafe sáng&#10;- Tham quan..."
                className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-800 outline-none ring-rose-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
