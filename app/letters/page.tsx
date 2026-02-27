import { Metadata } from 'next'
import { LoveHubFeaturePage } from '@/lib/components/pages/lovehub/feature-page'

export const metadata: Metadata = {
  title: 'LoveHub | Letters',
  description: 'Meaningful letters and memory notes in LoveHub.'
}

export default function LettersPage() {
  return (
    <LoveHubFeaturePage
      eyebrow="Letters"
      title="Words That Stay"
      description="Capture gratitude, encouragement, and playful notes that turn everyday moments into lasting memories."
      tips={[
        'Write one short appreciation note each week.',
        'Keep a private list of moments you never want to forget.',
        'Draft special-day letters in advance and schedule delivery.',
        'Create a shared archive of your favorite messages.'
      ]}
    />
  )
}
