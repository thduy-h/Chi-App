import { Metadata } from 'next'
import { FinanceDashboard } from '@/lib/components/pages/finance/finance-dashboard'

export const metadata: Metadata = {
  title: 'LoveHub | Tài chính',
  description: 'Theo dõi thu chi với đồng bộ Supabase và fallback local.'
}

export default async function Page() {
  return <FinanceDashboard />
}
