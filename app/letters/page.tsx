import { Metadata } from 'next'
import { AuthRequired } from '@/lib/components/shared/auth-required'
import { LettersPage } from '@/lib/components/pages/letters/letters-page'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Letters',
  description: 'Gửi góp ý hoặc thư tình qua route server-side an toàn.'
}

export default async function Page() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Khong the tai Letters"
        message="Supabase env chua duoc cau hinh. Vui long dang nhap lai sau."
      />
    )
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AuthRequired
        title="Can dang nhap de xem Letters"
        message="Dang nhap de gui va nhan thu trong couple."
      />
    )
  }

  return <LettersPage />
}
