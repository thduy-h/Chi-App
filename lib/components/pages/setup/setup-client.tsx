'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  cacheActiveCouple,
  clearActiveCoupleCache,
  generateCoupleCode,
  getCurrentCoupleContext,
  normalizeCoupleCode,
  readActiveCoupleCache,
  selectCoupleById
} from '@/lib/supabase/couples'

interface CouplePayload {
  id: string
  code: string
}

interface SetupClientProps {
  initialEmail: string
  initialCouple: CouplePayload | null
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

export function SetupClient({ initialEmail, initialCouple }: SetupClientProps) {
  const router = useRouter()
  const dispatch = useDispatch()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [email, setEmail] = useState(initialEmail)
  const [activeCouple, setActiveCouple] = useState<CouplePayload | null>(initialCouple)
  const [joinCode, setJoinCode] = useState('')
  const [source, setSource] = useState<'server' | 'cache'>('server')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authUser, setAuthUser] = useState<{ id: string | null; email: string | null }>({
    id: null,
    email: initialEmail || null
  })
  const [hasAccessToken, setHasAccessToken] = useState(false)
  const [isCoupleOwner, setIsCoupleOwner] = useState(false)
  const [isLeavingCouple, setIsLeavingCouple] = useState(false)
  const [isDeletingCouple, setIsDeletingCouple] = useState(false)
  const [isResettingCouple, setIsResettingCouple] = useState(false)
  const [isRotatingCoupleCode, setIsRotatingCoupleCode] = useState(false)
  const [latestRotatedCode, setLatestRotatedCode] = useState<string | null>(null)
  const [createWhoamiResult, setCreateWhoamiResult] = useState<string>('')
  const [recentCreatedCouple, setRecentCreatedCouple] = useState<CouplePayload | null>(null)

  const hasCouple = Boolean(activeCouple?.id && activeCouple?.code)
  const memberCoupleId = activeCouple?.id ?? null

  const loadCurrentCoupleContext = useCallback(async (options?: { initial?: boolean }) => {
    const isInitial = Boolean(options?.initial)
    if (isInitial) {
      setIsInitialLoading(true)
    }

    if (!supabase) {
      setActiveCouple(null)
      setIsCoupleOwner(false)
      if (isInitial) {
        setIsInitialLoading(false)
      }
      return
    }

    try {
      setIsRefreshing(true)
      const context = await getCurrentCoupleContext(supabase)

      setAuthUser({
        id: context.userId,
        email: context.userEmail
      })
      if (context.userEmail) {
        setEmail(context.userEmail)
      }

      if (context.status !== 'ready' || !context.coupleId || !context.coupleCode) {
        setActiveCouple(null)
        setRecentCreatedCouple(null)
        setIsCoupleOwner(false)
        clearActiveCoupleCache()
        setSource('server')
        return
      }

      const nextCouple = {
        id: context.coupleId,
        code: context.coupleCode
      }
      setActiveCouple(nextCouple)
      setIsCoupleOwner(context.isOwner)
      cacheActiveCouple(nextCouple)
      setSource('server')
    } catch {
      const cached = readActiveCoupleCache()
      if (cached) {
        setActiveCouple({
          id: cached.id,
          code: cached.code ?? 'unknown'
        })
        setSource('cache')
      } else {
        setActiveCouple(null)
        setRecentCreatedCouple(null)
        setSource('server')
      }
      setIsCoupleOwner(false)
    } finally {
      setIsRefreshing(false)
      if (isInitial) {
        setIsInitialLoading(false)
      }
    }
  }, [supabase])

  const refreshMembershipFromCoupleMembers = useCallback(
    async (userId: string) => {
      if (!supabase) {
        throw mapCreateError(null, 'Supabase env is missing')
      }

      const { data: membership, error: membershipError } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (membershipError) {
        throw mapCreateError(membershipError, 'Unable to refresh membership from couple_members')
      }

      if (!membership?.couple_id) {
        throw mapCreateError(
          {
            code: 'membership_missing',
            message: 'Join succeeded but no membership found',
            details: 'couple_members row for current user was not found after join',
            hint: 'Check RLS policy and RPC transaction behavior.'
          },
          'Unable to verify joined membership'
        )
      }

      return membership.couple_id
    },
    [supabase]
  )

  useEffect(() => {
    if (initialCouple) {
      cacheActiveCouple(initialCouple)
    }
    void loadCurrentCoupleContext({ initial: true })
  }, [initialCouple, loadCurrentCoupleContext])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    const loadDiagnostics = async () => {
      const [{ data: userData, error: userError }, { data: sessionData, error: sessionError }] =
        await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()])

      if (!isMounted) {
        return
      }

      if (userError) {
        const diagnosticsError = mapCreateError(userError, 'Unable to load auth user')
        console.error('[setup/diagnostics] getUser error:', diagnosticsError)
      }

      if (sessionError) {
        const diagnosticsError = mapCreateError(sessionError, 'Unable to load auth session')
        console.error('[setup/diagnostics] getSession error:', diagnosticsError)
      }

      const user = userData.user
      setAuthUser({
        id: user?.id ?? null,
        email: user?.email ?? (initialEmail || null)
      })
      setHasAccessToken(Boolean(sessionData.session?.access_token))

      if (user?.email) {
        setEmail(user.email)
      }

      if (user?.id) {
        console.debug(
          '[setup/diagnostics] create path:',
          'SetupClient.onCreateCouple -> createSupabaseBrowserClient -> rpc(create_couple)'
        )
        console.debug(
          '[setup/diagnostics] skipping public.couples diagnostics query until membership is confirmed'
        )
      }
    }

    void loadDiagnostics()

    return () => {
      isMounted = false
    }
  }, [initialEmail, supabase])

  const onCreateCouple = async () => {
    let whoamiSnapshot = ''
    try {
      setIsSubmitting(true)
      setCreateWhoamiResult('')
      const insertContextLabel = 'client-component:createSupabaseBrowserClient'
      const createPathLabel =
        'SetupClient.onCreateCouple -> createSupabaseBrowserClient -> rpc(create_couple)'

      if (!supabase) {
        throw mapCreateError(null, 'Supabase env is missing')
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
      let supabaseHostname = 'invalid-url'
      try {
        supabaseHostname = new URL(supabaseUrl).hostname
      } catch {
        supabaseHostname = 'invalid-url'
      }
      const maskedAnonKeyPreview = supabaseAnonKey ? `${supabaseAnonKey.slice(0, 20)}***` : 'missing'
      console.debug('[setup/create] supabase env check:', {
        hostname: supabaseHostname,
        anonKeyMaskedPrefix: maskedAnonKeyPreview
      })

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

      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
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

      console.debug('[setup/create] current user id:', user.id)
      console.debug('[setup/create] session access_token exists:', Boolean(sessionData.session?.access_token))
      console.debug('[setup/create] insert context label:', insertContextLabel)
      console.debug('[setup/create] path:', createPathLabel)

      setAuthUser((previous) => ({
        id: user.id,
        email: user.email ?? previous.email
      }))

      if (user.email) {
        setEmail(user.email)
      }

      if (activeCouple?.id && activeCouple?.code) {
        dispatch(
          setAlert({
            type: 'info',
            title: 'Da co couple',
            message: `Ma couple hien tai: ${activeCouple.code}`
          })
        )
        return
      }

      const { data: existingMembership, error: existingMembershipError } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (existingMembershipError) {
        throw mapCreateError(existingMembershipError, 'Unable to check existing membership')
      }

      if (existingMembership?.couple_id) {
        setRecentCreatedCouple(null)
        await loadCurrentCoupleContext()
        dispatch(
          setAlert({
            type: 'info',
            title: 'Da co couple',
            message: 'Ban da co couple dang hoat dong.'
          })
        )
        return
      }

      const { data: whoamiData, error: whoamiError } = await supabase.rpc('whoami')
      if (whoamiError) {
        const whoamiMappedError = mapCreateError(whoamiError, 'Unable to resolve whoami role')
        whoamiSnapshot = JSON.stringify(
          {
            error: {
              code: whoamiMappedError.code,
              message: whoamiMappedError.message,
              details: whoamiMappedError.details,
              hint: whoamiMappedError.hint
            }
          },
          null,
          2
        )
        console.error('[setup/create] whoami error:', {
          'error.code': whoamiMappedError.code,
          'error.message': whoamiMappedError.message,
          'error.details': whoamiMappedError.details,
          'error.hint': whoamiMappedError.hint
        })
      } else {
        whoamiSnapshot = JSON.stringify(whoamiData ?? null, null, 2)
        console.debug('[setup/create] whoami result:', whoamiData ?? null)
      }
      setCreateWhoamiResult(whoamiSnapshot)

      const code = generateCoupleCode()
      console.debug('[setup/create] couples insert context:', insertContextLabel)
      console.debug('[setup/create] insert target:', 'rpc:create_couple')
      const { data: createData, error: createError } = await supabase.rpc('create_couple', {
        p_code: code
      })
      if (createError) {
        const mappedCreateError = mapCreateError(createError, 'Unable to create couple')
        console.error('[setup/create] create_couple rpc error:', {
          'error.message': mappedCreateError.message,
          'error.code': mappedCreateError.code,
          'error.details': mappedCreateError.details,
          'error.hint': mappedCreateError.hint
        })
        throw mappedCreateError
      }

      const createdCouple = parseCreatedCouple(createData)
      if (!createdCouple) {
        throw mapCreateError(
          {
            code: 'invalid_rpc_payload',
            message: 'create_couple did not return {id, code}',
            details: JSON.stringify(createData ?? null),
            hint: 'Ensure RPC create_couple returns a single row/object with id and code.'
          },
          'Unable to parse create_couple result'
        )
      }

      console.debug('[setup/create] created couple row:', createdCouple)
      console.debug('[setup/create] couple insert success:', { coupleId: createdCouple.id })

      const { error: membershipCreateError } = await supabase
        .from('couple_members')
        .insert({ couple_id: createdCouple.id, user_id: user.id })

      if (membershipCreateError) {
        throw mapCreateError(membershipCreateError, 'Unable to create membership')
      }
      console.debug('[setup/create] membership insert success:', {
        coupleId: createdCouple.id,
        userId: user.id
      })

      setActiveCouple(createdCouple)
      setIsCoupleOwner(true)
      setLatestRotatedCode(createdCouple.code)
      setRecentCreatedCouple(createdCouple)
      cacheActiveCouple(createdCouple)
      setSource('server')
      dispatch(
        setAlert({
          type: 'success',
          title: 'Couple created',
          message: `Mã ghép đôi của bạn là ${createdCouple.code}`
        })
      )
    } catch (error) {
      const diagnosticsError = mapCreateError(error, 'Unable to create couple')
      console.error('[setup/create] failed:', {
        'error.message': diagnosticsError.message,
        'error.code': diagnosticsError.code,
        'error.details': diagnosticsError.details,
        'error.hint': diagnosticsError.hint
      })
      const fullErrorForToast = [
        `error.code: ${diagnosticsError.code}`,
        `error.message: ${diagnosticsError.message}`,
        `error.details: ${diagnosticsError.details ?? 'null'}`,
        `error.hint: ${diagnosticsError.hint ?? 'null'}`,
        `whoami: ${whoamiSnapshot || createWhoamiResult || 'not_available'}`
      ].join(' | ')

      dispatch(
        setAlert({
          type: 'error',
          title: 'Create failed',
          message: fullErrorForToast
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

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw mapCreateError(sessionError, 'Unable to load auth session')
      }

      if (!sessionData.session?.access_token) {
        throw new Error('Ban can dang nhap lai de join couple.')
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
            ? 'Ma couple khong hop le. Vui long kiem tra lai.'
            : `${joinError.message} (${joinError.code})`
        )
      }

      const joinedCoupleId = parseJoinedCoupleId(data)
      if (!joinedCoupleId) {
        throw new Error('Ma couple khong hop le. Vui long kiem tra lai.')
      }

      console.debug('[setup/join] rpc join_by_code result:', { coupleId: joinedCoupleId })
      const membershipCoupleId = await refreshMembershipFromCoupleMembers(user.id)
      console.debug('[setup/join] refreshed membership couple_id:', membershipCoupleId)
      setJoinCode('')
      setRecentCreatedCouple(null)
      await loadCurrentCoupleContext()
      dispatch(
        setAlert({
          type: 'success',
          title: 'Joined successfully',
          message: 'Da join couple thanh cong va da lam moi trang thai.'
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
    if (!memberCoupleId) {
      return
    }

    try {
      setIsLeavingCouple(true)
      if (!supabase) {
        throw mapCreateError(null, 'Supabase env is missing')
      }

      const { error } = await supabase.rpc('leave_couple', { p_couple_id: memberCoupleId })
      if (error) {
        throw mapCreateError(error, 'Unable to leave couple')
      }

      clearActiveCoupleCache()
      setActiveCouple(null)
      setRecentCreatedCouple(null)
      setIsCoupleOwner(false)
      setSource('server')
      await loadCurrentCoupleContext()
      dispatch(
        setAlert({
          type: 'success',
          title: 'Leave successful',
          message: 'Ban da roi couple.'
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
    if (!memberCoupleId) {
      return
    }

    const confirmed = window.confirm(
      'XOA COUPLE se xoa du lieu lien quan. Hanh dong nay KHONG THE HOAN TAC. Ban chac chan?'
    )
    if (!confirmed) {
      return
    }

    try {
      setIsDeletingCouple(true)
      if (!supabase) {
        throw mapCreateError(null, 'Supabase env is missing')
      }

      const { error } = await supabase.rpc('delete_my_couple', { p_couple_id: memberCoupleId })
      if (error) {
        throw mapCreateError(error, 'Unable to delete couple')
      }

      clearActiveCoupleCache()
      setActiveCouple(null)
      setRecentCreatedCouple(null)
      setIsCoupleOwner(false)
      setSource('server')
      await loadCurrentCoupleContext()
      dispatch(
        setAlert({
          type: 'success',
          title: 'Delete successful',
          message: 'Couple da duoc xoa.'
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
        throw new Error('Ban can dang nhap lai de reset couple.')
      }

      const { data: membership, error: membershipError } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (membershipError) {
        throw mapCreateError(membershipError, 'Unable to load current couple membership')
      }

      const activeCoupleId = membership?.couple_id ?? null

      if (activeCoupleId) {
        let ownerForReset = isCoupleOwner
        const coupleOwnerRow = await selectCoupleById(
          supabase,
          activeCoupleId,
          'SetupClient.onResetCouple owner check'
        )

        if (coupleOwnerRow?.created_by) {
          ownerForReset = coupleOwnerRow.created_by === user.id
        }

        if (ownerForReset) {
          const confirmDelete = window.confirm(
            'WARNING: Reset khi ban la owner se XOA TOAN BO du lieu chung cua couple hien tai. Hanh dong nay KHONG THE HOAN TAC. Tiep tuc?'
          )
          if (!confirmDelete) {
            return
          }

          const { error: deleteError } = await supabase.rpc('delete_my_couple', {
            p_couple_id: activeCoupleId
          })
          if (deleteError) {
            throw mapCreateError(deleteError, 'Unable to delete current couple')
          }
        } else {
          const confirmLeave = window.confirm(
            'Ban se roi couple hien tai va tao couple moi. Tiep tuc?'
          )
          if (!confirmLeave) {
            return
          }

          const { error: leaveError } = await supabase.rpc('leave_couple', { p_couple_id: activeCoupleId })
          if (leaveError) {
            throw mapCreateError(leaveError, 'Unable to leave current couple')
          }
        }
      }

      let createdCouple: CouplePayload | null = null
      let lastCreateError: CreateDiagnosticsError | null = null

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateCoupleCode()
        const { data, error } = await supabase
          .from('couples')
          .insert({ code })
          .select('id, code')
          .single()

        if (!error && data) {
          createdCouple = data
          break
        }

        lastCreateError = mapCreateError(error, 'Unable to create replacement couple')
      }

      if (!createdCouple) {
        throw lastCreateError ?? mapCreateError(null, 'Unable to create replacement couple')
      }

      const { error: membershipCreateError } = await supabase
        .from('couple_members')
        .insert({ couple_id: createdCouple.id, user_id: user.id })

      if (membershipCreateError) {
        throw mapCreateError(membershipCreateError, 'Unable to attach user to replacement couple')
      }

      let copied = false
      try {
        await navigator.clipboard.writeText(createdCouple.code)
        copied = true
      } catch {
        copied = false
      }

      cacheActiveCouple(createdCouple)
      setActiveCouple(createdCouple)
      setRecentCreatedCouple(createdCouple)
      setIsCoupleOwner(true)
      setSource('server')
      await loadCurrentCoupleContext()

      dispatch(
        setAlert({
          type: 'success',
          title: 'Reset completed',
          message: copied
            ? `Couple moi: ${createdCouple.code} (da copy)`
            : `Couple moi: ${createdCouple.code}`
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
    if (!memberCoupleId) {
      return
    }

    if (!isCoupleOwner) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'Not allowed',
          message: 'Chi nguoi tao couple moi doi ma.'
        })
      )
      return
    }

    const confirmed = window.confirm(
      'Doi ma couple? Ma cu se KHONG con hop le. Du lieu chung van duoc giu nguyen.'
    )
    if (!confirmed) {
      return
    }

    try {
      setIsRotatingCoupleCode(true)
      if (!supabase) {
        throw mapCreateError(null, 'Supabase env is missing')
      }

      const { data, error } = await supabase.rpc('rotate_couple_code', { p_couple_id: memberCoupleId })
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
      setActiveCouple((previous) =>
        previous
          ? {
              ...previous,
              code: newCode
            }
          : {
              id: memberCoupleId,
              code: newCode
            }
      )
      cacheActiveCouple({
        id: memberCoupleId,
        code: newCode
      })
      await loadCurrentCoupleContext()

      dispatch(
        setAlert({
          type: 'success',
          title: 'Code updated',
          message: copied ? `Ma moi: ${newCode} (da copy)` : `Ma moi: ${newCode}`
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

  const statusText = useMemo(() => {
    if (source === 'cache') {
      return 'Hiển thị từ local cache. Server sẽ là nguồn chính khi có kết nối.'
    }

    return 'Đã đồng bộ từ server.'
  }, [source])

  if (isInitialLoading) {
    return (
      <section className="container mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">Dang tai trang thai couple...</p>
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
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{statusText}</p>

        <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50/70 p-4 dark:border-rose-900/40 dark:bg-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Couple hiện tại:{' '}
            <span className="font-semibold text-rose-700 dark:text-rose-200">
              {hasCouple ? activeCouple?.code : 'Chưa ghép đôi'}
            </span>
          </p>
        </div>


        {recentCreatedCouple ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800/60 dark:bg-emerald-900/10">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Tao couple thanh cong</p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
              Ma couple cua ban: <span className="font-semibold">{recentCreatedCouple.code}</span>
            </p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(recentCreatedCouple.code)}
              className="mt-2 rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-gray-900 dark:text-emerald-200 dark:hover:bg-gray-700"
            >
              Copy ma
            </button>
          </div>
        ) : null}

        {memberCoupleId ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-xs text-gray-600 dark:text-gray-300">Couple ID: {memberCoupleId}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onLeaveCouple}
                disabled={
                  isSubmitting ||
                  isLeavingCouple ||
                  isDeletingCouple ||
                  isResettingCouple ||
                  isRotatingCoupleCode
                }
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {isLeavingCouple ? 'Dang roi...' : 'Roi couple'}
              </button>

              <button
                type="button"
                onClick={isCoupleOwner ? onRotateCoupleCode : undefined}
                title={isCoupleOwner ? 'Doi ma couple' : 'Chi nguoi tao couple moi doi ma'}
                disabled={
                  !isCoupleOwner ||
                  isSubmitting ||
                  isLeavingCouple ||
                  isDeletingCouple ||
                  isResettingCouple ||
                  isRotatingCoupleCode
                }
                className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/20"
              >
                {isRotatingCoupleCode ? 'Dang doi ma...' : 'Doi ma couple'}
              </button>

              {isCoupleOwner ? (
                <button
                  type="button"
                  onClick={onDeleteCouple}
                  disabled={
                    isSubmitting ||
                    isLeavingCouple ||
                    isDeletingCouple ||
                    isResettingCouple ||
                    isRotatingCoupleCode
                  }
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingCouple ? 'Dang xoa...' : 'Xoa couple'}
                </button>
              ) : null}
            </div>
            {latestRotatedCode ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span>Ma moi: {latestRotatedCode}</span>
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
              Neu ban la owner, reset se xoa toan bo du lieu chia se cua couple hien tai.
            </p>
            <button
              type="button"
              onClick={onResetCouple}
              disabled={
                isSubmitting ||
                isLeavingCouple ||
                isDeletingCouple ||
                isResettingCouple ||
                isRotatingCoupleCode
              }
              className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResettingCouple ? 'Dang reset...' : 'Reset couple'}
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tạo couple mới</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Hệ thống sẽ tạo một mã 6 ký tự để bạn chia sẻ với người kia.
            </p>
            <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50/60 p-3 text-xs text-gray-600 dark:border-rose-900/40 dark:bg-gray-800 dark:text-gray-300">
              <p className="font-medium text-gray-700 dark:text-gray-100">Diagnostics</p>
              <p className="mt-1 break-all">
                User: {authUser.email ?? 'unknown'} ({authUser.id ?? 'unknown'})
              </p>
              <p className="mt-1">Session access_token: {String(hasAccessToken)}</p>
              {createWhoamiResult ? (
                <pre className="mt-2 overflow-x-auto rounded-md border border-rose-100 bg-white/90 p-2 text-[11px] leading-relaxed text-gray-700 dark:border-rose-900/50 dark:bg-gray-900 dark:text-gray-200">
                  {createWhoamiResult}
                </pre>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onCreateCouple}
              disabled={isSubmitting || isResettingCouple}
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
              />
              <button
                type="submit"
                disabled={isSubmitting || isResettingCouple}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-500 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Join couple'}
              </button>
            </form>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadCurrentCoupleContext()}
          disabled={isRefreshing}
          className="mt-6 text-sm font-medium text-rose-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 dark:text-rose-300"
        >
          {isRefreshing ? 'Refreshing...' : 'Làm mới trạng thái từ server'}
        </button>
      </div>
    </section>
  )
}
