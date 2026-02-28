import { Metadata } from 'next'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import { LettersPage } from '@/lib/components/pages/letters/letters-page'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Lá thư',
  description: 'Gửi góp ý hoặc thư tình qua route server-side an toàn.'
}

export default async function Page() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Không thể tải trang Lá thư"
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
        title="Cần đăng nhập để xem Lá thư"
        message="Đăng nhập để gửi và nhận thư trong couple."
      />
    )
  }

  return <LettersPage />
}
