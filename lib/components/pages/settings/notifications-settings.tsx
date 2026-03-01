'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'

import { setAlert } from '@/lib/features/alert/alertSlice'
import { useCoupleContext } from '@/lib/hooks/use-couple-context'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type NotificationEvent = Database['public']['Tables']['notification_prefs']['Row']['event']
type NotificationChannel = Database['public']['Tables']['notification_prefs']['Row']['channel']

type PreferenceMap = Record<NotificationEvent, Record<NotificationChannel, boolean>>

const EVENT_OPTIONS: Array<{ id: NotificationEvent; label: string }> = [
  { id: 'order_created', label: 'Thông báo đơn đặt món' },
  { id: 'letter_received', label: 'Thông báo thư mới' }
]

const CHANNEL_OPTIONS: Array<{ id: NotificationChannel; label: string }> = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'in_app', label: 'Trong ứng dụng' },
  { id: 'email', label: 'Email' }
]

function buildDefaultPrefs(): PreferenceMap {
  return {
    order_created: {
      telegram: false,
      in_app: true,
      email: false
    },
    letter_received: {
      telegram: true,
      in_app: true,
      email: false
    }
  }
}

interface LinkTokenResponse {
  token: string
  instructions: string
  expiresAt: string
}

export function NotificationsSettingsPage() {
  const dispatch = useDispatch()
  const { user, couple, loading: coupleLoading } = useCoupleContext()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [telegramLinkedAt, setTelegramLinkedAt] = useState<string | null>(null)
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null)
  const [linkTokenInfo, setLinkTokenInfo] = useState<LinkTokenResponse | null>(null)
  const [prefs, setPrefs] = useState<PreferenceMap>(() => buildDefaultPrefs())

  const loadData = useCallback(async () => {
    if (!supabase || !user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [{ data: integrationRow, error: integrationError }, prefsResult] = await Promise.all([
        supabase
          .from('user_integrations')
          .select('telegram_chat_id, telegram_linked_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        couple?.id
          ? supabase
              .from('notification_prefs')
              .select('event, channel, enabled')
              .eq('couple_id', couple.id)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [], error: null })
      ])

      if (integrationError) {
        throw integrationError
      }

      if (prefsResult.error) {
        throw prefsResult.error
      }

      const defaultPrefs = buildDefaultPrefs()
      const nextPrefs: PreferenceMap = {
        order_created: { ...defaultPrefs.order_created },
        letter_received: { ...defaultPrefs.letter_received }
      }

      for (const row of prefsResult.data || []) {
        if (row.event in nextPrefs && row.channel in nextPrefs[row.event as NotificationEvent]) {
          nextPrefs[row.event as NotificationEvent][row.channel as NotificationChannel] = Boolean(row.enabled)
        }
      }

      setPrefs(nextPrefs)
      setTelegramLinked(Boolean(integrationRow?.telegram_chat_id))
      setTelegramLinkedAt(integrationRow?.telegram_linked_at ?? null)
      setTelegramChatId(integrationRow?.telegram_chat_id ?? null)
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Tải cài đặt thất bại',
          message: error instanceof Error ? error.message : 'Không thể tải cài đặt thông báo.'
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

  const onGenerateLinkToken = async () => {
    try {
      setGeneratingToken(true)
      const response = await fetch('/api/telegram/link-token', { method: 'POST' })
      const payload = (await response.json().catch(() => ({}))) as Partial<LinkTokenResponse> & {
        error?: string
      }

      if (!response.ok || !payload.token || !payload.instructions || !payload.expiresAt) {
        throw new Error(payload.error || 'Không thể tạo mã liên kết Telegram.')
      }

      setLinkTokenInfo({
        token: payload.token,
        instructions: payload.instructions,
        expiresAt: payload.expiresAt
      })

      dispatch(
        setAlert({
          type: 'success',
          title: 'Đã tạo mã liên kết',
          message: 'Mã đã sẵn sàng. Hãy gửi lệnh /start cho bot Telegram.'
        })
      )
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Không thể tạo mã',
          message: error instanceof Error ? error.message : 'Đã xảy ra lỗi.'
        })
      )
    } finally {
      setGeneratingToken(false)
    }
  }

  const onUnlinkTelegram = async () => {
    try {
      setUnlinking(true)
      const response = await fetch('/api/telegram/unlink', { method: 'POST' })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Không thể hủy liên kết Telegram.')
      }

      setTelegramLinked(false)
      setTelegramLinkedAt(null)
      setTelegramChatId(null)
      setLinkTokenInfo(null)
      setPrefs((prev) => ({
        order_created: { ...prev.order_created, telegram: false },
        letter_received: { ...prev.letter_received, telegram: false }
      }))

      dispatch(
        setAlert({
          type: 'success',
          title: 'Đã hủy liên kết',
          message: 'Telegram đã được ngắt liên kết.'
        })
      )
    } catch (error) {
      dispatch(
        setAlert({
          type: 'error',
          title: 'Hủy liên kết thất bại',
          message: error instanceof Error ? error.message : 'Đã xảy ra lỗi.'
        })
      )
    } finally {
      setUnlinking(false)
    }
  }

  const onTogglePref = async (eventId: NotificationEvent, channel: NotificationChannel, enabled: boolean) => {
    if (!supabase || !user?.id || !couple?.id) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'Thiếu couple',
          message: 'Bạn cần có couple để chỉnh cài đặt thông báo.'
        })
      )
      return
    }

    if (channel === 'telegram' && enabled && !telegramLinked) {
      dispatch(
        setAlert({
          type: 'warning',
          title: 'Chưa liên kết Telegram',
          message: 'Hãy kết nối Telegram trước khi bật kênh này.'
        })
      )
      return
    }

    setSaving(true)
    const previous = prefs
    const next: PreferenceMap = {
      ...prefs,
      [eventId]: {
        ...prefs[eventId],
        [channel]: enabled
      }
    }
    setPrefs(next)

    const { error } = await supabase.from('notification_prefs').upsert(
      {
        couple_id: couple.id,
        user_id: user.id,
        event: eventId,
        channel,
        enabled
      },
      {
        onConflict: 'couple_id,user_id,event,channel'
      }
    )

    if (error) {
      console.error('[settings/notifications] save preference failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      setPrefs(previous)
      dispatch(
        setAlert({
          type: 'error',
          title: 'Lưu thất bại',
          message: `${error.message}${error.code ? ` (${error.code})` : ''}`
        })
      )
    }

    setSaving(false)
  }

  if (coupleLoading || loading) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-rose-100 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-rose-900/40 dark:bg-gray-900 dark:text-gray-300">
          Đang tải cài đặt thông báo...
        </div>
      </main>
    )
  }

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-rose-200/60 blur-3xl dark:bg-rose-900/20" />
      </div>

      <section className="relative container mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Thông báo & Telegram
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Quản lý kênh nhận thông báo theo từng couple.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kết nối Telegram</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Trạng thái: {telegramLinked ? 'Đã liên kết' : 'Chưa liên kết'}
            </p>
            {telegramChatId ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">chat_id: {telegramChatId}</p>
            ) : null}
            {telegramLinkedAt ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Liên kết lúc: {new Date(telegramLinkedAt).toLocaleString('vi-VN')}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onGenerateLinkToken()}
                disabled={generatingToken}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {generatingToken ? 'Đang tạo mã...' : 'Kết nối Telegram'}
              </button>

              <button
                type="button"
                onClick={() => void onUnlinkTelegram()}
                disabled={unlinking || !telegramLinked}
                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {unlinking ? 'Đang hủy liên kết...' : 'Hủy liên kết Telegram'}
              </button>
            </div>

            {linkTokenInfo ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="font-semibold">Mã liên kết: {linkTokenInfo.token}</p>
                <p className="mt-1">{linkTokenInfo.instructions}</p>
                <p className="mt-1 text-xs">
                  Hết hạn lúc: {new Date(linkTokenInfo.expiresAt).toLocaleString('vi-VN')}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tùy chọn thông báo</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {couple?.id
                ? `Áp dụng cho couple #${couple.code ?? '—'}`
                : 'Bạn chưa có couple. Chỉ có thể chỉnh sau khi ghép đôi.'}
            </p>

            <div className="mt-4 space-y-3">
              {EVENT_OPTIONS.map((event) => (
                <div key={event.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{event.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CHANNEL_OPTIONS.map((channel) => {
                      const checked = prefs[event.id][channel.id]
                      const disableTelegram = channel.id === 'telegram' && !telegramLinked
                      return (
                        <label
                          key={channel.id}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                            checked
                              ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
                              : 'border-gray-300 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                          } ${disableTelegram ? 'opacity-60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={saving || !couple?.id || disableTelegram}
                            onChange={(eventInput) =>
                              void onTogglePref(event.id, channel.id, eventInput.target.checked)
                            }
                            className="h-3.5 w-3.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                          />
                          {channel.label}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}