import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

import type { Couple, Database } from './types'

export interface CurrentCoupleContext {
  coupleId: string | null
  coupleCode: string | null
}

function isForbiddenCouplesSelectError(error: PostgrestError | null) {
  if (!error) {
    return false
  }

  const code = (error.code ?? '').toUpperCase()
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()

  return (
    code === '403' ||
    code === '42501' ||
    code === 'PGRST301' ||
    text.includes('forbidden') ||
    text.includes('permission denied') ||
    text.includes('row-level security')
  )
}

function isCouplesRowNotFoundError(error: PostgrestError | null) {
  if (!error) {
    return false
  }

  const code = (error.code ?? '').toUpperCase()
  const message = (error.message ?? '').toLowerCase()

  return code === 'PGRST116' || message.includes('json object requested, multiple (or no) rows returned')
}

export async function getCurrentCoupleForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CurrentCoupleContext> {
  const { data: membership, error: membershipError } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (membershipError || !membership?.couple_id) {
    return { coupleId: null, coupleCode: null }
  }

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('id, code')
    .eq('id', membership.couple_id)
    .single()

  if (isForbiddenCouplesSelectError(coupleError)) {
    return { coupleId: null, coupleCode: null }
  }

  if (isCouplesRowNotFoundError(coupleError)) {
    return { coupleId: null, coupleCode: null }
  }

  if (coupleError) {
    throw coupleError
  }

  return {
    coupleId: membership.couple_id,
    coupleCode: couple?.code ?? null
  }
}

export function generateCoupleCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
    ''
  )
}

export function normalizeCoupleCode(code: string) {
  return code.trim().toUpperCase()
}

export function cacheActiveCouple(couple: { id: string; code: string }) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem('lovehub.active_couple_id', couple.id)
  window.localStorage.setItem('lovehub.active_couple_code', couple.code)
}

export function clearActiveCoupleCache() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem('lovehub.active_couple_id')
  window.localStorage.removeItem('lovehub.active_couple_code')
}

export function readActiveCoupleCache(): { id: string; code: string | null } | null {
  if (typeof window === 'undefined') {
    return null
  }

  const id = window.localStorage.getItem('lovehub.active_couple_id')
  if (!id) {
    return null
  }

  return {
    id,
    code: window.localStorage.getItem('lovehub.active_couple_code')
  }
}

export function toCouplePayload(couple: Pick<Couple, 'id' | 'code'>) {
  return { id: couple.id, code: couple.code }
}
