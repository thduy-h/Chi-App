'use client'

import { useEffect, useMemo, useState } from 'react'

import type { HomeMode } from '@/lib/home-mode'
import { normalizeRpcRow } from '@/lib/supabase/couples'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const VALID_MODES: HomeMode[] = ['a', 'b', 'c']

function normalizeMode(value: unknown): HomeMode | null {
  if (typeof value !== 'string') {
    return null
  }
  const lowered = value.trim().toLowerCase()
  return VALID_MODES.includes(lowered as HomeMode) ? (lowered as HomeMode) : null
}

export function useResolvedHomeMode(initialMode: HomeMode = 'c') {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [mode, setMode] = useState<HomeMode>(initialMode)

  useEffect(() => {
    if (!supabase) {
      setMode(initialMode)
      return
    }

    let mounted = true

    const resolveMode = async () => {
      if (!supabase) {
        if (mounted) {
          setMode(initialMode)
        }
        return
      }

      try {
        const {
          data: { user }
        } = await supabase.auth.getUser()

        if (!user) {
          if (mounted) {
            setMode(initialMode)
          }
          return
        }

        const { data: modeRow, error: modeError } = await supabase
          .from('user_home_modes')
          .select('mode')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!modeError) {
          const dbMode = normalizeMode(modeRow?.mode)
          if (dbMode) {
            if (mounted) {
              setMode(dbMode)
            }
            return
          }
        }

        const { data: coupleRaw } = await supabase.rpc('get_my_couple')
        const couple = normalizeRpcRow(coupleRaw)
        if (couple?.created_by && couple.created_by === user.id) {
          if (mounted) {
            setMode('a')
          }
          return
        }

        if (mounted) {
          setMode(initialMode)
        }
      } catch {
        if (mounted) {
          setMode(initialMode)
        }
      }
    }

    void resolveMode()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void resolveMode()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialMode, supabase])

  return mode
}
