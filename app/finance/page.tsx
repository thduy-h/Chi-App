import { Metadata } from 'next'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import { FinanceDashboard } from '@/lib/components/pages/finance/finance-dashboard'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Finance',
  description: 'Finance tracker with Supabase sync and local fallback.'
}

export default async function Page() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Khong the tai Finance"
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
        title="Can dang nhap de xem Finance"
        message="Dang nhap de theo doi thu chi trong dashboard."
      />
    )
  }

  return <FinanceDashboard />
}
