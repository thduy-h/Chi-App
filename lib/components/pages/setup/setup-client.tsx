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
      code: candidate.code ?? 'không rõ',
      details: candidate.details ?? null,
      hint: candidate.hint ?? null
    }
  }

  return {
    message: fallbackMessage,
    code: 'không rõ',
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
  const canResetCouple = coupleState.status === 'active' && coupleState.isOwner
  const resetDisabled = isBusy || !canResetCouple
  const resetTitle = canResetCouple
    ? 'Đặt lại couple'
    : coupleState.status !== 'active'
      ? 'Chỉ khả dụng khi bạn đang tham gia couple'
      : 'Chỉ owner mới có thể đặt lại couple'
  const statusTextClass =
    coupleState.status === 'active'
      ? 'text-emerald-700 dark:text-emerald-300'
      : coupleState.status === 'none'
        ? 'text-rose-600 dark:text-rose-300'
        : 'text-red-700 dark:text-red-300'

  const applyCoupleState = useCallback((next: CoupleState) => {
    setCoupleState((current) => (isSameCoupleState(current, next) ? current : next))
  }, [])

  const loadCreatedCouplesHistory = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent)
    try {
      if (!silent) {
        setHistoryLoading(true)
      }
      const response = await fetch('/api/couple/history', { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as {
        history?: CreatedCoupleHistoryItem[]
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể tải lịch sử couple đã tạo.')
      }

      setCreatedCouplesHistory(Array.isArray(payload.history) ? payload.history : [])
    } catch (error) {
      if (!silent) {
        setCreatedCouplesHistory([])
        dispatch(
          setAlert({
            type: 'warning',
            title: 'Không tải được lịch sử couple',
            message: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
          })
        )
      }
    } finally {
      if (!silent) {
        setHistoryLoading(false)
      }
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
        setLoadError('Thiếu cấu hình Supabase')
        return null
      }

      try {
        setIsRefreshing(true)

        const { data: userData, error: userError } = await supabase.auth.getUser()

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
        const loadStateError = mapCreateError(error, 'Không thể tải trạng thái couple')
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
    if (!authUser.id) {
      return
    }

    const timer = window.setInterval(() => {
      void loadCreatedCouplesHistory({ silent: true })
    }, 15000)

    return () => {
      window.clearInterval(timer)
    }
  }, [authUser.id, loadCreatedCouplesHistory])

  useEffect(() => {
    const handleWindowFocus = () => {
      void loadCreatedCouplesHistory({ silent: true })
    }

    window.addEventListener('focus', handleWindowFocus)
    return () => {
      window.removeEventListener('focus', handleWindowFocus)
    }
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
        throw mapCreateError(null, 'Thiếu cấu hình Supabase')
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
        throw mapCreateError(userError, 'Chưa đăng nhập')
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw mapCreateError(sessionError, 'Không thể tải phiên đăng nhập')
      }

      if (!sessionData.session?.access_token) {
        throw mapCreateError(
          {
            code: 'missing_access_token',
            message: 'Không có access token trong phiên Supabase',
            details: 'supabase.auth.getSession() returned no access_token',
            hint: 'Hãy đăng nhập lại trước khi tạo couple.'
          },
          'Không có access token trong phiên Supabase'
        )
      }

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
          lastCreateError = mapCreateError(error, 'Không thể tạo couple')
          continue
        }

        if (!parsed) {
          lastCreateError = mapCreateError(
            {
              code: 'invalid_rpc_payload',
              message: 'create_couple did not return {id, code}',
              details: JSON.stringify(data ?? null),
              hint: 'Đảm bảo RPC create_couple trả về đúng một object có id và code.'
            },
            'Không thể đọc kết quả create_couple'
          )
          continue
        }

        createdCouple = parsed
        break
      }

      if (!createdCouple) {
        throw lastCreateError ?? mapCreateError(null, 'Không thể tạo couple')
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
          'Tạo couple thành công nhưng chưa ghép vào couple. Vui lòng bấm làm mới hoặc Reset.'
        setLoadError(blockingMessage)
        applyCoupleState({ status: 'none' })
        dispatch(
          setAlert({
            type: 'error',
            title: 'Cần xử lý thêm',
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
          title: 'Tạo couple thành công',
          message: `Mã couple của bạn là ${createdCouple.code}`
        })
      )
    } catch (error) {
      const createError = mapCreateError(error, 'Không thể tạo couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Tạo couple thất bại',
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
          title: 'Thiếu mã',
          message: 'Vui lòng nhập mã ghép đôi.'
        })
      )
      return
    }

    try {
      setIsSubmitting(true)

      if (!supabase) {
        throw mapCreateError(null, 'Thiếu cấu hình Supabase')
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw mapCreateError(userError, 'Không thể xác định người dùng hiện tại')
      }

      const { data, error } = await supabase.rpc('join_by_code', { p_code: code })
      if (error) {
        const joinError = mapCreateError(error, 'Không thể tham gia couple')
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
      emitCoupleChangedEvent('join')
      void loadCreatedCouplesHistory({ silent: true })
      void loadCoupleState({ expectedCoupleId: joinedCoupleId })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Tham gia thành công',
          message: 'Đã tham gia couple thành công.'
        })
      )
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Tham gia thất bại',
          message: error instanceof Error ? error.message : 'Không thể tham gia couple'
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
        throw mapCreateError(null, 'Thiếu cấu hình Supabase')
      }

      const { error } = await supabase.rpc('leave_couple', { p_couple_id: coupleState.coupleId })
      if (error) {
        throw mapCreateError(error, 'Không thể rời couple')
      }

      applyCoupleState({ status: 'none' })
      emitCoupleChangedEvent('leave')
      setLatestRotatedCode(null)
      void loadCreatedCouplesHistory()
      void loadCoupleState()

      dispatch(
        setAlert({
          type: 'success',
          title: 'Rời couple thành công',
          message: 'Bạn đã rời couple.'
        })
      )
    } catch (error) {
      const leaveError = mapCreateError(error, 'Không thể rời couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Rời couple thất bại',
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
        throw mapCreateError(null, 'Thiếu cấu hình Supabase')
      }

      const { error } = await supabase.rpc('delete_my_couple', { p_couple_id: coupleState.coupleId })
      if (error) {
        throw mapCreateError(error, 'Không thể xóa couple')
      }

      applyCoupleState({ status: 'none' })
      emitCoupleChangedEvent('delete')
      setLatestRotatedCode(null)
      void loadCreatedCouplesHistory()
      void loadCoupleState()

      dispatch(
        setAlert({
          type: 'success',
          title: 'Xóa couple thành công',
          message: 'Couple đã được xóa.'
        })
      )
      router.replace('/setup')
      router.refresh()
    } catch (error) {
      const deleteError = mapCreateError(error, 'Không thể xóa couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Xóa couple thất bại',
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
          title: 'Không thể xoá',
          message: 'Couple này đang tham gia. Vui lòng rời hoặc xoá bằng nút trong khung quản lý couple.'
        })
      )
      return
    }

    const confirmed = window.confirm(
      `Xoá vĩnh viễn couple ${item.code}? Hành động này không thể hoàn tác.`
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
        throw new Error(payload.error || 'Không thể xoá couple đã rời.')
      }

      setCreatedCouplesHistory((previous) => previous.filter((entry) => entry.id !== item.id))
      dispatch(
        setAlert({
          type: 'success',
          title: 'Đã xoá couple',
          message: `Đã xoá couple ${item.code}.`
        })
      )
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Xoá thất bại',
          message: error instanceof Error ? error.message : 'Không thể xoá couple đã rời.'
        })
      )
    } finally {
      setDeletingHistoryCoupleId(null)
    }
  }

  const onResetCouple = async () => {
    if (coupleState.status !== 'active' || !coupleState.isOwner) {
      dispatch(
        setAlert({
          type: 'info',
          title: 'Không khả dụng',
          message: 'Chỉ owner đang tham gia couple mới có thể đặt lại couple.'
        })
      )
      return
    }

    if (!supabase) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Đặt lại thất bại',
          message: 'Thiếu cấu hình Supabase'
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
        throw mapCreateError(userError, 'Chưa đăng nhập')
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw mapCreateError(sessionError, 'Không thể tải phiên đăng nhập')
      }

      if (!sessionData.session?.access_token) {
        throw new Error('Bạn cần đăng nhập lại để reset couple.')
      }

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
        throw mapCreateError(deleteError, 'Không thể xóa couple hiện tại')
      }

      let createdCouple: CouplePayload | null = null
      let lastCreateError: CreateDiagnosticsError | null = null

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateCoupleCode()
        const { data, error } = await supabase.rpc('create_couple', { p_code: code })
        if (error) {
          lastCreateError = mapCreateError(error, 'Không thể tạo couple mới')
          continue
        }

        const parsed = parseCreatedCouple(data)
        if (!parsed) {
          lastCreateError = mapCreateError(
            {
              code: 'invalid_rpc_payload',
              message: 'create_couple did not return {id, code}',
              details: JSON.stringify(data ?? null),
              hint: 'Đảm bảo RPC create_couple trả về đúng một object có id và code.'
            },
            'Không thể đọc kết quả create_couple'
          )
          continue
        }

        createdCouple = parsed
        break
      }

      if (!createdCouple) {
        throw lastCreateError ?? mapCreateError(null, 'Không thể tạo couple mới')
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
          title: 'Đặt lại thành công',
          message: copied ? `Couple mới: ${createdCouple.code} (đã copy)` : `Couple mới: ${createdCouple.code}`
        })
      )
    } catch (error) {
      const resetError = mapCreateError(error, 'Không thể đặt lại couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Đặt lại thất bại',
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
          title: 'Không có quyền',
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
        throw mapCreateError(null, 'Thiếu cấu hình Supabase')
      }

      const { data, error } = await supabase.rpc('rotate_couple_code', { p_couple_id: coupleState.coupleId })
      if (error) {
        throw mapCreateError(error, 'Không thể đổi mã couple')
      }

      const newCode = parseRotatedCoupleCode(data)
      if (!newCode) {
        throw mapCreateError(null, 'RPC không trả về mã couple hợp lệ')
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
          title: 'Đổi mã thành công',
          message: copied ? `Mã mới: ${newCode} (đã copy)` : `Mã mới: ${newCode}`
        })
      )
    } catch (error) {
      const rotateError = mapCreateError(error, 'Không thể đổi mã couple')
      dispatch(
        setAlert({
          type: 'error',
          title: 'Đổi mã thất bại',
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
          <p className="text-sm text-gray-600 dark:text-gray-300">Đang tải trạng thái couple...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Thiết lập couple</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Đăng nhập: <span className="font-medium">{email || 'không rõ'}</span>
        </p>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/80">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Trạng thái:{' '}
            <span className={`font-semibold ${statusTextClass}`}>
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
                Mã couple: <span className={`font-semibold ${statusTextClass}`}>{activeCouple.code}</span>
              </span>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(activeCouple.code)}
                className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-200 dark:hover:bg-gray-700"
              >
                Sao chép mã
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
            <p className="font-semibold">Bảng debug (chỉ hiện ở môi trường dev)</p>
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
                {isLeavingCouple ? 'Đang rời...' : 'Rời couple'}
              </button>

              <button
                type="button"
                onClick={activeCouple.isOwner ? onRotateCoupleCode : undefined}
                title={activeCouple.isOwner ? 'Đổi mã couple' : 'Chỉ người tạo couple mới đổi mã'}
                disabled={!activeCouple.isOwner || isBusy}
                className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
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
                  Sao chép
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {authUser.id ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-800/60 dark:bg-amber-900/10">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Đặt lại couple (xóa và tạo mới)
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Chỉ owner đang tham gia mới có thể đặt lại couple. Khi reset, dữ liệu chia sẻ của couple hiện tại sẽ bị xóa.
            </p>
            <button
              type="button"
              onClick={onResetCouple}
              title={resetTitle}
              disabled={resetDisabled}
              className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300 disabled:text-white/85 dark:disabled:bg-amber-900/40 dark:disabled:text-amber-200/70"
            >
              {isResettingCouple ? 'Đang đặt lại...' : 'Đặt lại couple'}
            </button>
          </div>
        ) : null}

        {coupleState.status === 'active' ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/10 dark:text-emerald-200">
            Bạn đã có couple. Nút tạo/tham gia sẽ khóa cho tới khi bạn rời hoặc đặt lại couple.
          </div>
        ) : null}

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Couple mình đã từng tạo</h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Danh sách các couple do bạn tạo và chưa bị xóa.
          </p>

          {historyLoading ? (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Đang tải lịch sử...</p>
          ) : createdCouplesHistory.length < 1 ? (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Bạn chưa có couple nào đã tạo (hoặc đã bị xóa hết).
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {createdCouplesHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Mã: {item.code}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tạo lúc:{' '}
                      {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : 'không rõ'} · Thành viên:{' '}
                      {item.memberCount}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        item.isCurrentMember
                          ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300'
                          : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {item.isCurrentMember ? 'Đang tham gia' : 'Đã rời'}
                    </span>
                    {!item.isCurrentMember ? (
                      <button
                        type="button"
                        onClick={() => void onDeleteCreatedCouple(item)}
                        disabled={deletingHistoryCoupleId === item.id}
                        className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        {deletingHistoryCoupleId === item.id ? 'Đang xoá...' : 'Xoá'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
              className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300 disabled:text-white/90"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Tạo mã couple'}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tham gia bằng mã</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Nhập mã 6 ký tự để tham gia couple hiện có.
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
                {isSubmitting ? 'Đang xử lý...' : 'Tham gia couple'}
              </button>
            </form>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadCoupleState()
            void loadCreatedCouplesHistory({ silent: true })
          }}
          disabled={isRefreshing || isBusy}
          className="mt-6 text-sm font-semibold text-rose-600 transition hover:underline disabled:cursor-not-allowed disabled:text-gray-400 dark:text-rose-300"
        >
          {isRefreshing ? 'Đang làm mới...' : 'Làm mới trạng thái từ server'}
        </button>
      </div>
    </section>
  )
}


