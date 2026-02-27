import { NextResponse } from 'next/server'

interface LettersRequestBody {
  mode?: 'feedback' | 'love'
  title?: string
  message?: string
  mood?: string
  anonymous?: boolean
}

const validModes = new Set(['feedback', 'love'])

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LettersRequestBody

    if (!body.mode || !validModes.has(body.mode)) {
      return NextResponse.json({ error: 'Invalid mode.' }, { status: 400 })
    }

    if (!body.title || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: title and message.' },
        { status: 400 }
      )
    }

    const formspreeUrl = process.env.FORMSPREE_LETTERS_URL
    const webhookUrl = process.env.LETTERS_WEBHOOK_URL
    const targetUrl = formspreeUrl || webhookUrl

    if (!targetUrl) {
      return NextResponse.json(
        {
          error:
            'Letters target is not configured. Set FORMSPREE_LETTERS_URL or LETTERS_WEBHOOK_URL.'
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
      source: 'lovehub-letters',
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
          error: 'Failed to forward letters submission.',
          details: details.slice(0, 500)
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
