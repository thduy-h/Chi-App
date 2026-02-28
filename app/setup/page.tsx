import { redirect } from 'next/navigation'

import { SetupClient } from '@/lib/components/pages/setup/setup-client'
import { getCurrentCoupleForUser } from '@/lib/supabase/couples'
import { createClient } from '@/lib/supabase/server'

export default async function SetupPage() {
  const supabase = createClient()
  if (!supabase) {
    redirect('/auth?error=missing-env')
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
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
