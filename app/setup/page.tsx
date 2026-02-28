import { AuthRequired } from '@/lib/components/shared/auth-required'
import { SetupClient } from '@/lib/components/pages/setup/setup-client'
import { getCurrentCoupleContext } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

export default async function SetupPage() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Khong the tai setup"
        message="Supabase env chua duoc cau hinh. Vui long dang nhap lai sau khi cau hinh xong."
      />
    )
  }

  const context = await getCurrentCoupleContext(supabase)
  if (context.status === 'unauthenticated' || !context.userId) {
    return (
      <AuthRequired
        title="Can dang nhap de setup couple"
        message="Dang nhap de tao, join, hoac quan ly couple cua ban."
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
