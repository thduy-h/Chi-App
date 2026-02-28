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
  normalizeCoupleCode,
  readActiveCoupleCache
} from '@/lib/supabase/couples'

interface CouplePayload {
  id: string
  code: string
}

interface SetupClientProps {
  initialEmail: string
  initialCouple: CouplePayload | null
}

interface CurrentCoupleResponse {
  user: { id: string; email: string } | null
  couple: CouplePayload | null
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

export function SetupClient({ initialEmail, initialCouple }: SetupClientProps) {
  const router = useRouter()
  const dispatch = useDispatch()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [email, setEmail] = useState(initialEmail)
  const [couple, setCouple] = useState<CouplePayload | null>(initialCouple)
  const [joinCode, setJoinCode] = useState('')
  const [source, setSource] = useState<'server' | 'cache'>('server')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authUser, setAuthUser] = useState<{ id: string | null; email: string | null }>({
    id: null,
    email: initialEmail || null
  })
  const [hasAccessToken, setHasAccessToken] = useState(false)
  const [isCheckingWhoami, setIsCheckingWhoami] = useState(false)
  const [whoamiJson, setWhoamiJson] = useState('')
  const [memberCoupleId, setMemberCoupleId] = useState<string | null>(initialCouple?.id ?? null)
  const [isCoupleOwner, setIsCoupleOwner] = useState(false)
  const [isLeavingCouple, setIsLeavingCouple] = useState(false)
  const [isDeletingCouple, setIsDeletingCouple] = useState(false)

  const hasCouple = Boolean(couple?.id && couple?.code)

  const loadCurrentFromServer = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/couple/current', {
        method: 'GET',
        cache: 'no-store'
      })
      const payload = (await response.json()) as CurrentCoupleResponse

      if (payload.user?.email) {
        setEmail(payload.user.email)
      }

      if (payload.couple) {
        setCouple(payload.couple)
        setMemberCoupleId(payload.couple.id)
        cacheActiveCouple(payload.couple)
        setSource('server')
        return
      }

      setCouple(null)
      setMemberCoupleId(null)
      setIsCoupleOwner(false)
      clearActiveCoupleCache()
      setSource('server')
    } catch {
      const cached = readActiveCoupleCache()
      if (cached) {
        setCouple({
          id: cached.id,
          code: cached.code ?? 'unknown'
        })
        setMemberCoupleId(cached.id)
        setSource('cache')
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const loadMemberContext = useCallback(async () => {
    if (!supabase) {
      setMemberCoupleId(null)
      setIsCoupleOwner(false)
      return
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMemberCoupleId(null)
      setIsCoupleOwner(false)
      return
    }

    const { data: membership, error: membershipError } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (membershipError || !membership?.couple_id) {
      setMemberCoupleId(null)
      setIsCoupleOwner(false)
      return
    }

    setMemberCoupleId(membership.couple_id)

    const { data: coupleRow, error: coupleError } = await supabase
      .from('couples')
      .select('id, code, created_by')
      .eq('id', membership.couple_id)
      .maybeSingle()

    if (coupleError) {
      setIsCoupleOwner(false)
      return
    }

    setIsCoupleOwner(Boolean(coupleRow?.created_by && coupleRow.created_by === user.id))
  }, [supabase])

  useEffect(() => {
    if (initialCouple) {
      cacheActiveCouple(initialCouple)
    }
    void loadCurrentFromServer()
    void loadMemberContext()
  }, [initialCouple, loadCurrentFromServer, loadMemberContext])

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
          'SetupClient.onCreateCouple -> createSupabaseBrowserClient -> public.couples.insert({ code })'
        )
        const { count, error: countError } = await supabase
          .from('couples')
          .select('*', { count: 'exact', head: true })

        if (countError) {
          const diagnosticsError = mapCreateError(countError, 'Unable to count public.couples')
          console.error('[setup/diagnostics] public.couples count error:', {
            'error.code': diagnosticsError.code,
            'error.message': diagnosticsError.message,
            'error.details': diagnosticsError.details,
            'error.hint': diagnosticsError.hint
          })
        } else {
          console.debug('[setup/diagnostics] public.couples count:', count ?? 0)
        }
      }
    }

    void loadDiagnostics()

    return () => {
      isMounted = false
    }
  }, [initialEmail, supabase])

  const onCreateCouple = async () => {
    try {
      setIsSubmitting(true)
      const insertContextLabel = 'client-component:createSupabaseBrowserClient'
      const createPathLabel =
        'SetupClient.onCreateCouple -> createSupabaseBrowserClient -> public.couples.insert({ code })'

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
        const { data: existingCouple, error: existingCoupleError } = await supabase
          .from('couples')
          .select('id, code')
          .eq('id', existingMembership.couple_id)
          .maybeSingle()

        if (existingCoupleError) {
          throw mapCreateError(existingCoupleError, 'Unable to load existing couple')
        }

        if (existingCouple) {
          setCouple(existingCouple)
          cacheActiveCouple(existingCouple)
          setSource('server')
          dispatch(
            setAlert({
              type: 'success',
              title: 'Couple created',
              message: 'You already have an active couple.'
            })
          )
          return
        }
      }

      let createdCouple: CouplePayload | null = null
      let lastCreateError: CreateDiagnosticsError | null = null

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateCoupleCode()
        const insertPayload = { code }
        console.debug('[setup/create] couples insert context:', insertContextLabel)
        console.debug('[setup/create] insert target:', 'public.couples')
        console.debug('[setup/create] insert payload keys:', Object.keys(insertPayload))
        const { data, error } = await supabase
          .from('couples')
          .insert(insertPayload)
          .select('id, code')
          .single()

        if (!error && data) {
          createdCouple = data
          break
        }

        lastCreateError = mapCreateError(error, 'Unable to create couple')
        console.error('[setup/create] couples insert error:', {
          'error.message': lastCreateError.message,
          'error.code': lastCreateError.code,
          'error.details': lastCreateError.details,
          'error.hint': lastCreateError.hint
        })
      }

      if (!createdCouple) {
        throw lastCreateError ?? mapCreateError(null, 'Unable to create couple after multiple attempts')
      }

      console.debug('[setup/create] created couple row:', createdCouple)

      const { error: membershipCreateError } = await supabase
        .from('couple_members')
        .insert({ couple_id: createdCouple.id, user_id: user.id })

      if (membershipCreateError) {
        throw mapCreateError(membershipCreateError, 'Unable to create membership')
      }

      setCouple(createdCouple)
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
        `error.hint: ${diagnosticsError.hint ?? 'null'}`
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

  const onCheckWhoami = async () => {
    try {
      setIsCheckingWhoami(true)
      const rpcContextLabel = 'client-component:createSupabaseBrowserClient'

      if (!supabase) {
        setWhoamiJson(
          JSON.stringify(
            {
              error: {
                code: 'missing_env',
                message: 'Supabase env is missing',
                details: null,
                hint: null
              }
            },
            null,
            2
          )
        )
        return
      }

      console.debug('[setup/whoami] rpc context label:', rpcContextLabel)

      const { data, error } = await supabase.rpc('whoami')
      if (error) {
        const diagnosticsError = mapCreateError(error, 'whoami failed')
        console.error('[setup/whoami] rpc error:', {
          'error.code': diagnosticsError.code,
          'error.message': diagnosticsError.message,
          'error.details': diagnosticsError.details,
          'error.hint': diagnosticsError.hint
        })
        setWhoamiJson(
          JSON.stringify(
            {
              error: {
                code: diagnosticsError.code,
                message: diagnosticsError.message,
                details: diagnosticsError.details,
                hint: diagnosticsError.hint
              }
            },
            null,
            2
          )
        )
        return
      }

      setWhoamiJson(JSON.stringify(data ?? null, null, 2))
    } catch (error) {
      const diagnosticsError = mapCreateError(error, 'whoami failed')
      console.error('[setup/whoami] unexpected error:', {
        'error.code': diagnosticsError.code,
        'error.message': diagnosticsError.message,
        'error.details': diagnosticsError.details,
        'error.hint': diagnosticsError.hint
      })
      setWhoamiJson(
        JSON.stringify(
          {
            error: {
              code: diagnosticsError.code,
              message: diagnosticsError.message,
              details: diagnosticsError.details,
              hint: diagnosticsError.hint
            }
          },
          null,
          2
        )
      )
    } finally {
      setIsCheckingWhoami(false)
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
      setJoinCode('')
      await loadCurrentFromServer()
      await loadMemberContext()
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
      setCouple(null)
      setMemberCoupleId(null)
      setIsCoupleOwner(false)
      setSource('server')
      await loadCurrentFromServer()
      await loadMemberContext()
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
      setCouple(null)
      setMemberCoupleId(null)
      setIsCoupleOwner(false)
      setSource('server')
      await loadCurrentFromServer()
      await loadMemberContext()
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

  const statusText = useMemo(() => {
    if (source === 'cache') {
      return 'Hiển thị từ local cache. Server sẽ là nguồn chính khi có kết nối.'
    }

    return 'Đã đồng bộ từ server.'
  }, [source])

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
              {hasCouple ? couple?.code : 'Chưa ghép đôi'}
            </span>
          </p>
        </div>

        {memberCoupleId ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-xs text-gray-600 dark:text-gray-300">Couple ID: {memberCoupleId}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onLeaveCouple}
                disabled={isSubmitting || isLeavingCouple || isDeletingCouple}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {isLeavingCouple ? 'Dang roi...' : 'Roi couple'}
              </button>

              {isCoupleOwner ? (
                <button
                  type="button"
                  onClick={onDeleteCouple}
                  disabled={isSubmitting || isLeavingCouple || isDeletingCouple}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingCouple ? 'Dang xoa...' : 'Xoa couple'}
                </button>
              ) : null}
            </div>
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
              <button
                type="button"
                onClick={onCheckWhoami}
                disabled={isCheckingWhoami}
                className="mt-2 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-700 dark:bg-gray-900 dark:text-rose-200 dark:hover:bg-gray-700"
              >
                {isCheckingWhoami ? 'Checking...' : 'Check whoami'}
              </button>
              {whoamiJson ? (
                <pre className="mt-2 overflow-x-auto rounded-md border border-rose-100 bg-white/90 p-2 text-[11px] leading-relaxed text-gray-700 dark:border-rose-900/50 dark:bg-gray-900 dark:text-gray-200">
                  {whoamiJson}
                </pre>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onCreateCouple}
              disabled={isSubmitting}
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
                disabled={isSubmitting}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-500 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Join couple'}
              </button>
            </form>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadCurrentFromServer()}
          disabled={isRefreshing}
          className="mt-6 text-sm font-medium text-rose-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 dark:text-rose-300"
        >
          {isRefreshing ? 'Refreshing...' : 'Làm mới trạng thái từ server'}
        </button>
      </div>
    </section>
  )
}
