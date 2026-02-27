import { Metadata } from 'next'
import { TasksPage } from '@/lib/components/pages/tasks/tasks-page'

export const metadata: Metadata = {
  title: 'LoveHub | Tasks',
  description: 'Kanban board cho tasks chung và plan du lịch với localStorage.'
}

export default function Page() {
  return <TasksPage />
}
