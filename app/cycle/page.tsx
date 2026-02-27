import { Metadata } from 'next'
import { LoveHubFeaturePage } from '@/lib/components/pages/lovehub/feature-page'

export const metadata: Metadata = {
  title: 'LoveHub | Cycle',
  description: 'Track rhythms and relationship check-ins in LoveHub.'
}

export default function CyclePage() {
  return (
    <LoveHubFeaturePage
      eyebrow="Cycle"
      title="Shared Rhythm Tracking"
      description="Keep both partners in sync with gentle reminders, emotional check-ins, and a timeline of meaningful moments."
      tips={[
        'Log monthly patterns to improve planning and empathy.',
        'Capture recurring comfort rituals that help during busy weeks.',
        'Add notes for celebrations, milestones, and check-in days.',
        'Build a simple weekly pulse report to stay connected.'
      ]}
    />
  )
}
