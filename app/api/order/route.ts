import { NextResponse } from 'next/server'

interface OrderRequestBody {
  name?: string
  notes?: string
  deliveryTime?: string
  foodId?: number
  category?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderRequestBody

    if (!body.name || !body.deliveryTime) {
      return NextResponse.json(
        { error: 'Missing required fields: name and deliveryTime.' },
        { status: 400 }
      )
    }

    const formspreeUrl = process.env.FORMSPREE_ORDER_URL
    const webhookUrl = process.env.ORDER_WEBHOOK_URL
    const targetUrl = formspreeUrl || webhookUrl

    if (!targetUrl) {
      return NextResponse.json(
        {
          error:
            'Order target is not configured. Set FORMSPREE_ORDER_URL or ORDER_WEBHOOK_URL.'
        },
        { status: 503 }
      )
    }

    const forwardPayload = {
      ...body,
      source: 'lovehub-food',
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
        { error: 'Failed to forward order to upstream endpoint.', details: details.slice(0, 500) },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
