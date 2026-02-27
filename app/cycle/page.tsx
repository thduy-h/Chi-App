import { Metadata } from 'next'
import { CycleTracker } from '@/lib/components/pages/cycle/cycle-tracker'

export const metadata: Metadata = {
  title: 'LoveHub | Cycle',
  description: 'Local period tracker with prediction, countdown, and month calendar.'
}

export default function Page() {
  return <CycleTracker />
}
