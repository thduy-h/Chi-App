import { AuthRequired } from '@/lib/components/shared/auth-required'
import { SetupClient } from '@/lib/components/pages/setup/setup-client'
import { getCurrentCoupleContext } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

export default async function SetupPage() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Không thể tải trang thiết lập"
        message="Supabase chưa được cấu hình. Vui lòng thử lại sau khi cấu hình xong."
      />
    )
  }

  const context = await getCurrentCoupleContext(supabase)
  if (context.status === 'unauthenticated' || !context.userId) {
    return (
      <AuthRequired
        title="Cần đăng nhập để thiết lập couple"
        message="Đăng nhập để tạo, tham gia hoặc quản lý couple của bạn."
      />
    )
  }

  const initialCouple =
    context.status === 'ready' && context.coupleId && context.coupleCode
      ? {
          id: context.coupleId,
          code: context.coupleCode
        }
      : null

  return <SetupClient initialEmail={context.userEmail ?? ''} initialCouple={initialCouple} />
}
