'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  LOVEHUB_COUPLE_CHANGED_EVENT,
  normalizeRpcRow,
  type NormalizedRpcCoupleRow
} from '@/lib/supabase/couples'

interface CoupleContextUser {
  id: string
  email: string | null
}

interface UseCoupleContextResult {
  user: CoupleContextUser | null
  couple: NormalizedRpcCoupleRow | null
  loading: boolean
  refreshCouple: (withSpinner?: boolean) => Promise<void>
}

export function useCoupleContext(): UseCoupleContextResult {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [user, setUser] = useState<CoupleContextUser | null>(null)
  const [couple, setCouple] = useState<NormalizedRpcCoupleRow | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshCouple = useCallback(
    async (withSpinner = true) => {
      if (withSpinner) {
        setLoading(true)
      }

      try {
        if (!supabase) {
          setUser(null)
          setCouple(null)
          return
        }

        const {
          data: { user: authUser },
          error: userError
        } = await supabase.auth.getUser()

        if (userError || !authUser) {
          setUser(null)
          setCouple(null)
          return
        }

        setUser({ id: authUser.id, email: authUser.email ?? null })

        const { data: coupleRaw, error: coupleError } = await supabase.rpc('get_my_couple')
        if (coupleError) {
          console.error('[useCoupleContext] get_my_couple failed', {
            code: coupleError.code ?? null,
            message: coupleError.message ?? null,
            details: coupleError.details ?? null,
            hint: coupleError.hint ?? null
          })
          setCouple(null)
          return
        }

        setCouple(normalizeRpcRow(coupleRaw))
      } finally {
        if (withSpinner) {
          setLoading(false)
        }
      }
    },
    [supabase]
  )

  useEffect(() => {
    void refreshCouple(true)
  }, [refreshCouple])

  useEffect(() => {
    if (!supabase) {
      return
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        setCouple(null)
        setLoading(false)
        return
      }

      void refreshCouple(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [refreshCouple, supabase])

  useEffect(() => {
    const handleCoupleChanged = () => {
      void refreshCouple(false)
    }

    window.addEventListener(LOVEHUB_COUPLE_CHANGED_EVENT, handleCoupleChanged)
    return () => {
      window.removeEventListener(LOVEHUB_COUPLE_CHANGED_EVENT, handleCoupleChanged)
    }
  }, [refreshCouple])

  return {
    user,
    couple,
    loading,
    refreshCouple
  }
}
