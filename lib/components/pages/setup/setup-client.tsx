'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  emitCoupleChangedEvent,
  generateCoupleCode,
  getRpcRowType,
  logGetMyCoupleRawOnce,
  normalizeCoupleCode,
  normalizeRpcRow
} from '@/lib/supabase/couples'

interface CouplePayload {
  id: string
  code: string
}

type CoupleState =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'active'; coupleId: string; code: string; isOwner: boolean }

interface SetupClientProps {
  initialEmail: string
  initialCouple: CouplePayload | null
}

interface CreatedCoupleHistoryItem {
  id: string
  code: string
  created_at: string | null
  memberCount: number
  isCurrentMember: boolean
}

interface QueryDebugState {
  data: unknown
  rawType: string
  normalizedCoupleId: string | null
  error: {
    code: string | null
    message: string | null
  } | null
}

interface CreateCoupleDebugState {
  data: unknown
  rawType: string
  parsedCoupleId: string | null
  parsedCode: string | null
  error: {
    code: string | null
    message: string | null
    details: string | null
    hint: string | null
  } | null
}

interface CreateDiagnosticsError {
  message: string
  code: string
  details: string | null
  hint: string | null
}

function mapCreateError(error: unknown, fallbackMessage: string): CreateDiagnosticsError {
  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: string
      code?: string | null
      details?: string | null
      hint?: string | null
    }

    return {
      message: candidate.message ?? fallbackMessage,
      code: candidate.code ?? 'khÃ´ng rÃµ',
      details: candidate.details ?? null,
      hint: candidate.hint ?? null
    }
  }

  return {
    message: fallbackMessage,
    code: 'khÃ´ng rÃµ',
    details: null,
    hint: null
  }
}

function parseJoinedCoupleId(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (Array.isArray(payload)) {
    const first = payload[0]
    if (typeof first === 'string' && first.trim()) {
      return first
    }
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as { couple_id?: unknown; id?: unknown }
    if (typeof candidate.couple_id === 'string' && candidate.couple_id.trim()) {
      return candidate.couple_id
    }
    if (typeof candidate.id === 'string' && candidate.id.trim()) {
      return candidate.id
    }
  }

  return null
}

function parseRotatedCoupleCode(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as { code?: unknown; new_code?: unknown }
    if (typeof candidate.code === 'string' && candidate.code.trim()) {
      return candidate.code
    }
    if (typeof candidate.new_code === 'string' && candidate.new_code.trim()) {
      return candidate.new_code
    }
  }

  return null
}

function parseCreatedCouple(payload: unknown): CouplePayload | null {
  if (!payload) {
    return null
  }

  if (Array.isArray(payload)) {
    const first = payload[0]
    if (first && typeof first === 'object') {
      const candidate = first as { id?: unknown; code?: unknown }
      if (typeof candidate.id === 'string' && typeof candidate.code === 'string') {
        return { id: candidate.id, code: candidate.code }
      }
    }
    return null
  }

  if (typeof payload === 'object') {
    const candidate = payload as { id?: unknown; code?: unknown }
    if (typeof candidate.id === 'string' && typeof candidate.code === 'string') {
      return { id: candidate.id, code: candidate.code }
    }
  }

  return null
}

function isSameCoupleState(current: CoupleState, next: CoupleState) {
  if (current.status !== next.status) {
    return false
  }

  if (current.status !== 'active' || next.status !== 'active') {
    return true
  }

  return (
    current.coupleId === next.coupleId &&
    current.code === next.code &&
    current.isOwner === next.isOwner
  )
}

function parseWhoami(payload: unknown): { uid: string | null; role: string | null } {
  const row = Array.isArray(payload) ? (payload[0] ?? null) : payload
  if (!row || typeof row !== 'object') {
    return { uid: null, role: null }
  }

  const candidate = row as { uid?: unknown; role?: unknown }
  return {
    uid: typeof candidate.uid === 'string' ? candidate.uid : null,
    role: typeof candidate.role === 'string' ? candidate.role : null
  }
}

export function SetupClient({ initialEmail, initialCouple }: SetupClientProps) {
  const router = useRouter()
  const dispatch = useDispatch()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const isDev = process.env.NODE_ENV === 'development'
  void initialCouple

  const [email, setEmail] = useState(initialEmail)
  const [authUser, setAuthUser] = useState<{ id: string | null; email: string | null }>({
    id: null,
    email: initialEmail || null
  })
  const [hasAccessToken, setHasAccessToken] = useState(false)
  const [coupleState, setCoupleState] = useState<CoupleState>({ status: 'loading' })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [debugUserId, setDebugUserId] = useState<string | null>(null)
  const [whoamiDebug, setWhoamiDebug] = useState<QueryDebugState | null>(null)
  const [myCoupleDebug, setMyCoupleDebug] = useState<QueryDebugState | null>(null)
  const [createCoupleDebug, setCreateCoupleDebug] = useState<CreateCoupleDebugState | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [latestRotatedCode, setLatestRotatedCode] = useState<string | null>(null)
  const [createdCouplesHistory, setCreatedCouplesHistory] = useState<CreatedCoupleHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLeavingCouple, setIsLeavingCouple] = useState(false)
  const [isDeletingCouple, setIsDeletingCouple] = useState(false)
  const [isResettingCouple, setIsResettingCouple] = useState(false)
  const [isRotatingCoupleCode, setIsRotatingCoupleCode] = useState(false)
  const [deletingHistoryCoupleId, setDeletingHistoryCoupleId] = useState<string | null>(null)

  const activeCouple = coupleState.status === 'active' ? coupleState : null
  const whoamiInfo = useMemo(() => parseWhoami(whoamiDebug?.data), [whoamiDebug?.data])
  const isBusy =
    isSubmitting ||
    isLeavingCouple ||
    isDeletingCouple ||
    isResettingCouple ||
    isRotatingCoupleCode
  const statusTextClass =
    coupleState.status === 'active'
      ? 'text-emerald-700 dark:text-emerald-300'
      : coupleState.status === 'none'
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-red-700 dark:text-red-300'

  const applyCoupleState = useCallback((next: CoupleState) => {
    setCoupleState((current) => (isSameCoupleState(current, next) ? current : next))
  }, [])

  const loadCreatedCouplesHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      const response = await fetch('/api/couple/history', { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as {
        history?: CreatedCoupleHistoryItem[]
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || 'KhÃ´ng thá»ƒ táº£i lá»‹ch sá»­ couple Ä‘Ã£ táº¡o.')
      }

      setCreatedCouplesHistory(Array.isArray(payload.history) ? payload.history : [])
    } catch (error) {
      setCreatedCouplesHistory([])
      dispatch(
        setAlert({
          type: 'warning',
          title: 'KhÃ´ng táº£i Ä‘Æ°á»£c lá»‹ch sá»­ couple',
          message: error instanceof Error ? error.message : 'ÄÃ£ xáº£y ra lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh.'
        })
      )
    } finally {
      setHistoryLoading(false)
    }
  }, [dispatch])

  const loadCoupleState = useCallback(
    async (options?: { initial?: boolean; expectedCoupleId?: string | null }) => {
      const isInitial = Boolean(options?.initial)
      const expectedCoupleId = options?.expectedCoupleId ?? null

      if (isInitial) {
        applyCoupleState({ status: 'loading' })
      }

      if (!supabase) {
        if (isInitial) {
          applyCoupleState({ status: 'none' })
        }
        setLoadError('Thiáº¿u cáº¥u hÃ¬nh Supabase')
        return null
      }

      try {
        setIsRefreshing(true)

        const [{ data: userData, error: userError }, { data: sessionData, error: sessionError }] =
          await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()])

        if (sessionError) {
          console.error('[setup/loadCoupleState] getSession error:', sessionError)
        }
        setHasAccessToken(Boolean(sessionData.session?.access_token))

        const user = userData.user
        if (userError || !user) {
          setDebugUserId(null)
          setWhoamiDebug(null)
          setMyCoupleDebug(null)
          setCreateCoupleDebug(null)
          setAuthUser({ id: null, email: initialEmail || null })
          setEmail(initialEmail || '')
          setLoadError(null)
          if (!expectedCoupleId) {
            applyCoupleState({ status: 'none' })
          }
          return { status: 'none' } as CoupleState
        }

        setDebugUserId(user.id)
        setAuthUser({ id: user.id, email: user.email ?? null })
        if (user.email) {
          setEmail(user.email)
        }

        if (isDev) {
          const { data: whoamiData, error: whoamiError } = await supabase.rpc('whoami')
          setWhoamiDebug({
            data: whoamiData ?? null,
            rawType: getRpcRowType(whoamiData),
            normalizedCoupleId: null,
            error: whoamiError
              ? {
                  code: whoamiError.code ?? null,
                  message: whoamiError.message ?? null
                }
              : null
          })
        } else {
          setWhoamiDebug(null)
        }

        const { data: myCoupleData, error: myCoupleError } = await supabase.rpc('get_my_couple')
        logGetMyCoupleRawOnce('setup/loadCoupleState', myCoupleData)
        const normalizedMyCouple = normalizeRpcRow(myCoupleData)
        if (isDev) {
          setMyCoupleDebug({
            data: myCoupleData ?? null,
            rawType: getRpcRowType(myCoupleData),
            normalizedCoupleId: normalizedMyCouple?.id ?? null,
            error: myCoupleError
              ? {
                  code: myCoupleError.code ?? null,
                  message: myCoupleError.message ?? null
                }
              : null
          })
        } else {
          setMyCoupleDebug(null)
        }

        if (myCoupleError) {
          setLoadError(
            `get_my_couple failed: ${myCoupleError.message}${
              myCoupleError.code ? ` (${myCoupleError.code})` : ''
            }`
          )
          return null
        }

        const myCouple = normalizedMyCouple
        if (!myCouple) {
          setLoadError(null)
          if (!expectedCoupleId) {
            applyCoupleState({ status: 'none' })
          }
          return { status: 'none' } as CoupleState
        }

        setLoadError(null)
        const nextState: CoupleState = {
          status: 'active',
          coupleId: myCouple.id,
          code: myCouple.code ?? '',
          isOwner: Boolean(myCouple.created_by && myCouple.created_by === user.id)
        }

        if (!expectedCoupleId || expectedCoupleId === nextState.coupleId) {
          applyCoupleState(nextState)
        }

        return nextState
      } catch (error) {
        const loadStateError = mapCreateError(error, 'KhÃ´ng thá»ƒ táº£i tráº¡ng thÃ¡i couple')
        console.error('[setup/loadCoupleState] failed:', loadStateError)
        setLoadError(`${loadStateError.message}${loadStateError.code ? ` (${loadStateError.code})` : ''}`)
        return null
      } finally {
        setIsRefreshing(false)
      }
    },
    [applyCoupleState, initialEmail, isDev, supabase]
  )

  useEffect(() => {
    void loadCoupleState({ initial: true })
  }, [loadCoupleState])

  useEffect(() => {
    void loadCreatedCouplesHistory()
  }, [loadCreatedCouplesHistory])

  useEffect(() => {
    setCreatedCouplesHistory((previous) => {
      if (previous.length < 1) {
        return previous
      }

      const activeCoupleId = coupleState.status === 'active' ? coupleState.coupleId : null
      let changed = false

      const next = previous.map((item) => {
        const isCurrentMember = Boolean(activeCoupleId && item.id === activeCoupleId)
        if (item.isCurrentMember === isCurrentMember) {
          return item
        }
        changed = true
        return { ...item, isCurrentMember }
      })

      return changed ? next : previous
    })
  }, [coupleState])

  const onCreateCouple = async () => {
    try {
      setIsSubmitting(true)
      setLoadError(null)

      if (!supabase) {
        throw mapCreateError(null, 'Thiáº¿u cáº¥u hÃ¬nh Supabase')
      }

      if (coupleState.status === 'active') {
        dispatch(
          setAlert({
            type: 'info',
            title: 'ThÃ´ng tin',
            message: 'Báº¡n Ä‘Ã£ cÃ³ couple.'
          })
        )
        return
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw mapCreateError(userError, 'ChÆ°a Ä‘Äƒng nháº­p')
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw mapCreateError(sessionError, 'KhÃ´ng thá»ƒ táº£i phiÃªn Ä‘Äƒng nháº­p')
      }

      if (!sessionData.session?.access_token) {
        throw mapCreateError(
          {
            code: 'missing_access_token',
            message: 'KhÃ´ng cÃ³ access token trong phiÃªn Supabase',
            details: 'supabase.auth.getSession() returned no access_token',
            hint: 'HÃ£y Ä‘Äƒng nháº­p láº¡i trÆ°á»›c khi táº¡o couple.'
          },
          'KhÃ´ng cÃ³ access token trong phiÃªn Supabase'
        )
      }

      setHasAccessToken(true)

      let createdCouple: CouplePayload | null = null
      let lastCreateError: CreateDiagnosticsError | null = null

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateCoupleCode()
        const { data, error } = await supabase.rpc('create_couple', {
          p_code: code
        })
        const parsed = parseCreatedCouple(data)
        if (isDev) {
          setCreateCoupleDebug({
            data: data ?? null,
            rawType: getRpcRowType(data),
            parsedCoupleId: parsed?.id ?? null,
            parsedCode: parsed?.code ?? null,
            error: error
              ? {
                  code: error.code ?? null,
                  message: error.message ?? null,
                  details: error.details ?? null,
                  hint: error.hint ?? null
                }
              : null
          })
        }

        if (error) {
          lastCreateError = mapCreateError(error, 'KhÃ´ng thá»ƒ táº¡o couple')
          continue
        }

        if (!parsed) {
          lastCreateError = mapCreateError(
            {
              code: 'invalid_rpc_payload',
              message: 'create_couple did not return {id, code}',
              details: JSON.stringify(data ?? null),
              hint: 'Äáº£m báº£o RPC create_couple tráº£ vá» Ä‘Ãºng má»™t object cÃ³ id vÃ  code.'
            },
            'KhÃ´ng thá»ƒ Ä‘á»c káº¿t quáº£ create_couple'
          )
          continue
        }

        createdCouple = parsed
        break
      }

      if (!createdCouple) {
        throw lastCreateError ?? mapCreateError(null, 'KhÃ´ng thá»ƒ táº¡o couple')
      }

      const { data: verifiedCoupleRaw, error: verifiedCoupleError } = await supabase.rpc('get_my_couple')
      const verifiedCouple = normalizeRpcRow(verifiedCoupleRaw)
      if (isDev) {
        setMyCoupleDebug({
          data: verifiedCoupleRaw ?? null,
          rawType: getRpcRowType(verifiedCoupleRaw),
          normalizedCoupleId: verifiedCouple?.id ?? null,
          error: verifiedCoupleError
            ? {
                code: verifiedCoupleError.code ?? null,
                message: verifiedCoupleError.message ?? null
              }
            : null
        })
      }

      if (verifiedCoupleError || !verifiedCouple?.id) {
        const blockingMessage =
          'Táº¡o couple thÃ nh cÃ´ng nhÆ°ng chÆ°a ghÃ©p vÃ o couple. Vui lÃ²ng báº¥m lÃ m má»›i hoáº·c Reset.'
        setLoadError(blockingMessage)
        applyCoupleState({ status: 'none' })
        dispatch(
          setAlert({
            type: 'error',
            title: 'Cáº§n xá»­ lÃ½ thÃªm',
            message: blockingMessage
          })
        )
        return
      }

      applyCoupleState({
        status: 'active',
        coupleId: verifiedCouple.id,
        code: verifiedCouple.code ?? createdCouple.code,
        isOwner: true
      })
      emitCoupleChangedEvent('create')
      setLatestRotatedCode(null)
      setLoadError(null)
      void loadCreatedCouplesHistory()

      void loadCoupleState({ expectedCoupleId: verifiedCouple.id })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Táº¡o couple thÃ nh cÃ´ng',
          message: `MÃ£ couple cá»§a báº¡n lÃ  ${createdCouple.code}`
        })
      )
    } catch (error) {
      const createError = mapCreateError(error, 'KhÃ´ng thá»ƒ táº¡o couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Táº¡o couple tháº¥t báº¡i',
          message: `${createError.message} (${createError.code})`
        })
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const onJoinCouple = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = normalizeCoupleCode(joinCode)
    if (!code) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'Thiáº¿u mÃ£',
          message: 'Vui lÃ²ng nháº­p mÃ£ ghÃ©p Ä‘Ã´i.'
        })
      )
      return
    }

    try {
      setIsSubmitting(true)

      if (!supabase) {
        throw mapCreateError(null, 'Thiáº¿u cáº¥u hÃ¬nh Supabase')
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw mapCreateError(userError, 'KhÃ´ng thá»ƒ xÃ¡c Ä‘á»‹nh ngÆ°á»i dÃ¹ng hiá»‡n táº¡i')
      }

      const { data, error } = await supabase.rpc('join_by_code', { p_code: code })
      if (error) {
        const joinError = mapCreateError(error, 'KhÃ´ng thá»ƒ tham gia couple')
        const invalidCode =
          joinError.code === 'P0001' || /invalid|not found|khong ton tai|ma/i.test(joinError.message)

        throw new Error(
          invalidCode
            ? 'MÃ£ couple khÃ´ng há»£p lá»‡. Vui lÃ²ng kiá»ƒm tra láº¡i.'
            : `${joinError.message} (${joinError.code})`
        )
      }

      const joinedCoupleId = parseJoinedCoupleId(data)
      if (!joinedCoupleId) {
        throw new Error('MÃ£ couple khÃ´ng há»£p lá»‡. Vui lÃ²ng kiá»ƒm tra láº¡i.')
      }

      setJoinCode('')
      emitCoupleChangedEvent('join')
      void loadCoupleState({ expectedCoupleId: joinedCoupleId })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Tham gia thÃ nh cÃ´ng',
          message: 'ÄÃ£ tham gia couple thÃ nh cÃ´ng.'
        })
      )
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Tham gia tháº¥t báº¡i',
          message: error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ tham gia couple'
        })
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const onLeaveCouple = async () => {
    if (coupleState.status !== 'active') {
      return
    }

    try {
      setIsLeavingCouple(true)

      if (!supabase) {
        throw mapCreateError(null, 'Thiáº¿u cáº¥u hÃ¬nh Supabase')
      }

      const { error } = await supabase.rpc('leave_couple', { p_couple_id: coupleState.coupleId })
      if (error) {
        throw mapCreateError(error, 'KhÃ´ng thá»ƒ rá»i couple')
      }

      applyCoupleState({ status: 'none' })
      emitCoupleChangedEvent('leave')
      setLatestRotatedCode(null)
      void loadCreatedCouplesHistory()
      void loadCoupleState()

      dispatch(
        setAlert({
          type: 'success',
          title: 'Rá»i couple thÃ nh cÃ´ng',
          message: 'Báº¡n Ä‘Ã£ rá»i couple.'
        })
      )
    } catch (error) {
      const leaveError = mapCreateError(error, 'KhÃ´ng thá»ƒ rá»i couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Rá»i couple tháº¥t báº¡i',
          message: `${leaveError.message} (${leaveError.code})`
        })
      )
    } finally {
      setIsLeavingCouple(false)
    }
  }

  const onDeleteCouple = async () => {
    if (coupleState.status !== 'active' || !coupleState.isOwner) {
      return
    }

    const confirmed = window.confirm(
      'XÃ“A COUPLE sáº½ xÃ³a dá»¯ liá»‡u liÃªn quan. HÃ nh Ä‘á»™ng nÃ y KHÃ”NG THá»‚ HOÃ€N TÃC. Báº¡n cháº¯c cháº¯n?'
    )
    if (!confirmed) {
      return
    }

    try {
      setIsDeletingCouple(true)

      if (!supabase) {
        throw mapCreateError(null, 'Thiáº¿u cáº¥u hÃ¬nh Supabase')
      }

      const { error } = await supabase.rpc('delete_my_couple', { p_couple_id: coupleState.coupleId })
      if (error) {
        throw mapCreateError(error, 'KhÃ´ng thá»ƒ xÃ³a couple')
      }

      applyCoupleState({ status: 'none' })
      emitCoupleChangedEvent('delete')
      setLatestRotatedCode(null)
      void loadCreatedCouplesHistory()
      void loadCoupleState()

      dispatch(
        setAlert({
          type: 'success',
          title: 'XÃ³a couple thÃ nh cÃ´ng',
          message: 'Couple Ä‘Ã£ Ä‘Æ°á»£c xÃ³a.'
        })
      )
      router.replace('/setup')
      router.refresh()
    } catch (error) {
      const deleteError = mapCreateError(error, 'KhÃ´ng thá»ƒ xÃ³a couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'XÃ³a couple tháº¥t báº¡i',
          message: `${deleteError.message} (${deleteError.code})`
        })
      )
    } finally {
      setIsDeletingCouple(false)
    }
  }

  const onDeleteCreatedCouple = async (item: CreatedCoupleHistoryItem) => {
    if (item.isCurrentMember) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'KhÃ´ng thá»ƒ xoÃ¡',
          message: 'Couple nÃ y Ä‘ang tham gia. Vui lÃ²ng rá»i hoáº·c xoÃ¡ báº±ng nÃºt trong khung quáº£n lÃ½ couple.'
        })
      )
      return
    }

    const confirmed = window.confirm(
      `XoÃ¡ vÄ©nh viá»…n couple ${item.code}? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.`
    )
    if (!confirmed) {
      return
    }

    try {
      setDeletingHistoryCoupleId(item.id)
      const response = await fetch('/api/couple/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coupleId: item.id })
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'KhÃ´ng thá»ƒ xoÃ¡ couple Ä‘Ã£ rá»i.')
      }

      setCreatedCouplesHistory((previous) => previous.filter((entry) => entry.id !== item.id))
      dispatch(
        setAlert({
          type: 'success',
          title: 'ÄÃ£ xoÃ¡ couple',
          message: `ÄÃ£ xoÃ¡ couple ${item.code}.`
        })
      )
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'XoÃ¡ tháº¥t báº¡i',
          message: error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ xoÃ¡ couple Ä‘Ã£ rá»i.'
        })
      )
    } finally {
      setDeletingHistoryCoupleId(null)
    }
  }

  const onResetCouple = async () => {
    if (!supabase) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Äáº·t láº¡i tháº¥t báº¡i',
          message: 'Thiáº¿u cáº¥u hÃ¬nh Supabase'
        })
      )
      return
    }

    try {
      setIsResettingCouple(true)

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw mapCreateError(userError, 'ChÆ°a Ä‘Äƒng nháº­p')
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw mapCreateError(sessionError, 'KhÃ´ng thá»ƒ táº£i phiÃªn Ä‘Äƒng nháº­p')
      }

      if (!sessionData.session?.access_token) {
        throw new Error('Báº¡n cáº§n Ä‘Äƒng nháº­p láº¡i Ä‘á»ƒ reset couple.')
      }

      if (coupleState.status === 'active') {
        if (coupleState.isOwner) {
          const confirmDelete = window.confirm(
            'Cáº¢NH BÃO: Reset khi báº¡n lÃ  owner sáº½ xÃ³a toÃ n bá»™ dá»¯ liá»‡u chung cá»§a couple hiá»‡n táº¡i. Tiáº¿p tá»¥c?'
          )
          if (!confirmDelete) {
            return
          }

          const { error: deleteError } = await supabase.rpc('delete_my_couple', {
            p_couple_id: coupleState.coupleId
          })
          if (deleteError) {
            throw mapCreateError(deleteError, 'KhÃ´ng thá»ƒ xÃ³a couple hiá»‡n táº¡i')
          }
        } else {
          const confirmLeave = window.confirm('Báº¡n sáº½ rá»i couple hiá»‡n táº¡i vÃ  táº¡o couple má»›i. Tiáº¿p tá»¥c?')
          if (!confirmLeave) {
            return
          }

          const { error: leaveError } = await supabase.rpc('leave_couple', {
            p_couple_id: coupleState.coupleId
          })
          if (leaveError) {
            throw mapCreateError(leaveError, 'KhÃ´ng thá»ƒ rá»i couple hiá»‡n táº¡i')
          }
        }
      }

      let createdCouple: CouplePayload | null = null
      let lastCreateError: CreateDiagnosticsError | null = null

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateCoupleCode()
        const { data, error } = await supabase.rpc('create_couple', { p_code: code })
        if (error) {
          lastCreateError = mapCreateError(error, 'KhÃ´ng thá»ƒ táº¡o couple má»›i')
          continue
        }

        const parsed = parseCreatedCouple(data)
        if (!parsed) {
          lastCreateError = mapCreateError(
            {
              code: 'invalid_rpc_payload',
              message: 'create_couple did not return {id, code}',
              details: JSON.stringify(data ?? null),
              hint: 'Äáº£m báº£o RPC create_couple tráº£ vá» Ä‘Ãºng má»™t object cÃ³ id vÃ  code.'
            },
            'KhÃ´ng thá»ƒ Ä‘á»c káº¿t quáº£ create_couple'
          )
          continue
        }

        createdCouple = parsed
        break
      }

      if (!createdCouple) {
        throw lastCreateError ?? mapCreateError(null, 'KhÃ´ng thá»ƒ táº¡o couple má»›i')
      }

      let copied = false
      try {
        await navigator.clipboard.writeText(createdCouple.code)
        copied = true
      } catch {
        copied = false
      }

      applyCoupleState({
        status: 'active',
        coupleId: createdCouple.id,
        code: createdCouple.code,
        isOwner: true
      })
      emitCoupleChangedEvent('reset')
      setLatestRotatedCode(null)
      void loadCreatedCouplesHistory()

      void loadCoupleState({ expectedCoupleId: createdCouple.id })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Äáº·t láº¡i thÃ nh cÃ´ng',
          message: copied ? `Couple má»›i: ${createdCouple.code} (Ä‘Ã£ copy)` : `Couple má»›i: ${createdCouple.code}`
        })
      )
    } catch (error) {
      const resetError = mapCreateError(error, 'KhÃ´ng thá»ƒ Ä‘áº·t láº¡i couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Äáº·t láº¡i tháº¥t báº¡i',
          message: `${resetError.message} (${resetError.code})`
        })
      )
    } finally {
      setIsResettingCouple(false)
    }
  }

  const onRotateCoupleCode = async () => {
    if (coupleState.status !== 'active') {
      return
    }

    if (!coupleState.isOwner) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'KhÃ´ng cÃ³ quyá»n',
          message: 'Chá»‰ ngÆ°á»i táº¡o couple má»›i Ä‘á»•i mÃ£.'
        })
      )
      return
    }

    const confirmed = window.confirm(
      'Äá»•i mÃ£ couple? MÃ£ cÅ© sáº½ KHÃ”NG cÃ²n há»£p lá»‡. Dá»¯ liá»‡u chung váº«n Ä‘Æ°á»£c giá»¯ nguyÃªn.'
    )
    if (!confirmed) {
      return
    }

    try {
      setIsRotatingCoupleCode(true)
      if (!supabase) {
        throw mapCreateError(null, 'Thiáº¿u cáº¥u hÃ¬nh Supabase')
      }

      const { data, error } = await supabase.rpc('rotate_couple_code', { p_couple_id: coupleState.coupleId })
      if (error) {
        throw mapCreateError(error, 'KhÃ´ng thá»ƒ Ä‘á»•i mÃ£ couple')
      }

      const newCode = parseRotatedCoupleCode(data)
      if (!newCode) {
        throw mapCreateError(null, 'RPC khÃ´ng tráº£ vá» mÃ£ couple há»£p lá»‡')
      }

      let copied = false
      try {
        await navigator.clipboard.writeText(newCode)
        copied = true
      } catch {
        copied = false
      }

      setLatestRotatedCode(newCode)
      applyCoupleState({
        status: 'active',
        coupleId: coupleState.coupleId,
        code: newCode,
        isOwner: true
      })
      emitCoupleChangedEvent('rotate')
      void loadCreatedCouplesHistory()

      void loadCoupleState({ expectedCoupleId: coupleState.coupleId })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Äá»•i mÃ£ thÃ nh cÃ´ng',
          message: copied ? `MÃ£ má»›i: ${newCode} (Ä‘Ã£ copy)` : `MÃ£ má»›i: ${newCode}`
        })
      )
    } catch (error) {
      const rotateError = mapCreateError(error, 'KhÃ´ng thá»ƒ Ä‘á»•i mÃ£ couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Äá»•i mÃ£ tháº¥t báº¡i',
          message: `${rotateError.message} (${rotateError.code})`
        })
      )
    } finally {
      setIsRotatingCoupleCode(false)
    }
  }

  if (coupleState.status === 'loading' && !loadError) {
    return (
      <section className="container mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">Äang táº£i tráº¡ng thÃ¡i couple...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Thiáº¿t láº­p couple</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          ÄÄƒng nháº­p: <span className="font-medium">{email || 'khÃ´ng rÃµ'}</span>
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          CÃ³ access_token trong phiÃªn: {String(hasAccessToken)}
        </p>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/80">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Tráº¡ng thÃ¡i:{' '}
            <span className={`font-semibold ${statusTextClass}`}>
              {coupleState.status === 'active'
                ? 'ÄÃ£ ghÃ©p Ä‘Ã´i'
                : coupleState.status === 'none'
                  ? 'ChÆ°a ghÃ©p Ä‘Ã´i'
                  : 'Lá»—i táº£i tráº¡ng thÃ¡i'}
            </span>
          </p>
          {activeCouple ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-200">
                MÃ£ couple: <span className={`font-semibold ${statusTextClass}`}>{activeCouple.code}</span>
              </span>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(activeCouple.code)}
                className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-200 dark:hover:bg-gray-700"
              >
                Sao chÃ©p mÃ£
              </button>
            </div>
          ) : null}
        </div>

        {loadError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/15 dark:text-red-200">
            {loadError}
          </div>
        ) : null}

        {isDev ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200">
            <p className="font-semibold">Báº£ng debug (chá»‰ hiá»‡n á»Ÿ mÃ´i trÆ°á»ng dev)</p>
            <p className="mt-2">whoami uid: {whoamiInfo.uid ?? '-'}</p>
            <p>whoami role: {whoamiInfo.role ?? '-'}</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(
                {
                  userId: debugUserId,
                  whoami: whoamiDebug,
                  myCoupleRpc: myCoupleDebug,
                  createCoupleRpc: createCoupleDebug
                },
                null,
                2
              )}
            </pre>
          </div>
        ) : null}

        {activeCouple ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-xs text-gray-600 dark:text-gray-300">ID couple: {activeCouple.coupleId}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onLeaveCouple}
                disabled={isBusy}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {isLeavingCouple ? 'Äang rá»i...' : 'Rá»i couple'}
              </button>

              <button
                type="button"
                onClick={activeCouple.isOwner ? onRotateCoupleCode : undefined}
                title={activeCouple.isOwner ? 'Äá»•i mÃ£ couple' : 'Chá»‰ ngÆ°á»i táº¡o couple má»›i Ä‘á»•i mÃ£'}
                disabled={!activeCouple.isOwner || isBusy}
                className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/20"
              >
                {isRotatingCoupleCode ? 'Äang Ä‘á»•i mÃ£...' : 'Äá»•i mÃ£ couple'}
              </button>

              {activeCouple.isOwner ? (
                <button
                  type="button"
                  onClick={onDeleteCouple}
                  disabled={isBusy}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingCouple ? 'Äang xÃ³a...' : 'XÃ³a couple'}
                </button>
              ) : null}
            </div>
            {latestRotatedCode ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span>MÃ£ má»›i: {latestRotatedCode}</span>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(latestRotatedCode)}
                  className="rounded-md border border-gray-300 px-2 py-1 font-medium text-gray-700 transition hover:bg-white dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Sao chÃ©p
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {authUser.id ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-800/60 dark:bg-amber-900/10">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Äáº·t láº¡i couple (xÃ³a vÃ  táº¡o má»›i)
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Náº¿u báº¡n lÃ  owner, reset sáº½ xÃ³a toÃ n bá»™ dá»¯ liá»‡u chia sáº» cá»§a couple hiá»‡n táº¡i.
            </p>
            <button
              type="button"
              onClick={onResetCouple}
              disabled={isBusy}
              className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResettingCouple ? 'Äang Ä‘áº·t láº¡i...' : 'Äáº·t láº¡i couple'}
            </button>
          </div>
        ) : null}

        {coupleState.status === 'active' ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/10 dark:text-emerald-200">
            Báº¡n Ä‘Ã£ cÃ³ couple. NÃºt táº¡o/tham gia sáº½ khÃ³a cho tá»›i khi báº¡n rá»i hoáº·c Ä‘áº·t láº¡i couple.
          </div>
        ) : null}

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Couple mÃ¬nh Ä‘Ã£ tá»«ng táº¡o</h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Danh sÃ¡ch cÃ¡c couple do báº¡n táº¡o vÃ  chÆ°a bá»‹ xÃ³a.
          </p>

          {historyLoading ? (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Äang táº£i lá»‹ch sá»­...</p>
          ) : createdCouplesHistory.length < 1 ? (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Báº¡n chÆ°a cÃ³ couple nÃ o Ä‘Ã£ táº¡o (hoáº·c Ä‘Ã£ bá»‹ xÃ³a háº¿t).
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {createdCouplesHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">MÃ£: {item.code}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Táº¡o lÃºc:{' '}
                      {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : 'khÃ´ng rÃµ'} Â· ThÃ nh viÃªn:{' '}
                      {item.memberCount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Táº¡o couple má»›i</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Há»‡ thá»‘ng sáº½ táº¡o má»™t mÃ£ 6 kÃ½ tá»± Ä‘á»ƒ báº¡n chia sáº» vá»›i ngÆ°á»i kia.
            </p>
            <button
              type="button"
              onClick={onCreateCouple}
              disabled={isBusy || coupleState.status === 'active'}
              className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300 disabled:text-white/90"
            >
              {isSubmitting ? 'Äang xá»­ lÃ½...' : 'Táº¡o mÃ£ couple'}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tham gia báº±ng mÃ£</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Nháº­p mÃ£ 6 kÃ½ tá»± Ä‘á»ƒ tham gia couple hiá»‡n cÃ³.
            </p>

            <form className="mt-4 space-y-3" onSubmit={onJoinCouple}>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none ring-sky-400 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="VD: A9K2QX"
                maxLength={12}
                disabled={isBusy || coupleState.status === 'active'}
              />
              <button
                type="submit"
                disabled={isBusy || coupleState.status === 'active'}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-500 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                {isSubmitting ? 'Äang xá»­ lÃ½...' : 'Tham gia couple'}
              </button>
            </form>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadCoupleState()}
          disabled={isRefreshing || isBusy}
          className="mt-6 text-sm font-medium text-sky-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 dark:text-sky-300"
        >
          {isRefreshing ? 'Äang lÃ m má»›i...' : 'LÃ m má»›i tráº¡ng thÃ¡i tá»« server'}
        </button>
      </div>
    </section>
  )
}

