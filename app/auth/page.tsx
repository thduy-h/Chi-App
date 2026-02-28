import { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthForm } from '@/lib/components/pages/auth/auth-form'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Đăng nhập | LoveHub',
  description: 'Đăng nhập email cho LoveHub'
}

export default async function AuthPage() {
  const supabase = createClient()
  if (!supabase) {
    return <AuthForm />
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/setup')
  }

  return <AuthForm />
}
