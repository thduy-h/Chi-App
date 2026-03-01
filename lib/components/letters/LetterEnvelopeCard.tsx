import Link from 'next/link'

import {
  formatLetterDate,
  getLetterDisplayTitle,
  getLetterKindLabel,
  type LetterRecord
} from '@/lib/letters/types'

type LetterColorMode = 'pink' | 'blue'

export function LetterEnvelopeCard({
  letter,
  href,
  opened,
  openedLabel,
  colorMode = 'blue'
}: {
  letter: LetterRecord
  href: string
  opened: boolean
  openedLabel: string
  colorMode?: LetterColorMode
}) {
  const senderLabel = letter.anonymous
    ? 'Từ ẩn danh'
    : `Từ ${letter.senderNickname?.trim() || 'người ấy'}`

  const theme =
    colorMode === 'pink'
      ? {
          frame:
            'border-rose-100 hover:border-rose-200 dark:border-rose-900/40 dark:hover:border-rose-800',
          iconBg: 'from-rose-200 to-fuchsia-200 dark:from-rose-900/50 dark:to-fuchsia-900/50',
          dot: 'bg-rose-500',
          kind:
            'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
        }
      : {
          frame:
            'border-sky-100 hover:border-sky-200 dark:border-sky-900/40 dark:hover:border-sky-800',
          iconBg: 'from-sky-200 to-indigo-200 dark:from-sky-900/50 dark:to-indigo-900/50',
          dot: 'bg-sky-500',
          kind:
            'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200'
        }

  return (
    <Link
      href={href}
      className={`group block rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 ${theme.frame}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-lg ${theme.iconBg}`}
          >
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
          {!opened ? <span className={`inline-flex h-2.5 w-2.5 rounded-full ${theme.dot}`} /> : null}
          <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {openedLabel}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${theme.kind}`}>
          {getLetterKindLabel(letter.kind)}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {formatLetterDate(letter.created_at)}
        </span>
      </div>
    </Link>
  )
}
