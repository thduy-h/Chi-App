'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import { useCoupleContext } from '@/lib/hooks/use-couple-context'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const MAX_NICKNAME_LENGTH = 60

interface CoupleMembersPayload {
  members?: string[]
  partnerUserId?: string | null
  error?: string
}

interface NicknameRow {
  target_user_id: string
  nickname: string
  updated_at: string
}

function normalizeNickname(value: string) {
  return value.trim().slice(0, MAX_NICKNAME_LENGTH)
}

function parseLatestNicknames(rows: NicknameRow[]) {
  const map = new Map<string, { nickname: string; updatedAt: number }>()

  for (const row of rows) {
    const targetId = row.target_user_id
    const nickname = row.nickname?.trim()
    if (!targetId || !nickname) {
      continue
    }

    const updatedAtMs = Number.isNaN(Date.parse(row.updated_at)) ? 0 : Date.parse(row.updated_at)
    const existing = map.get(targetId)

    if (!existing || updatedAtMs >= existing.updatedAt) {
      map.set(targetId, { nickname, updatedAt: updatedAtMs })
    }
  }

  const result = new Map<string, string>()
  map.forEach((value, targetId) => {
    result.set(targetId, value.nickname)
  })
  return result
}

export function NicknameSettingsPage() {
  const dispatch = useDispatch()
  const { user, couple, loading: coupleLoading } = useCoupleContext()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selfNickname, setSelfNickname] = useState('')
  const [partnerNickname, setPartnerNickname] = useState('')
  const [partnerUserId, setPartnerUserId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!supabase || !user?.id || !couple?.id) {
      setLoading(false)
      setPartnerUserId(null)
      setSelfNickname('')
      setPartnerNickname('')
      return
    }

    setLoading(true)
    try {
      const [membersResponse, nicknamesResult] = await Promise.all([
        fetch('/api/couple/members', { method: 'GET', cache: 'no-store' }),
        supabase
          .from('couple_nicknames')
          .select('target_user_id, nickname, updated_at')
          .eq('couple_id', couple.id)
      ])

      const membersPayload = (await membersResponse.json().catch(() => ({}))) as CoupleMembersPayload
      if (!membersResponse.ok) {
        throw new Error(membersPayload.error || 'Không thể tải danh sách thành viên couple.')
      }

      if (nicknamesResult.error) {
        throw nicknamesResult.error
      }

      const resolvedPartnerUserId =
        membersPayload.partnerUserId ||
        (Array.isArray(membersPayload.members)
          ? membersPayload.members.find((memberId) => memberId !== user.id) || null
          : null)

      setPartnerUserId(resolvedPartnerUserId)

      const nicknameMap = parseLatestNicknames((nicknamesResult.data || []) as NicknameRow[])
      setSelfNickname(nicknameMap.get(user.id) || '')
      setPartnerNickname(resolvedPartnerUserId ? nicknameMap.get(resolvedPartnerUserId) || '' : '')
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Không thể tải biệt danh',
          message: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
        })
      )
    } finally {
      setLoading(false)
    }
  }, [couple?.id, dispatch, supabase, user?.id])

  useEffect(() => {
    if (coupleLoading) {
      return
    }
    void loadData()
  }, [coupleLoading, loadData])

  const upsertOrDeleteNickname = async (targetUserId: string, rawValue: string) => {
    if (!supabase || !user?.id || !couple?.id) {
      return
    }

    const nickname = normalizeNickname(rawValue)
    if (!nickname) {
      await supabase
        .from('couple_nicknames')
        .delete()
        .eq('couple_id', couple.id)
        .eq('owner_user_id', user.id)
        .eq('target_user_id', targetUserId)
      return
    }

    const { error } = await supabase.from('couple_nicknames').upsert(
      {
        couple_id: couple.id,
        owner_user_id: user.id,
        target_user_id: targetUserId,
        nickname,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'couple_id,owner_user_id,target_user_id'
      }
    )

    if (error) {
      throw error
    }
  }

  const onSaveNicknames = async () => {
    if (!supabase || !user?.id || !couple?.id) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'Thiếu couple',
          message: 'Bạn cần có couple để đặt biệt danh.'
        })
      )
      return
    }

    try {
      setSaving(true)

      await upsertOrDeleteNickname(user.id, selfNickname)
      if (partnerUserId) {
        await upsertOrDeleteNickname(partnerUserId, partnerNickname)
      }

      dispatch(
        setAlert({
          type: 'success',
          title: 'Đã lưu biệt danh',
          message: 'Biệt danh đã đồng bộ cho cả hai người trong couple.'
        })
      )

      await loadData()
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Lưu biệt danh thất bại',
          message: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
        })
      )
    } finally {
      setSaving(false)
    }
  }

  if (coupleLoading || loading) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-sky-100 bg-white p-6 text-sm text-gray-700 shadow-sm dark:border-sky-900/40 dark:bg-gray-900 dark:text-gray-200">
          Đang tải cài đặt biệt danh...
        </div>
      </main>
    )
  }

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6rem] top-[-6rem] h-64 w-64 rounded-full bg-sky-200/60 blur-3xl dark:bg-sky-900/20" />
      </div>

      <section className="relative container mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Biệt danh couple
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
            Cập nhật biệt danh để hộp thư hiển thị đồng bộ giữa hai người.
          </p>
        </div>

        {!couple?.id ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
            Bạn chưa có couple nên chưa thể đặt biệt danh.
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm dark:border-sky-900/40 dark:bg-gray-900">
            <div>
              <label
                htmlFor="self-nickname"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Biệt danh của bạn
              </label>
              <input
                id="self-nickname"
                value={selfNickname}
                maxLength={MAX_NICKNAME_LENGTH}
                onChange={(event) => setSelfNickname(event.target.value)}
                placeholder="Ví dụ: Cáo"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="partner-nickname"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Biệt danh của người ấy
              </label>
              <input
                id="partner-nickname"
                value={partnerNickname}
                maxLength={MAX_NICKNAME_LENGTH}
                disabled={!partnerUserId}
                onChange={(event) => setPartnerNickname(event.target.value)}
                placeholder={partnerUserId ? 'Ví dụ: Thỏ' : 'Chưa có thành viên thứ 2'}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none ring-sky-300 transition focus:ring disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <button
              type="button"
              onClick={() => void onSaveNicknames()}
              disabled={saving}
              className="inline-flex rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Đang lưu...' : 'Lưu biệt danh'}
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
