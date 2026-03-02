import { Metadata } from 'next'
import { FoodPage } from '@/lib/components/pages/food/food-page'
import { resolveHomeMode } from '@/lib/home-mode'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Món ăn',
  description: 'Danh sách món ăn với lọc danh mục, random món và đặt món nhanh.'
}

export default async function Page() {
  const mode = await resolveHomeMode(createClient())
  return <FoodPage mode={mode} />
}
