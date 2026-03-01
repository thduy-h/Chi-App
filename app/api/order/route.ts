import { NextResponse } from 'next/server'

import { notifyEvent } from '@/lib/notify/notifyEvent'
import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

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
          error:
            'Chưa cấu hình endpoint nhận đơn. Hãy đặt FORMSPREE_ORDER_URL hoặc ORDER_WEBHOOK_URL.'
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

    const supabase = createClient()
    if (supabase) {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (user) {
        const currentCouple = await getCurrentCoupleForUser(supabase, user.id)
        if (currentCouple.coupleId) {
          void notifyEvent({
            event: 'order_created',
            coupleId: currentCouple.coupleId,
            actorUserId: user.id,
            payload: {
              item: body.name,
              note: body.notes
            }
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ không xác định.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
