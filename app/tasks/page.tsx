import { Metadata } from 'next'
import { LoveHubFeaturePage } from '@/lib/components/pages/lovehub/feature-page'

export const metadata: Metadata = {
  title: 'LoveHub | Tasks',
  description: 'Shared task planning for couples in LoveHub.'
}

export default function TasksPage() {
  return (
    <LoveHubFeaturePage
      eyebrow="Tasks"
      title="Shared Tasks, Zero Friction"
      description="Split responsibilities clearly so more energy goes to quality time and fewer conversations end in confusion."
      tips={[
        'Assign recurring chores with fair rotation.',
        'Set due dates for gifts, bookings, and event prep.',
        'Track small wins and completed tasks together.',
        'Create a low-stress weekly reset checklist.'
      ]}
    />
  )
}
