import { NextResponse } from 'next/server'

import { notifyEvent } from '@/lib/notify/notifyEvent'
import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

interface LettersRequestBody {
  mode?: 'feedback' | 'love'
  title?: string
  message?: string
  mood?: string
  anonymous?: boolean
}

interface DeleteLetterRequestBody {
  id?: string
}

type LetterRow = {
  id: string
  kind: 'feedback' | 'love'
  title: string | null
  message: string
  mood: string | null
  anonymous: boolean
  created_at: string | null
  created_by: string | null
}

type NicknameRow = {
  target_user_id: string | null
  nickname: string | null
  updated_at: string | null
}

type LetterReadRow = {
  letter_id: string | null
  user_id: string | null
}

type CoupleMemberRow = {
  user_id: string | null
}

const validModes = new Set(['feedback', 'love'])

function logSupabaseError(scope: string, error: {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}) {
  console.error(`[letters:${scope}]`, {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null
  })
}

const forwardLettersToWebhook = async (body: LettersRequestBody) => {
  const formspreeUrl = process.env.FORMSPREE_LETTERS_URL
  const webhookUrl = process.env.LETTERS_WEBHOOK_URL
  const targetUrl = formspreeUrl || webhookUrl

  if (!targetUrl) {
    return NextResponse.json(
      {
        error:
          'Chưa cấu hình endpoint nhận thư. Hãy đặt FORMSPREE_LETTERS_URL hoặc LETTERS_WEBHOOK_URL.'
      },
      { status: 503 }
    )
  }

  const forwardPayload = {
    mode: body.mode,
    title: body.title,
    message: body.message,
    mood: body.mood || null,
    anonymous: Boolean(body.anonymous),
    source: 'lovehub-letters-webhook',
    submittedAt: new Date().toISOString()
  }

  const upstreamResponse = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(forwardPayload),
    cache: 'no-store'
  })

  if (!upstreamResponse.ok) {
    const details = await upstreamResponse.text()
    return NextResponse.json(
      {
        error: 'Không thể chuyển thư đến endpoint đích.',
        details: details.slice(0, 500)
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, source: 'webhook' })
}

function parseLatestNicknames(rows: NicknameRow[]) {
  const output = new Map<string, { nickname: string; updatedAt: number }>()

  for (const row of rows) {
    const targetUserId = row.target_user_id?.trim()
    const nickname = row.nickname?.trim()
    if (!targetUserId || !nickname) {
      continue
    }

    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : Number.NaN
    const updatedAtMs = Number.isNaN(updatedAt) ? 0 : updatedAt
    const existing = output.get(targetUserId)
    if (!existing || updatedAtMs >= existing.updatedAt) {
      output.set(targetUserId, { nickname, updatedAt: updatedAtMs })
    }
  }

  const nicknames = new Map<string, string>()
  output.forEach((value, targetUserId) => {
    nicknames.set(targetUserId, value.nickname)
  })
  return nicknames
}

function buildReadsByLetter(rows: LetterReadRow[]) {
  const map = new Map<string, Set<string>>()
  for (const row of rows) {
    const letterId = row.letter_id?.trim()
    const userId = row.user_id?.trim()
    if (!letterId || !userId) {
      continue
    }

    const existing = map.get(letterId)
    if (existing) {
      existing.add(userId)
      continue
    }

    map.set(letterId, new Set([userId]))
  }

  return map
}

function hasPartnerOpened(args: {
  readers: Set<string> | undefined
  me: string
  partnerUserIds: Set<string>
}) {
  const { readers, me, partnerUserIds } = args
  if (!readers || readers.size < 1) {
    return false
  }

  if (partnerUserIds.size > 0) {
    return Array.from(partnerUserIds).some((partnerUserId) => readers.has(partnerUserId))
  }

  return Array.from(readers).some((readerId) => readerId !== me)
}

export async function GET() {
  try {
    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ letters: [], reason: 'missing-env' }, { status: 200 })
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ letters: [], error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const currentCouple = await getCurrentCoupleForUser(supabase, user.id)
    if (!currentCouple.coupleId) {
      return NextResponse.json({ letters: [], reason: 'no-couple' }, { status: 200 })
    }

    const { data, error } = await supabase
      .from('letters')
      .select('id, kind, title, message, mood, anonymous, created_at, created_by')
      .eq('couple_id', currentCouple.coupleId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      logSupabaseError('get-letters', error)
      return NextResponse.json({ letters: [], error: error.message }, { status: 500 })
    }

    const letterRows = (data || []) as LetterRow[]
    const letterIds = letterRows.map((letter) => letter.id)

    const creatorIds = Array.from(
      new Set(
        letterRows
          .map((letter) => letter.created_by)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    )

    let nicknameMap = new Map<string, string>()
    if (creatorIds.length > 0) {
      const { data: nicknameRows, error: nicknameError } = await supabase
        .from('couple_nicknames')
        .select('target_user_id, nickname, updated_at')
        .eq('couple_id', currentCouple.coupleId)
        .in('target_user_id', creatorIds)

      if (!nicknameError && Array.isArray(nicknameRows)) {
        nicknameMap = parseLatestNicknames(nicknameRows as NicknameRow[])
      } else if (nicknameError) {
        logSupabaseError('get-nicknames', nicknameError)
      }
    }

    let readsByLetter = new Map<string, Set<string>>()
    if (letterIds.length > 0) {
      const { data: readRows, error: readError } = await supabase
        .from('letter_reads')
        .select('letter_id, user_id')
        .eq('couple_id', currentCouple.coupleId)
        .in('letter_id', letterIds)

      if (!readError && Array.isArray(readRows)) {
        readsByLetter = buildReadsByLetter(readRows as LetterReadRow[])
      } else if (readError) {
        logSupabaseError('get-letter-reads', readError)
      }
    }

    const partnerUserIds = new Set<string>()
    const { data: memberRows, error: memberError } = await supabase
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', currentCouple.coupleId)
      .neq('user_id', user.id)

    if (!memberError && Array.isArray(memberRows)) {
      for (const row of memberRows as CoupleMemberRow[]) {
        const partnerId = row.user_id?.trim()
        if (partnerId) {
          partnerUserIds.add(partnerId)
        }
      }
    } else if (memberError) {
      logSupabaseError('get-couple-members', memberError)
    }

    const letters = letterRows.map((letter) => {
      const readers = readsByLetter.get(letter.id)
      const openedByMe = Boolean(readers?.has(user.id))
      const openedByPartner = hasPartnerOpened({
        readers,
        me: user.id,
        partnerUserIds
      })
      const createdByMe = Boolean(letter.created_by && letter.created_by === user.id)

      return {
        id: letter.id,
        kind: letter.kind,
        title: letter.title,
        message: letter.message,
        mood: letter.mood,
        anonymous: letter.anonymous,
        created_at: letter.created_at,
        createdByMe,
        openedByMe,
        openedByPartner,
        senderNickname:
          !letter.anonymous && letter.created_by ? nicknameMap.get(letter.created_by) || null : null
      }
    })

    return NextResponse.json(
      {
        letters,
        coupleId: currentCouple.coupleId,
        coupleCode: currentCouple.coupleCode
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ letters: [], error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LettersRequestBody

    if (!body.mode || !validModes.has(body.mode)) {
      return NextResponse.json({ error: 'Loại thư không hợp lệ.' }, { status: 400 })
    }

    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Thiếu trường bắt buộc: message.' }, { status: 400 })
    }

    const supabase = createClient()
    if (supabase) {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (user) {
        const currentCouple = await getCurrentCoupleForUser(supabase, user.id)
        if (currentCouple.coupleId) {
          const { data, error } = await supabase
            .from('letters')
            .insert({
              couple_id: currentCouple.coupleId,
              kind: body.mode,
              title: body.title?.trim() || null,
              message: body.message.trim(),
              mood: body.mode === 'love' ? body.mood?.trim() || null : null,
              anonymous: Boolean(body.anonymous)
            })
            .select('id, kind, title, message, mood, anonymous, created_at')
            .single()

          if (error) {
            logSupabaseError('create-letter', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
          }

          void notifyEvent({
            event: 'letter_received',
            coupleId: currentCouple.coupleId,
            actorUserId: user.id,
            payload: {
              title: body.title?.trim() || null
            }
          })

          return NextResponse.json({
            ok: true,
            source: 'supabase',
            letter: data
          })
        }
      }
    }

    return forwardLettersToWebhook(body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as DeleteLetterRequestBody
    const letterId = body.id?.trim()

    if (!letterId) {
      return NextResponse.json({ error: 'Thiếu id thư cần xoá.' }, { status: 400 })
    }

    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase chưa được cấu hình.' }, { status: 500 })
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 })
    }

    const currentCouple = await getCurrentCoupleForUser(supabase, user.id)
    if (!currentCouple.coupleId) {
      return NextResponse.json({ error: 'Bạn chưa có couple.' }, { status: 403 })
    }

    const { data: existingLetter, error: findError } = await supabase
      .from('letters')
      .select('id, created_by')
      .eq('id', letterId)
      .eq('couple_id', currentCouple.coupleId)
      .maybeSingle()

    if (findError) {
      logSupabaseError('find-letter-for-delete', findError)
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    if (!existingLetter) {
      return NextResponse.json({ error: 'Không tìm thấy thư.' }, { status: 404 })
    }

    if (!existingLetter.created_by || existingLetter.created_by !== user.id) {
      return NextResponse.json({ error: 'Bạn chỉ có thể xoá thư do chính bạn tạo.' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('letters')
      .delete()
      .eq('id', letterId)
      .eq('couple_id', currentCouple.coupleId)
      .eq('created_by', user.id)

    if (deleteError) {
      logSupabaseError('delete-letter', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
