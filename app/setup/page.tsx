import { AuthRequired } from '@/lib/components/shared/auth-required'
import { SetupClient } from '@/lib/components/pages/setup/setup-client'
import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
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

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AuthRequired
        title="Can dang nhap de setup couple"
        message="Dang nhap de tao, join, hoac quan ly couple cua ban."
      />
    )
  }

  const currentCouple = await getCurrentCoupleForUser(supabase, user.id)
  const initialCouple =
    currentCouple.coupleId && currentCouple.coupleCode
      ? {
          id: currentCouple.coupleId,
          code: currentCouple.coupleCode
        }
      : null

  return <SetupClient initialEmail={user.email ?? ''} initialCouple={initialCouple} />
}
