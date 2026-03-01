'use client'

import { useEffect, useState } from 'react'
import { KanbanColumn, TaskModalInput } from '@/lib/components/pages/tasks/types'

export const TaskModal = ({
  mode = 'create',
  columns,
  initialData,
  onClose,
  onSubmit
}: {
  mode?: 'create' | 'edit'
  columns: KanbanColumn[]
  initialData?: TaskModalInput
  onClose: () => void
  onSubmit: (input: TaskModalInput) => void
}) => {
  const [content, setContent] = useState(initialData?.content || '')
  const [note, setNote] = useState(initialData?.note || '')
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '')
  const [status, setStatus] = useState(initialData?.status || columns[0]?.status || '')
  const [error, setError] = useState('')

  useEffect(() => {
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', closeByEscape)
    return () => document.removeEventListener('keydown', closeByEscape)
  }, [onClose])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!content.trim()) {
      setError('Vui lòng nh?p n?i dung task.')
      return
    }

    onSubmit({
      content: content.trim(),
      note: note.trim() || undefined,
      dueDate: dueDate || undefined,
      status
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? 'T?o task m?i' : 'Ch?nh s?a task'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <span className="sr-only">Ðóng</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label
              htmlFor="task-content"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              N?i dung task
            </label>
            <input
              id="task-content"
              value={content}
              onChange={(event) => {
                setContent(event.target.value)
                if (error) setError('')
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Ví d?: Ch?t l?ch di Ðà L?t cu?i tu?n"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div>
            <label
              htmlFor="task-note"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Ghi chú
            </label>
            <textarea
              id="task-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Chi ti?t thêm cho task này..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-status"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                C?t
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {columns.map((column) => (
                  <option key={column.status} value={column.status}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-due-date"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                H?n d? ki?n
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Hu?
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              {mode === 'create' ? 'T?o task' : 'Luu thay d?i'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
