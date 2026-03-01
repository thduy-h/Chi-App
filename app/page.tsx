import { Metadata } from 'next'

import { resolveHomeMode } from '@/lib/home-mode'
import { LoveHubLanding } from '@/lib/components/pages/home/lovehub-landing'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Nhà Cáo Thỏ | Không gian nhỏ của hai đứa',
  description:
    'Nhà Cáo Thỏ là nơi Cáo làm tặng Thỏ để cùng quản lý bữa ăn, việc chung, tài chính và thư yêu.'
}

export default async function Home() {
  const mode = await resolveHomeMode(createClient())
  return <LoveHubLanding mode={mode} />
}
