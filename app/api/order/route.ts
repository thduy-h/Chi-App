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
        { error: 'Thiếu dữ liệu bắt buộc: name và deliveryTime.' },
        { status: 400 }
      )
    }

    const formspreeUrl = process.env.FORMSPREE_ORDER_URL
    const webhookUrl = process.env.ORDER_WEBHOOK_URL
    const targetUrl = formspreeUrl || webhookUrl

    if (!targetUrl) {
      return NextResponse.json(
        {
          error: 'Chưa cấu hình endpoint nhận đơn. Hãy đặt FORMSPREE_ORDER_URL hoặc ORDER_WEBHOOK_URL.'
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
        { error: 'Không thể chuyển đơn đến endpoint đích.', details: details.slice(0, 500) },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
