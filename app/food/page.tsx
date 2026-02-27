import { Metadata } from 'next'
import { LoveHubFeaturePage } from '@/lib/components/pages/lovehub/feature-page'

export const metadata: Metadata = {
  title: 'LoveHub | Food',
  description: 'Food surprises and date-night planning in LoveHub.'
}

export default function FoodPage() {
  return (
    <LoveHubFeaturePage
      eyebrow="Food"
      title="Delicious Surprises"
      description="Plan moments around food with warm, low-pressure ideas for weeknights, birthdays, and tiny celebrations."
      tips={[
        'Create a rotating date-night menu with one new dish each week.',
        'Save favorite cafes and comfort orders for quick surprises.',
        'Plan a shared grocery list for your next home dinner.',
        'Set reminders for special-day breakfast or dessert drops.'
      ]}
    />
  )
}
