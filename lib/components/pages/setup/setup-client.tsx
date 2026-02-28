'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
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

interface QueryDebugState {
  data: unknown
  rawType: string
  normalizedCoupleId: string | null
  error: {
    code: string | null
    message: string | null
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
      code: candidate.code ?? 'unknown',
      details: candidate.details ?? null,
      hint: candidate.hint ?? null
    }
  }

  return {
    message: fallbackMessage,
    code: 'unknown',
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

export function SetupClient({ initialEmail, initialCouple }: SetupClientProps) {
  const router = useRouter()
  const dispatch = useDispatch()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
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
  const [joinCode, setJoinCode] = useState('')
  const [latestRotatedCode, setLatestRotatedCode] = useState<string | null>(null)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLeavingCouple, setIsLeavingCouple] = useState(false)
  const [isDeletingCouple, setIsDeletingCouple] = useState(false)
  const [isResettingCouple, setIsResettingCouple] = useState(false)
  const [isRotatingCoupleCode, setIsRotatingCoupleCode] = useState(false)

  const activeCouple = coupleState.status === 'active' ? coupleState : null
  const isBusy =
    isSubmitting ||
    isLeavingCouple ||
    isDeletingCouple ||
    isResettingCouple ||
    isRotatingCoupleCode

  const applyCoupleState = useCallback((next: CoupleState) => {
    setCoupleState((current) => (isSameCoupleState(current, next) ? current : next))
  }, [])

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
        setLoadError('Supabase env is missing')
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

        const { data: myCoupleData, error: myCoupleError } = await supabase.rpc('get_my_couple')
        logGetMyCoupleRawOnce('setup/loadCoupleState', myCoupleData)
        const normalizedMyCouple = normalizeRpcRow(myCoupleData)
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
        const loadStateError = mapCreateError(error, 'Unable to load couple state')
        console.error('[setup/loadCoupleState] failed:', loadStateError)
        setLoadError(`${loadStateError.message}${loadStateError.code ? ` (${loadStateError.code})` : ''}`)
        return null
      } finally {
        setIsRefreshing(false)
      }
    },
    [applyCoupleState, initialEmail, supabase]
  )

  useEffect(() => {
    void loadCoupleState({ initial: true })
  }, [loadCoupleState])

  const onCreateCouple = async () => {
    try {
      setIsSubmitting(true)

      if (!supabase) {
        throw mapCreateError(null, 'Supabase env is missing')
      }

      if (coupleState.status === 'active') {
        dispatch(
          setAlert({
            type: 'info',
            title: 'Thông tin',
            message: 'Bạn đã có couple.'
          })
        )
        return
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw mapCreateError(userError, 'Unauthorized')
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw mapCreateError(sessionError, 'Unable to load auth session')
      }

      if (!sessionData.session?.access_token) {
        throw mapCreateError(
          {
            code: 'missing_access_token',
            message: 'Missing access token in Supabase session',
            details: 'supabase.auth.getSession() returned no access_token',
            hint: 'Login again before creating a couple.'
          },
          'Missing access token in Supabase session'
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

        if (error) {
          lastCreateError = mapCreateError(error, 'Unable to create couple')
          continue
        }

        const parsed = parseCreatedCouple(data)
        if (!parsed) {
          lastCreateError = mapCreateError(
            {
              code: 'invalid_rpc_payload',
              message: 'create_couple did not return {id, code}',
              details: JSON.stringify(data ?? null),
              hint: 'Ensure RPC create_couple returns a single row/object with id and code.'
            },
            'Unable to parse create_couple result'
          )
          continue
        }

        createdCouple = parsed
        break
      }

      if (!createdCouple) {
        throw lastCreateError ?? mapCreateError(null, 'Unable to create couple')
      }

      applyCoupleState({
        status: 'active',
        coupleId: createdCouple.id,
        code: createdCouple.code,
        isOwner: true
      })
      setLatestRotatedCode(null)

      void loadCoupleState({ expectedCoupleId: createdCouple.id })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Tạo couple thành công',
          message: `Mã couple của bạn là ${createdCouple.code}`
        })
      )
    } catch (error) {
      const createError = mapCreateError(error, 'Unable to create couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Create failed',
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
          title: 'Missing code',
          message: 'Vui lòng nhập mã ghép đôi.'
        })
      )
      return
    }

    try {
      setIsSubmitting(true)

      if (!supabase) {
        throw mapCreateError(null, 'Supabase env is missing')
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw mapCreateError(userError, 'Unable to resolve current user for join flow')
      }

      const { data, error } = await supabase.rpc('join_by_code', { p_code: code })
      if (error) {
        const joinError = mapCreateError(error, 'Unable to join couple')
        const invalidCode =
          joinError.code === 'P0001' || /invalid|not found|khong ton tai|ma/i.test(joinError.message)

        throw new Error(
          invalidCode
            ? 'Mã couple không hợp lệ. Vui lòng kiểm tra lại.'
            : `${joinError.message} (${joinError.code})`
        )
      }

      const joinedCoupleId = parseJoinedCoupleId(data)
      if (!joinedCoupleId) {
        throw new Error('Mã couple không hợp lệ. Vui lòng kiểm tra lại.')
      }

      setJoinCode('')
      void loadCoupleState({ expectedCoupleId: joinedCoupleId })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Join thành công',
          message: 'Đã tham gia couple thành công.'
        })
      )
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Join failed',
          message: error instanceof Error ? error.message : 'Unable to join couple'
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
        throw mapCreateError(null, 'Supabase env is missing')
      }

      const { error } = await supabase.rpc('leave_couple', { p_couple_id: coupleState.coupleId })
      if (error) {
        throw mapCreateError(error, 'Unable to leave couple')
      }

      applyCoupleState({ status: 'none' })
      setLatestRotatedCode(null)
      void loadCoupleState()

      dispatch(
        setAlert({
          type: 'success',
          title: 'Leave successful',
          message: 'Bạn đã rời couple.'
        })
      )
    } catch (error) {
      const leaveError = mapCreateError(error, 'Unable to leave couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Leave failed',
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
      'XÓA COUPLE sẽ xóa dữ liệu liên quan. Hành động này KHÔNG THỂ HOÀN TÁC. Bạn chắc chắn?'
    )
    if (!confirmed) {
      return
    }

    try {
      setIsDeletingCouple(true)

      if (!supabase) {
        throw mapCreateError(null, 'Supabase env is missing')
      }

      const { error } = await supabase.rpc('delete_my_couple', { p_couple_id: coupleState.coupleId })
      if (error) {
        throw mapCreateError(error, 'Unable to delete couple')
      }

      applyCoupleState({ status: 'none' })
      setLatestRotatedCode(null)
      void loadCoupleState()

      dispatch(
        setAlert({
          type: 'success',
          title: 'Delete successful',
          message: 'Couple đã được xóa.'
        })
      )
      router.replace('/setup')
      router.refresh()
    } catch (error) {
      const deleteError = mapCreateError(error, 'Unable to delete couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Delete failed',
          message: `${deleteError.message} (${deleteError.code})`
        })
      )
    } finally {
      setIsDeletingCouple(false)
    }
  }

  const onResetCouple = async () => {
    if (!supabase) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Reset failed',
          message: 'Supabase env is missing'
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
        throw mapCreateError(userError, 'Unauthorized')
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw mapCreateError(sessionError, 'Unable to load auth session')
      }

      if (!sessionData.session?.access_token) {
        throw new Error('Bạn cần đăng nhập lại để reset couple.')
      }

      if (coupleState.status === 'active') {
        if (coupleState.isOwner) {
          const confirmDelete = window.confirm(
            'CẢNH BÁO: Reset khi bạn là owner sẽ xóa toàn bộ dữ liệu chung của couple hiện tại. Tiếp tục?'
          )
          if (!confirmDelete) {
            return
          }

          const { error: deleteError } = await supabase.rpc('delete_my_couple', {
            p_couple_id: coupleState.coupleId
          })
          if (deleteError) {
            throw mapCreateError(deleteError, 'Unable to delete current couple')
          }
        } else {
          const confirmLeave = window.confirm('Bạn sẽ rời couple hiện tại và tạo couple mới. Tiếp tục?')
          if (!confirmLeave) {
            return
          }

          const { error: leaveError } = await supabase.rpc('leave_couple', {
            p_couple_id: coupleState.coupleId
          })
          if (leaveError) {
            throw mapCreateError(leaveError, 'Unable to leave current couple')
          }
        }
      }

      let createdCouple: CouplePayload | null = null
      let lastCreateError: CreateDiagnosticsError | null = null

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateCoupleCode()
        const { data, error } = await supabase.rpc('create_couple', { p_code: code })
        if (error) {
          lastCreateError = mapCreateError(error, 'Unable to create replacement couple')
          continue
        }

        const parsed = parseCreatedCouple(data)
        if (!parsed) {
          lastCreateError = mapCreateError(
            {
              code: 'invalid_rpc_payload',
              message: 'create_couple did not return {id, code}',
              details: JSON.stringify(data ?? null),
              hint: 'Ensure RPC create_couple returns a single row/object with id and code.'
            },
            'Unable to parse create_couple result'
          )
          continue
        }

        createdCouple = parsed
        break
      }

      if (!createdCouple) {
        throw lastCreateError ?? mapCreateError(null, 'Unable to create replacement couple')
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
      setLatestRotatedCode(null)

      void loadCoupleState({ expectedCoupleId: createdCouple.id })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Reset completed',
          message: copied ? `Couple mới: ${createdCouple.code} (đã copy)` : `Couple mới: ${createdCouple.code}`
        })
      )
    } catch (error) {
      const resetError = mapCreateError(error, 'Unable to reset couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Reset failed',
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
          title: 'Not allowed',
          message: 'Chỉ người tạo couple mới đổi mã.'
        })
      )
      return
    }

    const confirmed = window.confirm(
      'Đổi mã couple? Mã cũ sẽ KHÔNG còn hợp lệ. Dữ liệu chung vẫn được giữ nguyên.'
    )
    if (!confirmed) {
      return
    }

    try {
      setIsRotatingCoupleCode(true)
      if (!supabase) {
        throw mapCreateError(null, 'Supabase env is missing')
      }

      const { data, error } = await supabase.rpc('rotate_couple_code', { p_couple_id: coupleState.coupleId })
      if (error) {
        throw mapCreateError(error, 'Unable to rotate couple code')
      }

      const newCode = parseRotatedCoupleCode(data)
      if (!newCode) {
        throw mapCreateError(null, 'RPC did not return a valid couple code')
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

      void loadCoupleState({ expectedCoupleId: coupleState.coupleId })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Code updated',
          message: copied ? `Mã mới: ${newCode} (đã copy)` : `Mã mới: ${newCode}`
        })
      )
    } catch (error) {
      const rotateError = mapCreateError(error, 'Unable to rotate couple code')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Rotate failed',
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
        <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">Đang tải trạng thái couple...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Couple Setup</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Đăng nhập: <span className="font-medium">{email || 'unknown'}</span>
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Session access_token: {String(hasAccessToken)}
        </p>

        <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50/70 p-4 dark:border-rose-900/40 dark:bg-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Trạng thái:{' '}
            <span className="font-semibold text-rose-700 dark:text-rose-200">
              {coupleState.status === 'active'
                ? 'Đã ghép đôi'
                : coupleState.status === 'none'
                  ? 'Chưa ghép đôi'
                  : 'Lỗi tải trạng thái'}
            </span>
          </p>
          {activeCouple ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-200">
                Mã couple: <span className="font-semibold text-rose-700 dark:text-rose-200">{activeCouple.code}</span>
              </span>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(activeCouple.code)}
                className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-800 dark:bg-gray-900 dark:text-rose-200 dark:hover:bg-gray-700"
              >
                Copy mã
              </button>
            </div>
          ) : null}
        </div>

        {loadError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/15 dark:text-red-200">
            {loadError}
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200">
          <p className="font-semibold">Debug</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(
              {
                userId: debugUserId,
                whoami: whoamiDebug,
                myCoupleRpc: myCoupleDebug
              },
              null,
              2
            )}
          </pre>
        </div>

        {activeCouple ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-xs text-gray-600 dark:text-gray-300">Couple ID: {activeCouple.coupleId}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onLeaveCouple}
                disabled={isBusy}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {isLeavingCouple ? 'Đang rời...' : 'Rời couple'}
              </button>

              <button
                type="button"
                onClick={activeCouple.isOwner ? onRotateCoupleCode : undefined}
                title={activeCouple.isOwner ? 'Đổi mã couple' : 'Chỉ người tạo couple mới đổi mã'}
                disabled={!activeCouple.isOwner || isBusy}
                className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/20"
              >
                {isRotatingCoupleCode ? 'Đang đổi mã...' : 'Đổi mã couple'}
              </button>

              {activeCouple.isOwner ? (
                <button
                  type="button"
                  onClick={onDeleteCouple}
                  disabled={isBusy}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingCouple ? 'Đang xóa...' : 'Xóa couple'}
                </button>
              ) : null}
            </div>
            {latestRotatedCode ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span>Mã mới: {latestRotatedCode}</span>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(latestRotatedCode)}
                  className="rounded-md border border-gray-300 px-2 py-1 font-medium text-gray-700 transition hover:bg-white dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Copy
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {authUser.id ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-800/60 dark:bg-amber-900/10">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Reset Couple (delete and recreate)
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Nếu bạn là owner, reset sẽ xóa toàn bộ dữ liệu chia sẻ của couple hiện tại.
            </p>
            <button
              type="button"
              onClick={onResetCouple}
              disabled={isBusy}
              className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResettingCouple ? 'Đang reset...' : 'Reset couple'}
            </button>
          </div>
        ) : null}

        {coupleState.status === 'active' ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/10 dark:text-emerald-200">
            Bạn đã có couple. Nút tạo/join được khóa cho tới khi bạn rời hoặc reset couple.
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tạo couple mới</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Hệ thống sẽ tạo một mã 6 ký tự để bạn chia sẻ với người kia.
            </p>
            <button
              type="button"
              onClick={onCreateCouple}
              disabled={isBusy || coupleState.status === 'active'}
              className="mt-4 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Tạo mã couple'}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Join bằng mã</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Nhập mã 6 ký tự để tham gia couple hiện có.
            </p>

            <form className="mt-4 space-y-3" onSubmit={onJoinCouple}>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none ring-rose-200 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="VD: A9K2QX"
                maxLength={12}
                disabled={isBusy || coupleState.status === 'active'}
              />
              <button
                type="submit"
                disabled={isBusy || coupleState.status === 'active'}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-500 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Join couple'}
              </button>
            </form>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadCoupleState()}
          disabled={isRefreshing || isBusy}
          className="mt-6 text-sm font-medium text-rose-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 dark:text-rose-300"
        >
          {isRefreshing ? 'Refreshing...' : 'Làm mới trạng thái từ server'}
        </button>
      </div>
    </section>
  )
}
