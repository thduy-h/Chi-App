import Link from 'next/link'

import {
  formatLetterDate,
  getLetterDisplayTitle,
  getLetterKindLabel,
  type LetterRecord
} from '@/lib/letters/types'

export function LetterEnvelopeCard({
  letter,
  href,
  opened,
  openedLabel
}: {
  letter: LetterRecord
  href: string
  opened: boolean
  openedLabel: string
}) {
  const senderLabel = letter.anonymous ? 'Từ ẩn danh' : `Từ ${letter.senderNickname?.trim() || 'người ấy'}`

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-rose-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md dark:border-rose-900/40 dark:bg-gray-900 dark:hover:border-rose-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-200 to-pink-200 text-lg dark:from-rose-900/50 dark:to-pink-900/50">
            {letter.kind === 'love' ? '💌' : '📝'}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {getLetterDisplayTitle(letter)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{senderLabel}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {!opened ? <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" /> : null}
          <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {openedLabel}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          {getLetterKindLabel(letter.kind)}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {formatLetterDate(letter.created_at)}
        </span>
      </div>
    </Link>
  )
}
