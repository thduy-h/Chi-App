import { Metadata } from 'next'
import { FinanceDashboard } from '@/lib/components/pages/finance/finance-dashboard'

export const metadata: Metadata = {
  title: 'LoveHub | Finance',
  description: 'Finance tracker with Supabase sync and local fallback.'
}

export default async function Page() {
  return <FinanceDashboard />
}
