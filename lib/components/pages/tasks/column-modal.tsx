'use client'

import { useEffect, useState } from 'react'

export const ColumnModal = ({
  mode = 'create',
  initialData,
  onClose,
  onSubmit
}: {
  mode?: 'create' | 'edit'
  initialData?: { title: string; status: string }
  onClose: () => void
  onSubmit: (input: { title: string; status: string }) => void
}) => {
  const [title, setTitle] = useState(initialData?.title || '')
  const [status, setStatus] = useState(initialData?.status || '')
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
    if (!title.trim()) {
      setError('Vui lòng nh?p tên c?t.')
      return
    }

    if (!status.trim()) {
      setError('Vui lòng nh?p status key.')
      return
    }

    onSubmit({
      title: title.trim(),
      status: status.trim().toLowerCase().replace(/\s+/g, '-')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? 'T?o c?t m?i' : 'Ð?i tên c?t'}
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
              htmlFor="column-title"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Tên c?t
            </label>
            <input
              id="column-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                if (error) setError('')
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Ví d?: Ðang th?c hi?n"
            />
          </div>

          <div>
            <label
              htmlFor="column-status"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Status key
            </label>
            <input
              id="column-status"
              value={status}
              disabled={mode === 'edit'}
              onChange={(event) => {
                setStatus(event.target.value)
                if (error) setError('')
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:disabled:bg-gray-900/70"
              placeholder="dang-thuc-hien"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

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
              {mode === 'create' ? 'T?o c?t' : 'Luu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
