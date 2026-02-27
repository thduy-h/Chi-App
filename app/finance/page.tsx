import { Metadata } from 'next'
import { LoveHubFeaturePage } from '@/lib/components/pages/lovehub/feature-page'

export const metadata: Metadata = {
  title: 'LoveHub | Finance',
  description: 'Shared budgeting and gift planning for couples in LoveHub.'
}

export default function FinancePage() {
  return (
    <LoveHubFeaturePage
      eyebrow="Finance"
      title="Smart Gift Budgeting"
      description="Plan spending with transparency, set shared limits, and keep your gift ideas thoughtful without budget stress."
      tips={[
        'Create monthly gift and date budgets you both can review.',
        'Track planned versus actual spending in one place.',
        'Add savings goals for bigger future surprises.',
        'Set reminders before important dates and payment deadlines.'
      ]}
    />
  )
}
