import { Metadata } from 'next'
import { FoodPage } from '@/lib/components/pages/food/food-page'

export const metadata: Metadata = {
  title: 'LoveHub | Món ăn',
  description: 'Danh sách món ăn với lọc danh mục, random món và đặt món nhanh.'
}

export default function Page() {
  return <FoodPage />
}
