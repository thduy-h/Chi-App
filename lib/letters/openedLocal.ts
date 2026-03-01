const OPENED_KEY_PREFIX = 'lovehub:letters:opened:'

function getKey(coupleId: string) {
  return `${OPENED_KEY_PREFIX}${coupleId}`
}

function toUniqueIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  return Array.from(
    new Set(
      input
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

export function getOpenedIds(coupleId: string): string[] {
  if (typeof window === 'undefined' || !coupleId) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(getKey(coupleId))
    if (!raw) {
      return []
    }

    return toUniqueIds(JSON.parse(raw))
  } catch {
    return []
  }
}

export function markOpened(coupleId: string, letterId: string): string[] {
  if (typeof window === 'undefined' || !coupleId || !letterId) {
    return []
  }

  const next = Array.from(new Set([...getOpenedIds(coupleId), letterId]))
  window.localStorage.setItem(getKey(coupleId), JSON.stringify(next))
  return next
}
