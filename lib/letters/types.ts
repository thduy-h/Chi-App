export type LetterKind = 'love' | 'feedback'

export interface LetterRecord {
  id: string
  kind: LetterKind
  title: string | null
  message: string
  mood: string | null
  anonymous: boolean
  senderNickname?: string | null
  created_at: string | null
}

export function getLetterKindLabel(kind: LetterKind) {
  return kind === 'love' ? 'Thư tình' : 'Góp ý'
}

export function getLetterFallbackTitle(kind: LetterKind) {
  return kind === 'love' ? 'Một lá thư mới 💌' : 'Một góp ý mới 📝'
}

export function getLetterDisplayTitle(letter: Pick<LetterRecord, 'title' | 'kind'>) {
  const cleanedTitle = letter.title?.trim()
  if (cleanedTitle) {
    return cleanedTitle
  }

  return getLetterFallbackTitle(letter.kind)
}

export function formatLetterDate(value: string | null) {
  if (!value) {
    return '--'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}
