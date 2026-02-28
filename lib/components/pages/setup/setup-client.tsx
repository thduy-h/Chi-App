'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import { createClient as createBrowserClient } from '@/lib/supabase/browser'
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

export function SetupClient({ initialEmail, initialCouple }: SetupClientProps) {
  const dispatch = useDispatch()
  const supabase = useMemo(() => createBrowserClient(), [])

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
        cacheActiveCouple(payload.couple)
        setSource('server')
        return
      }

      setCouple(null)
      clearActiveCoupleCache()
      setSource('server')
    } catch {
      const cached = readActiveCoupleCache()
      if (cached) {
        setCouple({
          id: cached.id,
          code: cached.code ?? 'unknown'
        })
        setSource('cache')
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (initialCouple) {
      cacheActiveCouple(initialCouple)
    }
    void loadCurrentFromServer()
  }, [initialCouple, loadCurrentFromServer])

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
    }

    void loadDiagnostics()

    return () => {
      isMounted = false
    }
  }, [initialEmail, supabase])

  const onCreateCouple = async () => {
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
        throw mapCreateError(userError, 'Unauthorized')
      }

      console.debug('[setup/create] current user id:', user.id)

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
        const { data, error } = await supabase
          .from('couples')
          .insert({ code })
          .select('id, code')
          .single()

        if (!error && data) {
          createdCouple = data
          break
        }

        lastCreateError = mapCreateError(error, 'Unable to create couple')
        console.error('[setup/create] couples insert error:', {
          message: lastCreateError.message,
          code: lastCreateError.code,
          details: lastCreateError.details,
          hint: lastCreateError.hint
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
        message: diagnosticsError.message,
        code: diagnosticsError.code,
        details: diagnosticsError.details,
        hint: diagnosticsError.hint
      })

      dispatch(
        setAlert({
          type: 'error',
          title: 'Create failed',
          message: `${diagnosticsError.message} (code: ${diagnosticsError.code})`
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
      const response = await fetch('/api/couple/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      const payload = (await response.json()) as {
        error?: string
        alreadyJoined?: boolean
        couple?: CouplePayload
      }

      if (!response.ok || !payload.couple) {
        throw new Error(payload.error ?? 'Unable to join couple')
      }

      setCouple(payload.couple)
      cacheActiveCouple(payload.couple)
      setSource('server')
      setJoinCode('')
      dispatch(
        setAlert({
          type: 'success',
          title: payload.alreadyJoined ? 'Already joined' : 'Joined successfully',
          message: `Couple code hiện tại: ${payload.couple.code}`
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
