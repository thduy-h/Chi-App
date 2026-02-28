import { Metadata } from 'next'

import { TasksPage } from '@/lib/components/pages/tasks/tasks-page'

export const metadata: Metadata = {
  title: 'LoveHub | Tasks',
  description: 'Kanban board for shared tasks and travel planning.'
}

export default function Page() {
  return <TasksPage />
}
