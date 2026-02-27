'use client'

import { useMemo, useState } from 'react'
import { KanbanBoard } from '@/lib/components/pages/tasks/kanban-board'
import { ItineraryPlanner } from '@/lib/components/pages/tasks/itinerary-planner'
import { ItineraryDay, KanbanColumn, KanbanTask } from '@/lib/components/pages/tasks/types'

const sharedColumns: KanbanColumn[] = [
  { id: 'todo', title: 'Cần làm', status: 'todo' },
  { id: 'in-progress', title: 'Đang làm', status: 'in-progress' },
  { id: 'done', title: 'Xong', status: 'done' }
]

const sharedTasks: KanbanTask[] = [
  {
    id: 'shared-1',
    content: 'Lên danh sách việc nhà tuần này',
    status: 'todo',
    position: 0,
    note: 'Ưu tiên việc cần xử lý trước thứ 6.',
    createdAt: '2026-01-01T10:00:00.000Z'
  },
  {
    id: 'shared-2',
    content: 'Mua quà kỷ niệm',
    status: 'in-progress',
    position: 0,
    dueDate: '2026-03-01',
    createdAt: '2026-01-01T10:30:00.000Z'
  },
  {
    id: 'shared-3',
    content: 'Đặt nhà hàng cuối tuần',
    status: 'done',
    position: 0,
    createdAt: '2026-01-01T11:00:00.000Z'
  }
]

const travelColumns: KanbanColumn[] = [
  { id: 'ideas', title: 'Ý tưởng', status: 'ideas' },
  { id: 'booking', title: 'Đặt chỗ', status: 'booking' },
  { id: 'packing', title: 'Chuẩn bị', status: 'packing' },
  { id: 'completed', title: 'Hoàn tất', status: 'completed' }
]

const travelTasks: KanbanTask[] = [
  {
    id: 'travel-1',
    content: 'Chọn điểm đến cho chuyến 3N2Đ',
    status: 'ideas',
    position: 0,
    createdAt: '2026-01-01T12:00:00.000Z'
  },
  {
    id: 'travel-2',
    content: 'So sánh vé máy bay và tàu',
    status: 'booking',
    position: 0,
    createdAt: '2026-01-01T12:15:00.000Z'
  },
  {
    id: 'travel-3',
    content: 'Chuẩn bị checklist đồ dùng',
    status: 'packing',
    position: 0,
    createdAt: '2026-01-01T12:30:00.000Z'
  }
]

const itineraryDays: ItineraryDay[] = [
  {
    id: 'day-1',
    title: 'Ngày 1',
    date: '',
    activities: '- Di chuyển đến địa điểm\n- Check-in khách sạn\n- Ăn tối nhẹ'
  },
  {
    id: 'day-2',
    title: 'Ngày 2',
    date: '',
    activities: '- Khám phá điểm tham quan chính\n- Cafe chiều\n- Dạo phố đêm'
  },
  {
    id: 'day-3',
    title: 'Ngày 3',
    date: '',
    activities: '- Mua quà lưu niệm\n- Trả phòng\n- Di chuyển về'
  }
]

type TaskTab = 'shared' | 'travel'

export const TasksPage = () => {
  const [activeTab, setActiveTab] = useState<TaskTab>('shared')

  const tabCopy = useMemo(
    () => ({
      shared: {
        title: 'Tasks chung',
        description: 'Board chung để phân việc hằng ngày, nhắc lịch và theo dõi tiến độ.'
      },
      travel: {
        title: 'Plan du lịch',
        description:
          'Lên kế hoạch chuyến đi với board chuẩn bị + lịch trình theo ngày ở cùng một chỗ.'
      }
    }),
    []
  )

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-rose-100/80 via-white to-white dark:from-rose-950/20 dark:via-gray-900 dark:to-gray-900" />

      <section className="relative container mx-auto px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <span className="inline-flex rounded-full border border-rose-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 shadow-sm dark:border-rose-900 dark:bg-gray-900 dark:text-rose-300">
            LoveHub Tasks
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Quản lý việc chung và kế hoạch du lịch
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300 sm:text-base">
            Dựa trên kanban patterns từ repo tham chiếu, được tích hợp lại theo phong cách LoveHub và
            lưu tự động trong trình duyệt.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-rose-100 bg-white p-2 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('shared')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === 'shared'
                ? 'bg-rose-600 text-white shadow'
                : 'text-gray-700 hover:bg-rose-50 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
            >
              Tasks chung
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('travel')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === 'travel'
                ? 'bg-rose-600 text-white shadow'
                : 'text-gray-700 hover:bg-rose-50 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
            >
              Plan du lịch
            </button>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-rose-900/40 dark:bg-gray-900 dark:text-gray-200">
          <p className="font-semibold">{tabCopy[activeTab].title}</p>
          <p className="mt-1 text-gray-600 dark:text-gray-300">{tabCopy[activeTab].description}</p>
        </div>

        {activeTab === 'shared' && (
          <KanbanBoard
            storageKey="lovehub.tasks.shared.v1"
            boardLabel="Tasks chung"
            defaultColumns={sharedColumns}
            defaultTasks={sharedTasks}
          />
        )}

        {activeTab === 'travel' && (
          <div className="space-y-5">
            <KanbanBoard
              storageKey="lovehub.tasks.travel.v1"
              boardLabel="Plan du lịch"
              defaultColumns={travelColumns}
              defaultTasks={travelTasks}
            />
            <ItineraryPlanner
              storageKey="lovehub.tasks.travel.itinerary.v1"
              defaultDays={itineraryDays}
            />
          </div>
        )}
      </section>
    </main>
  )
}
