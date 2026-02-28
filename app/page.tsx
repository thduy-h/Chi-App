import { Metadata } from 'next'
import { LoveHubLanding } from '@/lib/components/pages/home/lovehub-landing'

export const metadata: Metadata = {
  title: 'Nhà Cáo Thỏ | Không gian nhỏ của hai đứa',
  description:
    'Nhà Cáo Thỏ là nơi Cáo làm tặng Thỏ để cùng quản lý bữa ăn, việc chung, tài chính và thư yêu.'
}

export default function Home() {
  return <LoveHubLanding />
}
