import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

import { getCurrentCoupleForUser, selectCoupleById } from '@/lib/supabase/couples'
import type { Database } from '@/lib/supabase/types'

export type HomeMode = 'a' | 'b' | 'c'

const VALID_HOME_MODES: HomeMode[] = ['a', 'b', 'c']

function parseEmailList(raw: string | undefined) {
  return new Set(
    (raw || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
}

function parseMode(raw: string | undefined): HomeMode | null {
  const normalized = (raw || '').trim().toLowerCase()
  return VALID_HOME_MODES.includes(normalized as HomeMode) ? (normalized as HomeMode) : null
}

function getDefaultMode(): HomeMode {
  return parseMode(process.env.LOVEHUB_HOME_DEFAULT_MODE) ?? 'c'
}

function isMissingTableError(error: PostgrestError | null) {
  if (!error) {
    return false
  }

  const code = (error.code ?? '').toUpperCase()
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
  return code === '42P01' || message.includes('relation') || message.includes('does not exist')
}

export async function resolveHomeMode(
  supabase: SupabaseClient<Database> | null
): Promise<HomeMode> {
  const defaultMode = getDefaultMode()

  try {
    if (!supabase) {
      return defaultMode
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return defaultMode
    }

    const userEmail = user.email?.trim().toLowerCase() || ''

    const allowedModeAEmails = parseEmailList(process.env.LOVEHUB_HOME_MODE_A_EMAILS)
    if (userEmail && allowedModeAEmails.has(userEmail)) {
      return 'a'
    }

    const allowedModeBEmails = parseEmailList(process.env.LOVEHUB_HOME_MODE_B_EMAILS)
    if (userEmail && allowedModeBEmails.has(userEmail)) {
      return 'b'
    }

    const allowedModeCEmails = parseEmailList(process.env.LOVEHUB_HOME_MODE_C_EMAILS)
    if (userEmail && allowedModeCEmails.has(userEmail)) {
      return 'c'
    }

    const ownerUserId = process.env.LOVEHUB_HOME_OWNER_USER_ID?.trim()
    if (ownerUserId) {
      const currentCouple = await getCurrentCoupleForUser(supabase, user.id)
      if (currentCouple.coupleId) {
        const couple = await selectCoupleById(supabase, currentCouple.coupleId, 'resolveHomeMode')
        if (couple?.created_by && couple.created_by === ownerUserId) {
          return 'a'
        }
      }
    }

    const { data: modeRow, error: modeError } = await supabase
      .from('user_home_modes')
      .select('mode')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!modeError) {
      const dbMode = parseMode(modeRow?.mode)
      if (dbMode) {
        return dbMode
      }
    } else if (!isMissingTableError(modeError)) {
      return defaultMode
    }

    return defaultMode
  } catch {
    return defaultMode
  }
}
