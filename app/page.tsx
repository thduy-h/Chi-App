import { Metadata } from 'next'
import { LoveHubLanding } from '@/lib/components/pages/home/lovehub-landing'

export const metadata: Metadata = {
  title: 'LoveHub | Shared Life, Better Moments',
  description: 'Modern relationship workspace for food plans, tasks, budgets, cycle tracking, and letters.'
}

export default function Home() {
  return <LoveHubLanding />
}
