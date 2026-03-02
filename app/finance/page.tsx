import { Metadata } from 'next'
import { resolveHomeMode } from '@/lib/home-mode'
import { FinanceDashboard } from '@/lib/components/pages/finance/finance-dashboard'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Tài chính',
  description: 'Theo dõi thu chi với đồng bộ Supabase và fallback local.'
}

export default async function Page() {
  const mode = await resolveHomeMode(createClient())
  return <FinanceDashboard mode={mode} />
}
