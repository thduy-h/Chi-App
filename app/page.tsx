import { Metadata } from 'next'

import { LoveHubLanding } from '@/lib/components/pages/home/lovehub-landing'
import { getCurrentCoupleForUser, selectCoupleById } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Nhà Cáo Thỏ | Không gian nhỏ của hai đứa',
  description:
    'Nhà Cáo Thỏ là nơi Cáo làm tặng Thỏ để cùng quản lý bữa ăn, việc chung, tài chính và thư yêu.'
}

type HomeMode = 'a' | 'b'

function parseEmailList(raw: string | undefined) {
  return new Set(
    (raw || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
}

async function resolveHomeMode(): Promise<HomeMode> {
  try {
    const supabase = createClient()
    if (!supabase) {
      return 'b'
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return 'b'
    }

    const allowedEmails = parseEmailList(process.env.LOVEHUB_HOME_MODE_A_EMAILS)
    const userEmail = user.email?.trim().toLowerCase() || ''
    if (userEmail && allowedEmails.has(userEmail)) {
      return 'a'
    }

    const ownerUserId = process.env.LOVEHUB_HOME_OWNER_USER_ID?.trim()
    if (!ownerUserId) {
      return 'b'
    }

    const currentCouple = await getCurrentCoupleForUser(supabase, user.id)
    if (!currentCouple.coupleId) {
      return 'b'
    }

    const couple = await selectCoupleById(supabase, currentCouple.coupleId, 'home-mode-check')
    if (couple?.created_by && couple.created_by === ownerUserId) {
      return 'a'
    }

    return 'b'
  } catch {
    return 'b'
  }
}

export default async function Home() {
  const mode = await resolveHomeMode()
  return <LoveHubLanding mode={mode} />
}
