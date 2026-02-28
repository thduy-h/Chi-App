import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

import type { Couple, Database } from './types'

export interface CurrentCoupleForUser {
  coupleId: string | null
  coupleCode: string | null
}

export type CurrentCoupleStatus = 'unauthenticated' | 'no_couple' | 'ready'

export interface CurrentCoupleContext {
  status: CurrentCoupleStatus
  userId: string | null
  userEmail: string | null
  coupleId: string | null
  coupleCode: string | null
  isOwner: boolean
}

interface CoupleRow {
  id: string
  code: string
  created_by: string | null
}

export type RpcRowType = 'array' | 'object' | 'null' | 'other'

export interface NormalizedRpcCoupleRow {
  id: string
  code: string | null
  created_by: string | null
}

let hasLoggedGetMyCoupleRawOnce = false

export function getRpcRowType(payload: unknown): RpcRowType {
  if (payload === null || payload === undefined) {
    return 'null'
  }

  if (Array.isArray(payload)) {
    return 'array'
  }

  if (typeof payload === 'object') {
    return 'object'
  }

  return 'other'
}

export function normalizeRpcRow(payload: unknown): NormalizedRpcCoupleRow | null {
  const candidate = Array.isArray(payload) ? (payload[0] ?? null) : payload
  if (!candidate || typeof candidate !== 'object') {
    return null
  }

  const row = candidate as { id?: unknown; code?: unknown; created_by?: unknown }
  if (typeof row.id !== 'string' || !row.id.trim()) {
    return null
  }

  return {
    id: row.id,
    code: typeof row.code === 'string' ? row.code : null,
    created_by: typeof row.created_by === 'string' ? row.created_by : null
  }
}

export function logGetMyCoupleRawOnce(source: string, payload: unknown) {
  if (process.env.NODE_ENV !== 'development' || hasLoggedGetMyCoupleRawOnce) {
    return
  }

  hasLoggedGetMyCoupleRawOnce = true
  console.debug(`[${source}] get_my_couple raw`, {
    rawType: getRpcRowType(payload),
    data: payload
  })
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

export function assertCoupleIdForSelect(coupleId: string | null | undefined, context: string) {
  const normalized = coupleId?.trim() ?? ''
  if (normalized) {
    return normalized
  }

  const message = `[couples/select-guard] Missing couple_id before selecting couples in ${context}`
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(message)
  }

  console.error(message)
  return null
}

export async function selectCoupleById(
  supabase: SupabaseClient<Database>,
  coupleId: string | null | undefined,
  context = 'selectCoupleById'
): Promise<CoupleRow | null> {
  const safeCoupleId = assertCoupleIdForSelect(coupleId, context)
  if (!safeCoupleId) {
    return null
  }

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('id, code, created_by')
    .eq('id', safeCoupleId)
    .single()

  if (isForbiddenCouplesSelectError(coupleError) || isCouplesRowNotFoundError(coupleError)) {
    return null
  }

  if (coupleError) {
    throw coupleError
  }

  return couple
}

export async function getCurrentCoupleForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CurrentCoupleForUser> {
  const { data: membership, error: membershipError } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (membershipError || !membership?.couple_id) {
    return { coupleId: null, coupleCode: null }
  }

  const couple = await selectCoupleById(supabase, membership.couple_id, 'getCurrentCoupleForUser')
  if (!couple) {
    return { coupleId: null, coupleCode: null }
  }

  return {
    coupleId: couple.id,
    coupleCode: couple?.code ?? null
  }
}

export async function getCurrentCoupleContext(
  supabase: SupabaseClient<Database>
): Promise<CurrentCoupleContext> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      status: 'unauthenticated',
      userId: null,
      userEmail: null,
      coupleId: null,
      coupleCode: null,
      isOwner: false
    }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (membershipError || !membership?.couple_id) {
    return {
      status: 'no_couple',
      userId: user.id,
      userEmail: user.email ?? null,
      coupleId: null,
      coupleCode: null,
      isOwner: false
    }
  }

  const couple = await selectCoupleById(supabase, membership.couple_id, 'getCurrentCoupleContext')
  if (!couple) {
    return {
      status: 'no_couple',
      userId: user.id,
      userEmail: user.email ?? null,
      coupleId: null,
      coupleCode: null,
      isOwner: false
    }
  }

  return {
    status: 'ready',
    userId: user.id,
    userEmail: user.email ?? null,
    coupleId: couple.id,
    coupleCode: couple.code,
    isOwner: Boolean(couple.created_by && couple.created_by === user.id)
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
