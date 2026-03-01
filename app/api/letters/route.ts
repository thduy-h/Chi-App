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

const validModes = new Set(['feedback', 'love'])

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
      .select('id, kind, title, message, mood, anonymous, created_at')
      .eq('couple_id', currentCouple.coupleId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ letters: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        letters: data || [],
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
            return NextResponse.json({ error: error.message }, { status: 500 })
          }

          void notifyEvent({
            event: 'letter_received',
            coupleId: currentCouple.coupleId,
            actorUserId: user.id
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
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
