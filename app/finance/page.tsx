import { Metadata } from 'next'
import { FinanceDashboard } from '@/lib/components/pages/finance/finance-dashboard'

export const metadata: Metadata = {
  title: 'LoveHub | Finance',
  description: 'Lightweight local finance tracker with dashboard summary cards.'
}

export default function Page() {
  return <FinanceDashboard />
}
