import {
  formatLetterDate,
  getLetterDisplayTitle,
  getLetterKindLabel,
  type LetterRecord
} from '@/lib/letters/types'

export function LetterPaper({ letter }: { letter: LetterRecord }) {
  const senderLabel = letter.anonymous ? 'Tá»« áº©n danh' : `Tá»« ${letter.senderNickname?.trim() || 'ngÆ°á»i áº¥y'}`

  return (
    <article className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm dark:border-sky-900/40 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {getLetterDisplayTitle(letter)}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatLetterDate(letter.created_at)}
          </p>
        </div>

        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
          {getLetterKindLabel(letter.kind)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {letter.mood ? (
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200">
            TÃ¢m tráº¡ng: {letter.mood}
          </span>
        ) : null}
        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {senderLabel}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
        <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-200">
          {letter.message}
        </p>
      </div>
    </article>
  )
}
