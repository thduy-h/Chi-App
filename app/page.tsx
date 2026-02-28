import { Metadata } from 'next'
import { LoveHubLanding } from '@/lib/components/pages/home/lovehub-landing'

export const metadata: Metadata = {
  title: 'Nha Cao Tho | Khong gian nho cua hai dua',
  description: 'Nha Cao Tho la noi Cao lam tang Tho de cung quan ly bua an, viec chung, tai chinh va thu yeu.'
}

export default function Home() {
  return <LoveHubLanding />
}
