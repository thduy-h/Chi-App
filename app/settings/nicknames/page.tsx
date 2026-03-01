import { Metadata } from 'next'

import { NicknameSettingsPage } from '@/lib/components/pages/settings/nickname-settings'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Biệt danh',
  description: 'Đặt biệt danh cho nhau để hiển thị trong hộp thư LoveHub.'
}

export default async function NicknamesSettingsRoute() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Không thể tải cài đặt biệt danh"
        message="Supabase chưa được cấu hình. Vui lòng thử lại sau."
      />
    )
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AuthRequired
        title="Cần đăng nhập để chỉnh biệt danh"
        message="Đăng nhập để đặt biệt danh cho nhau trong couple."
      />
    )
  }

  return <NicknameSettingsPage />
}
