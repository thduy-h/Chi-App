'use client'

import { useEffect, useMemo, useState } from 'react'

import { ItineraryPlanner } from '@/lib/components/pages/tasks/itinerary-planner'
import { KanbanBoard } from '@/lib/components/pages/tasks/kanban-board'
import { ItineraryDay, KanbanColumn, KanbanTask } from '@/lib/components/pages/tasks/types'

const sharedColumns: KanbanColumn[] = [
  { id: 'todo', title: 'Can lam', status: 'todo' },
  { id: 'in-progress', title: 'Dang lam', status: 'in-progress' },
  { id: 'done', title: 'Xong', status: 'done' }
]

const sharedTasks: KanbanTask[] = [
  {
    id: 'shared-1',
    content: 'Len danh sach viec nha tuan nay',
    status: 'todo',
    position: 0,
    note: 'Uu tien viec can xu ly truoc thu 6.',
    createdAt: '2026-01-01T10:00:00.000Z'
  },
  {
    id: 'shared-2',
    content: 'Mua qua ky niem',
    status: 'in-progress',
    position: 0,
    dueDate: '2026-03-01',
    createdAt: '2026-01-01T10:30:00.000Z'
  },
  {
    id: 'shared-3',
    content: 'Dat nha hang cuoi tuan',
    status: 'done',
    position: 0,
    createdAt: '2026-01-01T11:00:00.000Z'
  }
]

const travelColumns: KanbanColumn[] = [
  { id: 'ideas', title: 'Y tuong', status: 'ideas' },
  { id: 'booking', title: 'Dat cho', status: 'booking' },
  { id: 'packing', title: 'Chuan bi', status: 'packing' },
  { id: 'completed', title: 'Hoan tat', status: 'completed' }
]

const travelTasks: KanbanTask[] = [
  {
    id: 'travel-1',
    content: 'Chon diem den cho chuyen 3N2D',
    status: 'ideas',
    position: 0,
    createdAt: '2026-01-01T12:00:00.000Z'
  },
  {
    id: 'travel-2',
    content: 'So sanh ve may bay va tau',
    status: 'booking',
    position: 0,
    createdAt: '2026-01-01T12:15:00.000Z'
  },
  {
    id: 'travel-3',
    content: 'Chuan bi checklist do dung',
    status: 'packing',
    position: 0,
    createdAt: '2026-01-01T12:30:00.000Z'
  }
]

const itineraryDays: ItineraryDay[] = [
  {
    id: 'day-1',
    title: 'Ngay 1',
    date: '',
    activities: '- Di chuyen den dia diem\n- Check-in khach san\n- An toi nhe'
  },
  {
    id: 'day-2',
    title: 'Ngay 2',
    date: '',
    activities: '- Kham pha diem tham quan chinh\n- Cafe chieu\n- Dao pho dem'
  },
  {
    id: 'day-3',
    title: 'Ngay 3',
    date: '',
    activities: '- Mua qua luu niem\n- Tra phong\n- Di chuyen ve'
  }
]

type TaskTab = 'shared' | 'travel'
type SyncMode = 'local' | 'supabase'

interface CoupleResponse {
  user: { id: string; email: string } | null
  couple: { id: string; code: string } | null
}

export const TasksPage = () => {
  const [activeTab, setActiveTab] = useState<TaskTab>('shared')
  const [syncMode, setSyncMode] = useState<SyncMode>('local')
  const [activeCoupleId, setActiveCoupleId] = useState<string | null>(null)
  const [activeCoupleCode, setActiveCoupleCode] = useState<string | null>(null)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadCoupleContext = async () => {
      try {
        const response = await fetch('/api/couple/current', {
          method: 'GET',
          cache: 'no-store'
        })
        const payload = (await response.json()) as CoupleResponse
        if (cancelled) {
          return
        }

        setCurrentEmail(payload.user?.email ?? null)
        setActiveCoupleId(payload.couple?.id ?? null)
        setActiveCoupleCode(payload.couple?.code ?? null)
        setSyncMode(payload.user?.id && payload.couple?.id ? 'supabase' : 'local')
      } catch {
        if (cancelled) {
          return
        }

        setCurrentEmail(null)
        setActiveCoupleId(null)
        setActiveCoupleCode(null)
        setSyncMode('local')
      }
    }

    void loadCoupleContext()
    return () => {
      cancelled = true
    }
  }, [])

  const tabCopy = useMemo(
    () => ({
      shared: {
        title: 'Tasks chung',
        description: 'Board chung de phan viec hang ngay va theo doi tien do.'
      },
      travel: {
        title: 'Plan du lich',
        description: 'Len ke hoach chuyen di voi board chuan bi va lich trinh theo ngay.'
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
            Quan ly viec chung va ke hoach du lich
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300 sm:text-base">
            Board drag-and-drop co ho tro Supabase sync khi da login va da join couple.
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-rose-900/40 dark:bg-gray-900 dark:text-gray-200">
          <p>
            <span className="font-semibold">Mode:</span>{' '}
            {syncMode === 'supabase' ? 'Supabase (online)' : 'LocalStorage (offline)'}
          </p>
          {currentEmail && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email: {currentEmail}</p>}
          {activeCoupleCode && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Couple: #{activeCoupleCode}</p>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-rose-100 bg-white p-2 shadow-sm dark:border-rose-900/40 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('shared')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === 'shared'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-gray-700 hover:bg-rose-50 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Tasks chung
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('travel')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === 'travel'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-gray-700 hover:bg-rose-50 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Plan du lich
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
            boardKey="tasks"
            syncMode={syncMode}
            activeCoupleId={activeCoupleId}
            defaultColumns={sharedColumns}
            defaultTasks={sharedTasks}
          />
        )}

        {activeTab === 'travel' && (
          <div className="space-y-5">
            <KanbanBoard
              storageKey="lovehub.tasks.travel.v1"
              boardLabel="Plan du lich"
              boardKey="travel"
              syncMode={syncMode}
              activeCoupleId={activeCoupleId}
              defaultColumns={travelColumns}
              defaultTasks={travelTasks}
            />
            <ItineraryPlanner storageKey="lovehub.tasks.travel.itinerary.v1" defaultDays={itineraryDays} />
          </div>
        )}
      </section>
    </main>
  )
}
