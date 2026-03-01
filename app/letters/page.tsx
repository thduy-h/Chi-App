import { Metadata } from 'next'

import { resolveHomeMode } from '@/lib/home-mode'
import { LettersInboxPage } from '@/lib/components/pages/letters/letters-inbox-page'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Hộp thư',
  description: 'Hộp thư couple với giao diện phong bì và trạng thái đã mở.'
}

export default async function LettersInboxRoute() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Không thể tải hộp thư"
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
        title="Cần đăng nhập để xem hộp thư"
        message="Đăng nhập để gửi và nhận thư trong couple."
      />
    )
  }

  const mode = await resolveHomeMode(supabase)
  return <LettersInboxPage mode={mode} />
}
