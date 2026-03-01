import { Metadata } from 'next'

import { resolveHomeMode } from '@/lib/home-mode'
import { TasksPage } from '@/lib/components/pages/tasks/tasks-page'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LoveHub | Việc chung',
  description: 'Bảng Kanban cho việc chung và kế hoạch du lịch.'
}

export default async function Page() {
  const mode = await resolveHomeMode(createClient())
  return <TasksPage mode={mode} />
}
