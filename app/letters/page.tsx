import { Metadata } from 'next'
import { LettersPage } from '@/lib/components/pages/letters/letters-page'

export const metadata: Metadata = {
  title: 'LoveHub | Letters',
  description: 'Gửi góp ý hoặc thư tình qua route server-side an toàn.'
}

export default function Page() {
  return <LettersPage />
}
