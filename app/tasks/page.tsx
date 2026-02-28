import { Metadata } from 'next'

import { AuthRequired } from '@/lib/components/shared/auth-required'
import { TasksPage } from '@/lib/components/pages/tasks/tasks-page'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Tasks',
  description: 'Kanban board for shared tasks and travel planning.'
}

export default async function Page() {
  const supabase = createClient()
  if (!supabase) {
    return (
      <AuthRequired
        title="Khong the tai Tasks"
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
        title="Can dang nhap de xem Tasks"
        message="Dang nhap de quan ly cong viec va board du lich."
      />
    )
  }

  return <TasksPage />
}
