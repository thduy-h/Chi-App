import { Metadata } from 'next'
import { CycleTracker } from '@/lib/components/pages/cycle/cycle-tracker'

export const metadata: Metadata = {
  title: 'LoveHub | Cycle',
  description: 'Period tracker with Supabase-backed settings and local fallback.'
}

export default function Page() {
  return <CycleTracker />
}
