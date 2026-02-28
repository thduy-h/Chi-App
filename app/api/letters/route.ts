import { NextResponse } from 'next/server'

import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

interface LettersRequestBody {
  mode?: 'feedback' | 'love'
  title?: string
  message?: string
  mood?: string
  anonymous?: boolean
}

const validModes = new Set(['feedback', 'love'])

const forwardLettersToWebhook = async (body: LettersRequestBody) => {
  const formspreeUrl = process.env.FORMSPREE_LETTERS_URL
  const webhookUrl = process.env.LETTERS_WEBHOOK_URL
  const targetUrl = formspreeUrl || webhookUrl

  if (!targetUrl) {
    return NextResponse.json(
      {
        error: 'Chưa cấu hình endpoint nhận thư. Hãy đặt FORMSPREE_LETTERS_URL hoặc LETTERS_WEBHOOK_URL.'
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
      return NextResponse.json({ error: 'Mode không hợp lệ.' }, { status: 400 })
    }

    if (!body.title || !body.message) {
      return NextResponse.json(
        { error: 'Thiếu trường bắt buộc: title và message.' },
        { status: 400 }
      )
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
              title: body.title.trim(),
              message: body.message.trim(),
              mood: body.mood?.trim() || null,
              anonymous: Boolean(body.anonymous)
            })
            .select('id, kind, title, message, mood, anonymous, created_at')
            .single()

          if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
          }

          return NextResponse.json({
            ok: true,
            source: 'supabase',
            letter: data
          })
        }
      }
    }

    // Logged-out (or no couple) behavior: keep existing webhook submit path.
    return forwardLettersToWebhook(body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
