import { Metadata } from 'next'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import { CycleTracker } from '@/lib/components/pages/cycle/cycle-tracker'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Cycle',
  description: 'Period tracker with Supabase-backed settings and local fallback.'
}

export default async function Page() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Khong the tai Cycle Tracker"
        message="Supabase env chua duoc cau hinh. Vui long dang nhap lai sau."
      />
    )
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AuthRequired
        title="Can dang nhap de xem Cycle"
        message="Dang nhap de luu va dong bo cai dat chu ky."
      />
    )
  }

  return <CycleTracker />
}
