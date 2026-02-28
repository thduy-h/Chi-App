'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'

import { ItineraryPlanner } from '@/lib/components/pages/tasks/itinerary-planner'
import { KanbanBoard } from '@/lib/components/pages/tasks/kanban-board'
import { BoardState, ItineraryDay, KanbanColumn, KanbanTask } from '@/lib/components/pages/tasks/types'
import { setAlert } from '@/lib/features/alert/alertSlice'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { logGetMyCoupleRawOnce, normalizeRpcRow } from '@/lib/supabase/couples'
import type { Database } from '@/lib/supabase/types'

const SHARED_STORAGE_KEY = 'lovehub.tasks.shared.v1'
const TRAVEL_STORAGE_KEY = 'lovehub.tasks.travel.v1'
const IMPORT_FLAG_PREFIX = 'lovehub_tasks_imported_'

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
    activities: '- Khám phá điểm tham quan chính\n- Cà phê chiều\n- Dạo phố đêm'
  },
  {
    id: 'day-3',
    title: 'Ngày 3',
    date: '',
    activities: '- Mua quà lưu niệm\n- Trả phòng\n- Di chuyển về'
  }
]

type TaskTab = 'shared' | 'travel'
type SyncMode = 'local' | 'supabase'
type TaskInsert = Database['public']['Tables']['tasks']['Insert']

const sanitizeStatus = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

const createTaskId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const rand = Math.floor(Math.random() * 16)
      const value = char === 'x' ? rand : (rand & 0x3) | 0x8
      return value.toString(16)
    })

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const parseOfflineBoardTasks = (raw: string | null): KanbanTask[] => {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as Partial<BoardState>
    if (!Array.isArray(parsed.tasks)) {
      return []
    }
    return parsed.tasks
      .filter((task): task is KanbanTask => Boolean(task?.id && task?.content && task?.status))
      .map((task, index) => ({
        ...task,
        createdAt: task.createdAt || new Date().toISOString(),
        position: Number.isFinite(task.position) ? task.position : index
      }))
  } catch {
    return []
  }
}

const chunkRows = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) {
    return [items]
  }
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

export const TasksPage = () => {
  const dispatch = useDispatch()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [activeTab, setActiveTab] = useState<TaskTab>('shared')
  const [syncMode, setSyncMode] = useState<SyncMode>('local')
  const [activeCoupleId, setActiveCoupleId] = useState<string | null>(null)
  const [activeCoupleCode, setActiveCoupleCode] = useState<string | null>(null)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [isContextLoading, setIsContextLoading] = useState(true)
  const [showImportBanner, setShowImportBanner] = useState(false)
  const [isImportingOffline, setIsImportingOffline] = useState(false)
  const [boardRefreshToken, setBoardRefreshToken] = useState(0)

  const logSupabaseError = useCallback((context: string, error: unknown) => {
    const candidate = error as {
      code?: string | null
      message?: string | null
      details?: string | null
      hint?: string | null
    }
    console.error(`[tasks-page] ${context}`, {
      code: candidate?.code ?? null,
      message: candidate?.message ?? String(error),
      details: candidate?.details ?? null,
      hint: candidate?.hint ?? null
    })
  }, [])

  const toErrorMessage = useCallback((error: unknown, fallback: string) => {
    const candidate = error as { code?: string | null; message?: string | null }
    const message = candidate?.message ?? fallback
    const code = candidate?.code ?? null
    return code ? `${message} (${code})` : message
  }, [])

  const hasOfflineTasks = useCallback(() => {
    const shared = parseOfflineBoardTasks(localStorage.getItem(SHARED_STORAGE_KEY))
    const travel = parseOfflineBoardTasks(localStorage.getItem(TRAVEL_STORAGE_KEY))
    return shared.length > 0 || travel.length > 0
  }, [])

  const loadCoupleContext = useCallback(async () => {
    if (!supabase) {
      setCurrentEmail(null)
      setActiveCoupleId(null)
      setActiveCoupleCode(null)
      setSyncMode('local')
      setShowImportBanner(false)
      return
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError) {
      logSupabaseError('auth.getUser', userError)
    }

    if (!user) {
      setCurrentEmail(null)
      setActiveCoupleId(null)
      setActiveCoupleCode(null)
      setSyncMode('local')
      setShowImportBanner(false)
      return
    }

    setCurrentEmail(user.email ?? null)

    const { data: coupleData, error: coupleError } = await supabase.rpc('get_my_couple')
    logGetMyCoupleRawOnce('tasks/loadCoupleContext', coupleData)
    if (coupleError) {
      logSupabaseError('rpc.get_my_couple', coupleError)
      dispatch(
        setAlert({
          title: 'Cảnh báo',
          message: toErrorMessage(coupleError, 'Không thể tải dữ liệu couple'),
          type: 'warning'
        })
      )
      setActiveCoupleId(null)
      setActiveCoupleCode(null)
      setSyncMode('local')
      setShowImportBanner(false)
      return
    }

    const couple = normalizeRpcRow(coupleData)
    if (!couple?.id) {
      setActiveCoupleId(null)
      setActiveCoupleCode(null)
      setSyncMode('local')
      setShowImportBanner(false)
      return
    }

    setActiveCoupleId(couple.id)
    setActiveCoupleCode(couple.code)
    setSyncMode('supabase')

    const importedKey = `${IMPORT_FLAG_PREFIX}${couple.id}`
    const imported = localStorage.getItem(importedKey) === 'true'
    setShowImportBanner(!imported && hasOfflineTasks())
  }, [dispatch, hasOfflineTasks, logSupabaseError, supabase, toErrorMessage])

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      setIsContextLoading(true)
      try {
        await loadCoupleContext()
      } finally {
        if (!cancelled) {
          setIsContextLoading(false)
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [loadCoupleContext])

  const buildImportRows = useCallback((coupleId: string): TaskInsert[] => {
    const byBoard: Array<{ board: 'tasks' | 'travel'; tasks: KanbanTask[] }> = [
      { board: 'tasks', tasks: parseOfflineBoardTasks(localStorage.getItem(SHARED_STORAGE_KEY)) },
      { board: 'travel', tasks: parseOfflineBoardTasks(localStorage.getItem(TRAVEL_STORAGE_KEY)) }
    ]

    return byBoard.flatMap(({ board, tasks }) =>
      tasks.map((task, index) => ({
        id: uuidPattern.test(task.id) ? task.id : createTaskId(),
        couple_id: coupleId,
        board,
        title: task.content,
        description: task.note ?? null,
        status: sanitizeStatus(task.status) || 'todo',
        priority: task.priority ?? 'normal',
        due_date: task.dueDate ?? null,
        sort_order: Number.isFinite(task.position) ? Number(task.position) : index
      }))
    )
  }, [])

  const handleImportOffline = useCallback(async () => {
    if (!supabase || !activeCoupleId) {
      return
    }

    setIsImportingOffline(true)
    try {
      const importRows = buildImportRows(activeCoupleId)
      if (importRows.length === 0) {
        localStorage.setItem(`${IMPORT_FLAG_PREFIX}${activeCoupleId}`, 'true')
        setShowImportBanner(false)
        dispatch(
          setAlert({
            title: 'Không có dữ liệu',
            message: 'Không tìm thấy task offline để import.',
            type: 'info'
          })
        )
        return
      }

      const batches = chunkRows(importRows, 50)
      for (const batch of batches) {
        const { error } = await supabase.from('tasks').upsert(batch, { onConflict: 'id' })
        if (error) {
          throw error
        }
      }

      localStorage.setItem(`${IMPORT_FLAG_PREFIX}${activeCoupleId}`, 'true')
      setShowImportBanner(false)
      setBoardRefreshToken((value) => value + 1)
      dispatch(
        setAlert({
          title: 'Import thành công',
          message: `Đã import ${importRows.length} task offline lên cloud.`,
          type: 'success'
        })
      )
    } catch (error) {
      logSupabaseError('import.offlineTasks', error)
      dispatch(
        setAlert({
          title: 'Import thất bại',
          message: toErrorMessage(error, 'Không thể import dữ liệu offline'),
          type: 'warning'
        })
      )
    } finally {
      setIsImportingOffline(false)
    }
  }, [activeCoupleId, buildImportRows, dispatch, logSupabaseError, supabase, toErrorMessage])

  const tabCopy = useMemo(
    () => ({
      shared: {
        title: 'Việc chung',
        description: 'Bảng chung để phân việc hằng ngày và theo dõi tiến độ.'
      },
      travel: {
        title: 'Kế hoạch du lịch',
        description: 'Lên kế hoạch chuyến đi với board chuẩn bị và lịch trình theo ngày.'
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
            LoveHub Việc Chung
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Quản lý việc chung và kế hoạch du lịch
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300 sm:text-base">
            Board kéo-thả, ưu tiên offline. Khi đã đăng nhập và có couple, dữ liệu sẽ đồng bộ với Supabase.
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-rose-900/40 dark:bg-gray-900 dark:text-gray-200">
          <p>
            <span className="font-semibold">Chế độ:</span>{' '}
            {syncMode === 'supabase' ? 'Đồng bộ Supabase' : 'Local trên thiết bị'}
          </p>
          {isContextLoading && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Đang kiểm tra phiên đăng nhập...</p>}
          {currentEmail && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email: {currentEmail}</p>}
          {activeCoupleCode && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Couple: #{activeCoupleCode}</p>
          )}
        </div>

        {syncMode === 'supabase' && showImportBanner && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
            <p className="font-semibold">Bạn có dữ liệu offline. Import lên cloud?</p>
            <p className="mt-1 text-xs opacity-80">Sau khi import, dữ liệu sẽ ưu tiên đọc từ Supabase cho couple hiện tại.</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleImportOffline()}
                disabled={isImportingOffline}
                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isImportingOffline ? 'Đang import...' : 'Nhập lên cloud'}
              </button>
              <button
                type="button"
                onClick={() => setShowImportBanner(false)}
                disabled={isImportingOffline}
                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
              >
                Để sau
              </button>
            </div>
          </div>
        )}

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
              Việc chung
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
              Kế hoạch du lịch
            </button>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-rose-900/40 dark:bg-gray-900 dark:text-gray-200">
          <p className="font-semibold">{tabCopy[activeTab].title}</p>
          <p className="mt-1 text-gray-600 dark:text-gray-300">{tabCopy[activeTab].description}</p>
        </div>

        {activeTab === 'shared' && (
          <KanbanBoard
            storageKey={SHARED_STORAGE_KEY}
            boardLabel="Việc chung"
            boardKey="tasks"
            syncMode={syncMode}
            activeCoupleId={activeCoupleId}
            refreshToken={boardRefreshToken}
            defaultColumns={sharedColumns}
            defaultTasks={sharedTasks}
          />
        )}

        {activeTab === 'travel' && (
          <div className="space-y-5">
            <KanbanBoard
              storageKey={TRAVEL_STORAGE_KEY}
            boardLabel="Kế hoạch du lịch"
              boardKey="travel"
              syncMode={syncMode}
              activeCoupleId={activeCoupleId}
              refreshToken={boardRefreshToken}
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
