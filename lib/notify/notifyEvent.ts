import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type NotifyEvent = Database['public']['Tables']['notification_prefs']['Row']['event']

interface NotifyPayload {
  item?: string | null
  note?: string | null
}

interface NotifyEventInput {
  event: NotifyEvent
  coupleId: string
  actorUserId?: string | null
  payload?: NotifyPayload
}

interface TelegramRecipient {
  user_id: string
  telegram_chat_id: string | null
}

function sanitizeText(value: string | null | undefined, fallback = '—') {
  const normalized = value?.trim()
  return normalized ? normalized : fallback
}

function buildMessage(event: NotifyEvent, payload?: NotifyPayload) {
  if (event === 'order_created') {
    const item = sanitizeText(payload?.item)
    const note = sanitizeText(payload?.note)
    return `🍜 Có đơn mới từ người ấy. Món: ${item} • Ghi chú: ${note}`
  }

  return '💌 Bạn có một lá thư mới trong LoveHub.'
}

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const withLink = appUrl ? `${text}\n\nMở LoveHub: ${appUrl}` : text

  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: withLink
    }),
    cache: 'no-store'
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Telegram send failed (${response.status}): ${detail.slice(0, 200)}`)
  }
}

export async function notifyEvent({
  event,
  coupleId,
  actorUserId,
  payload
}: NotifyEventInput): Promise<void> {
  const admin = createSupabaseAdminClient()
  if (!admin || !coupleId?.trim()) {
    return
  }

  const { data: members, error: membersError } = await admin
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)

  if (membersError) {
    console.error('[notifyEvent] failed to load couple members', {
      code: membersError.code,
      message: membersError.message,
      details: membersError.details
    })
    return
  }

  const recipientIds = (members || [])
    .map((row) => row.user_id)
    .filter((userId) => Boolean(userId) && userId !== actorUserId)

  if (recipientIds.length < 1) {
    return
  }

  const { data: prefs, error: prefsError } = await admin
    .from('notification_prefs')
    .select('user_id')
    .eq('couple_id', coupleId)
    .eq('event', event)
    .eq('channel', 'telegram')
    .eq('enabled', true)
    .in('user_id', recipientIds)

  if (prefsError) {
    console.error('[notifyEvent] failed to load notification prefs', {
      code: prefsError.code,
      message: prefsError.message,
      details: prefsError.details
    })
    return
  }

  const telegramEnabledIds = Array.from(new Set((prefs || []).map((row) => row.user_id)))
  if (telegramEnabledIds.length < 1) {
    return
  }

  const { data: integrations, error: integrationsError } = await admin
    .from('user_integrations')
    .select('user_id, telegram_chat_id')
    .in('user_id', telegramEnabledIds)

  if (integrationsError) {
    console.error('[notifyEvent] failed to load telegram integrations', {
      code: integrationsError.code,
      message: integrationsError.message,
      details: integrationsError.details
    })
    return
  }

  const message = buildMessage(event, payload)
  const recipients: TelegramRecipient[] = (integrations || []).filter((row) =>
    Boolean(row.telegram_chat_id)
  )

  if (recipients.length < 1) {
    return
  }

  await Promise.allSettled(
    recipients.map(async (recipient) => {
      try {
        await sendTelegramMessage(String(recipient.telegram_chat_id), message)
      } catch (error) {
        console.error('[notifyEvent] telegram send failed', {
          userId: recipient.user_id,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })
  )
}
