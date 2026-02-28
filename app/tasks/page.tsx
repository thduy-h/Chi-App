import { Metadata } from 'next'

import { TasksPage } from '@/lib/components/pages/tasks/tasks-page'

export const metadata: Metadata = {
  title: 'LoveHub | Việc chung',
  description: 'Bảng Kanban cho việc chung và kế hoạch du lịch.'
}

export default async function Page() {
  return <TasksPage />
}
