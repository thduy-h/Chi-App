import { Metadata } from 'next'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import { CycleTracker } from '@/lib/components/pages/cycle/cycle-tracker'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Chu kỳ',
  description: 'Theo dõi chu kỳ với đồng bộ Supabase và fallback local.'
}

export default async function Page() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Không thể tải trang Chu kỳ"
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
        title="Cần đăng nhập để xem Chu kỳ"
        message="Đăng nhập để lưu và đồng bộ cài đặt chu kỳ."
      />
    )
  }

  return <CycleTracker />
}
