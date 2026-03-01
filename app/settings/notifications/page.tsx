import { Metadata } from 'next'

import { NotificationsSettingsPage } from '@/lib/components/pages/settings/notifications-settings'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Cài đặt thông báo',
  description: 'Quản lý kênh thông báo, liên kết và hủy liên kết Telegram.'
}

export default async function NotificationsSettingsRoute() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Không thể tải cài đặt"
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
        title="Cần đăng nhập để mở cài đặt"
        message="Đăng nhập để quản lý thông báo Telegram và các kênh khác."
      />
    )
  }

  return <NotificationsSettingsPage />
}