'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult
} from '@hello-pangea/dnd'
import { useDispatch } from 'react-redux'
import { setAlert } from '@/lib/features/alert/alertSlice'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import {
  BoardState,
  KanbanColumn,
  KanbanTask,
  TaskModalInput
} from '@/lib/components/pages/tasks/types'
import { TaskModal } from '@/lib/components/pages/tasks/task-modal'
import { ColumnModal } from '@/lib/components/pages/tasks/column-modal'

type SyncMode = 'local' | 'supabase'
type SyncStatus = 'LOCAL' | 'SYNCED'
type RemoteTaskRow = Database['public']['Tables']['tasks']['Row']
type RemoteTaskInsert = Database['public']['Tables']['tasks']['Insert']

const cloneColumns = (columns: KanbanColumn[]): KanbanColumn[] =>
  columns.map((column) => ({ ...column }))

const cloneTasks = (tasks: KanbanTask[]): KanbanTask[] => tasks.map((task) => ({ ...task }))

const tasksByStatus = (tasks: KanbanTask[], status: string) =>
  tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position)

const reindexStatus = (tasks: KanbanTask[], status: string): KanbanTask[] => {
  const sorted = tasksByStatus(tasks, status)
  const untouched = tasks.filter((task) => task.status !== status)
  const reindexed = sorted.map((task, index) => ({ ...task, position: index }))
  return [...untouched, ...reindexed]
}

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

const toStatusTitle = (status: string) =>
  status
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

const mapRemoteRowToTask = (
  row: RemoteTaskRow,
  index: number,
  fallbackStatus: string
): KanbanTask => ({
  id: row.id,
  content: row.title,
  note: row.description ?? undefined,
  dueDate: row.due_date ? String(row.due_date).slice(0, 10) : undefined,
  priority: row.priority ?? 'normal',
  status: sanitizeStatus(row.status || fallbackStatus) || fallbackStatus,
  position: Number.isFinite(row.sort_order) ? Number(row.sort_order) : index,
  createdAt: row.created_at ?? new Date().toISOString()
})

const mapTaskToRemoteInsert = (
  task: KanbanTask,
  coupleId: string,
  board: string
): RemoteTaskInsert => ({
  id: task.id,
  couple_id: coupleId,
  board,
  title: task.content,
  description: task.note ?? null,
  status: task.status,
  priority: task.priority ?? 'normal',
  due_date: task.dueDate ?? null,
  sort_order: Number.isFinite(task.position) ? Number(task.position) : 0
})

const normalizeBoardState = (
  input: Partial<BoardState> | null,
  fallbackColumns: KanbanColumn[],
  fallbackTasks: KanbanTask[]
): BoardState => {
  const sourceColumns = Array.isArray(input?.columns) ? input.columns : fallbackColumns
  const columns = sourceColumns
    .map((column) => ({
      id: String(column.id || column.status || ''),
      title: String(column.title || '').trim(),
      status: sanitizeStatus(String(column.status || column.id || ''))
    }))
    .filter((column) => column.id && column.title && column.status)

  const dedupedColumns: KanbanColumn[] = []
  const statusSet = new Set<string>()

  columns.forEach((column) => {
    if (!statusSet.has(column.status)) {
      statusSet.add(column.status)
      dedupedColumns.push(column)
    }
  })

  const safeColumns = dedupedColumns.length > 0 ? dedupedColumns : cloneColumns(fallbackColumns)
  const validStatuses = new Set(safeColumns.map((column) => column.status))
  const firstStatus = safeColumns[0].status

  const sourceTasks = Array.isArray(input?.tasks) ? input.tasks : fallbackTasks
  const tasks = sourceTasks
    .map((task, index) => {
      const requestedStatus = sanitizeStatus(String(task.status || ''))
      const status = validStatuses.has(requestedStatus) ? requestedStatus : firstStatus
      return {
        id: String(task.id || createTaskId()),
        content: String(task.content || '').trim(),
        note: task.note ? String(task.note) : undefined,
        dueDate: task.dueDate ? String(task.dueDate) : undefined,
        priority: task.priority ? String(task.priority) : 'normal',
        createdAt: String(task.createdAt || new Date().toISOString()),
        status,
        position: Number.isFinite(task.position) ? Number(task.position) : index
      }
    })
    .filter((task) => task.content)

  let safeTasks = cloneTasks(tasks)
  safeColumns.forEach((column) => {
    safeTasks = reindexStatus(safeTasks, column.status)
  })

  return {
    columns: safeColumns,
    tasks: safeTasks
  }
}

export const KanbanBoard = ({
  storageKey,
  boardLabel,
  boardKey,
  syncMode,
  activeCoupleId,
  refreshToken = 0,
  colorMode = 'blue',
  defaultColumns,
  defaultTasks
}: {
  storageKey: string
  boardLabel: string
  boardKey: 'tasks' | 'travel'
  syncMode: SyncMode
  activeCoupleId: string | null
  refreshToken?: number
  colorMode?: 'blue' | 'pink'
  defaultColumns: KanbanColumn[]
  defaultTasks: KanbanTask[]
}) => {
  const dispatch = useDispatch()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tasksRef = useRef<KanbanTask[]>(cloneTasks(defaultTasks))
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [columns, setColumns] = useState<KanbanColumn[]>(cloneColumns(defaultColumns))
  const [tasks, setTasks] = useState<KanbanTask[]>(cloneTasks(defaultTasks))
  const [hydrated, setHydrated] = useState(false)

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit'>('create')
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null)
  const [taskModalStatus, setTaskModalStatus] = useState(defaultColumns[0]?.status || '')

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)
  const [columnModalMode, setColumnModalMode] = useState<'create' | 'edit'>('create')
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('LOCAL')
  const [isSyncing, setIsSyncing] = useState(false)

  const isSupabaseMode = syncMode === 'supabase' && Boolean(activeCoupleId)
  const theme = useMemo(
    () =>
      colorMode === 'pink'
        ? {
            frame: 'border-rose-100 dark:border-rose-900/40',
            primaryButton: 'bg-rose-600 hover:bg-rose-700',
            secondaryButton:
              'border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300',
            columnBg: 'bg-rose-50/60 dark:bg-rose-900/10',
            dragOver: 'bg-rose-100/80 dark:bg-rose-900/20',
            ring: 'ring-rose-300',
            addColumn:
              'border-rose-300 bg-rose-50/60 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-900/10 dark:text-rose-300 dark:hover:bg-rose-900/20',
            deleteAction:
              'text-rose-600 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/30',
            deleteText:
              'text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/20',
            syncedBadge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
          }
        : {
            frame: 'border-sky-100 dark:border-sky-900/40',
            primaryButton: 'bg-sky-600 hover:bg-sky-700',
            secondaryButton:
              'border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300',
            columnBg: 'bg-sky-50/60 dark:bg-sky-900/10',
            dragOver: 'bg-sky-100/80 dark:bg-sky-900/20',
            ring: 'ring-sky-300',
            addColumn:
              'border-sky-300 bg-sky-50/60 text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-900/10 dark:text-sky-300 dark:hover:bg-sky-900/20',
            deleteAction:
              'text-sky-600 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/30',
            deleteText:
              'text-sky-600 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-900/20',
            syncedBadge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
          },
    [colorMode]
  )

  const groupedTasks = useMemo(() => {
    const groups: Record<string, KanbanTask[]> = {}
    columns.forEach((column) => {
      groups[column.status] = tasksByStatus(tasks, column.status)
    })
    return groups
  }, [columns, tasks])

  useEffect(() => {
    tasksRef.current = cloneTasks(tasks)
  }, [tasks])

  const logSupabaseError = useCallback(
    (context: string, error: unknown) => {
      const candidate = error as {
        code?: string | null
        message?: string | null
        details?: string | null
        hint?: string | null
      }
      console.error(`[tasks/${boardKey}] ${context}`, {
        code: candidate?.code ?? null,
        message: candidate?.message ?? String(error),
        details: candidate?.details ?? null,
        hint: candidate?.hint ?? null
      })
    },
    [boardKey]
  )

  const toErrorMessage = useCallback((error: unknown, fallback: string) => {
    const candidate = error as { code?: string | null; message?: string | null }
    const message = candidate?.message ?? fallback
    const code = candidate?.code ?? null
    return code ? `${message} (${code})` : message
  }, [])

  const persistTaskChanges = useCallback(
    async (nextTasks: KanbanTask[], affectedStatuses: string[], deletedIds: string[] = []) => {
      if (!isSupabaseMode || !activeCoupleId || !supabase) {
        setSyncStatus('LOCAL')
        return true
      }

      const statusSet = new Set(affectedStatuses.map((status) => sanitizeStatus(status)).filter(Boolean))
      const payload = nextTasks
        .filter((task) => statusSet.has(task.status))
        .map((task) => mapTaskToRemoteInsert(task, activeCoupleId, boardKey))

      setIsSyncing(true)
      try {
        if (payload.length > 0) {
          const { error: upsertError } = await supabase.from('tasks').upsert(payload, {
            onConflict: 'id'
          })
          if (upsertError) {
            throw upsertError
          }
        }

        if (deletedIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('couple_id', activeCoupleId)
            .eq('board', boardKey)
            .in('id', deletedIds)
          if (deleteError) {
            throw deleteError
          }
        }

        setSyncStatus('SYNCED')
        return true
      } catch (error) {
        setSyncStatus('LOCAL')
        logSupabaseError('persistTaskChanges', error)
        dispatch(
          setAlert({
            title: 'Đồng bộ thất bại',
            message: toErrorMessage(error, 'Không thể đồng bộ task lên Supabase'),
            type: 'warning'
          })
        )
        return false
      } finally {
        setIsSyncing(false)
      }
    },
    [activeCoupleId, boardKey, dispatch, isSupabaseMode, logSupabaseError, supabase, toErrorMessage]
  )

  const loadBoardState = useCallback(async () => {
    if (!isSupabaseMode || !activeCoupleId || !supabase) {
      const raw = localStorage.getItem(storageKey)
      if (!raw) {
        const normalizedDefault = normalizeBoardState(null, defaultColumns, defaultTasks)
        setColumns(normalizedDefault.columns)
        setTasks(normalizedDefault.tasks)
        setSyncStatus('LOCAL')
        setHydrated(true)
        return
      }

      try {
        const parsed = JSON.parse(raw) as Partial<BoardState>
        const normalized = normalizeBoardState(parsed, defaultColumns, defaultTasks)
        setColumns(normalized.columns)
        setTasks(normalized.tasks)
      } catch {
        const normalizedDefault = normalizeBoardState(null, defaultColumns, defaultTasks)
        setColumns(normalizedDefault.columns)
        setTasks(normalizedDefault.tasks)
      } finally {
        setSyncStatus('LOCAL')
        setHydrated(true)
      }
      return
    }

    setIsSyncing(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          'id, title, description, status, priority, due_date, sort_order, board, created_at, updated_at, couple_id'
        )
        .eq('couple_id', activeCoupleId)
        .in('board', ['tasks', 'travel'])
        .order('board', { ascending: true })
        .order('status', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      const boardRows = (data || []).filter((row) => row.board === boardKey)
      const fallbackStatus = defaultColumns[0]?.status || 'todo'
      const mapped = boardRows.map((row, index) =>
        mapRemoteRowToTask(row as RemoteTaskRow, index, fallbackStatus)
      )

      const knownStatuses = new Set(defaultColumns.map((column) => column.status))
      const missingStatuses = mapped
        .map((task) => task.status)
        .filter((status) => !knownStatuses.has(status))

      const nextColumns = [
        ...cloneColumns(defaultColumns),
        ...Array.from(new Set(missingStatuses)).map((status) => ({
          id: status,
          status,
          title: toStatusTitle(status) || status
        }))
      ]

      setColumns(nextColumns)
      setTasks(mapped)
      setSyncStatus('SYNCED')
    } catch (error) {
      logSupabaseError('loadBoardState', error)
      setSyncStatus('LOCAL')
      dispatch(
        setAlert({
          title: 'Tải dữ liệu thất bại',
          message: toErrorMessage(error, 'Không thể tải task từ Supabase'),
          type: 'warning'
        })
      )
    } finally {
      setHydrated(true)
      setIsSyncing(false)
    }
  }, [
    activeCoupleId,
    boardKey,
    defaultColumns,
    defaultTasks,
    dispatch,
    isSupabaseMode,
    logSupabaseError,
    storageKey,
    supabase,
    toErrorMessage
  ])

  useEffect(() => {
    setHydrated(false)
    void loadBoardState()
  }, [loadBoardState, refreshToken])

  useEffect(() => {
    if (!hydrated || isSupabaseMode) {
      return
    }
    const payload: BoardState = { columns, tasks }
    localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [columns, tasks, hydrated, isSupabaseMode, storageKey])

  const commitTaskMutation = useCallback(
    async (
      buildNext: (previous: KanbanTask[]) => KanbanTask[],
      options: { affectedStatuses: string[]; deletedIds?: string[] }
    ) => {
      const previous = cloneTasks(tasksRef.current)
      const next = buildNext(previous)
      setTasks(next)

      if (!isSupabaseMode) {
        setSyncStatus('LOCAL')
        return true
      }

      const ok = await persistTaskChanges(next, options.affectedStatuses, options.deletedIds ?? [])
      if (!ok) {
        setTasks(previous)
      }
      return ok
    },
    [isSupabaseMode, persistTaskChanges]
  )

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!destination) return
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    const sourceStatus = source.droppableId
    const destinationStatus = destination.droppableId
    void commitTaskMutation(
      (prev) => {
        const sourceTasks = tasksByStatus(prev, sourceStatus)
        const movedTask = sourceTasks[source.index]
        if (!movedTask) return prev

        const withoutMoved = prev.filter((task) => task.id !== movedTask.id)

        if (sourceStatus === destinationStatus) {
          const sameColumn = tasksByStatus(withoutMoved, sourceStatus)
          sameColumn.splice(destination.index, 0, {
            ...movedTask,
            status: sourceStatus
          })

          const untouched = withoutMoved.filter((task) => task.status !== sourceStatus)
          const reindexed = sameColumn.map((task, index) => ({
            ...task,
            position: index
          }))
          return [...untouched, ...reindexed]
        }

        const destinationTasks = tasksByStatus(withoutMoved, destinationStatus)
        destinationTasks.splice(destination.index, 0, {
          ...movedTask,
          status: destinationStatus
        })

        const sourceReindexed = tasksByStatus(withoutMoved, sourceStatus).map((task, index) => ({
          ...task,
          position: index
        }))
        const destinationReindexed = destinationTasks.map((task, index) => ({
          ...task,
          position: index
        }))
        const untouched = withoutMoved.filter(
          (task) => task.status !== sourceStatus && task.status !== destinationStatus
        )

        return [...untouched, ...sourceReindexed, ...destinationReindexed]
      },
      {
        affectedStatuses:
          sourceStatus === destinationStatus
            ? [sourceStatus]
            : [sourceStatus, destinationStatus]
      }
    )
  }

  const openCreateTaskModal = (status: string) => {
    setTaskModalMode('create')
    setEditingTask(null)
    setTaskModalStatus(status)
    setIsTaskModalOpen(true)
  }

  const openEditTaskModal = (task: KanbanTask) => {
    setTaskModalMode('edit')
    setEditingTask(task)
    setTaskModalStatus(task.status)
    setIsTaskModalOpen(true)
  }

  const handleTaskSubmit = async (input: TaskModalInput) => {
    if (taskModalMode === 'edit' && editingTask) {
      const nextStatus = sanitizeStatus(input.status) || editingTask.status
      const ok = await commitTaskMutation(
        (prev) => {
          const current = prev.find((task) => task.id === editingTask.id)
          if (!current) return prev

          const removed = prev.filter((task) => task.id !== current.id)
          const nextPosition = tasksByStatus(removed, nextStatus).length
          const updatedTask: KanbanTask = {
            ...current,
            content: input.content,
            note: input.note,
            dueDate: input.dueDate,
            status: nextStatus,
            position: nextPosition
          }

          let merged = [...removed, updatedTask]
          merged = reindexStatus(merged, current.status)
          if (current.status !== nextStatus) {
            merged = reindexStatus(merged, nextStatus)
          }
          return merged
        },
        {
          affectedStatuses:
            editingTask.status === nextStatus ? [nextStatus] : [editingTask.status, nextStatus]
        }
      )

      if (ok) {
        dispatch(
          setAlert({
            title: 'Đã cập nhật',
            message: 'Việc đã được cập nhật.',
            type: 'success'
          })
        )
        setIsTaskModalOpen(false)
      }
      return
    }

    const createStatus = sanitizeStatus(input.status) || columns[0]?.status || 'todo'
    const ok = await commitTaskMutation(
      (prev) => {
        const nextPosition = tasksByStatus(prev, createStatus).length
        const newTask: KanbanTask = {
          id: createTaskId(),
          content: input.content,
          note: input.note,
          dueDate: input.dueDate,
          priority: 'normal',
          status: createStatus,
          position: nextPosition,
          createdAt: new Date().toISOString()
        }
        return [...prev, newTask]
      },
      { affectedStatuses: [createStatus] }
    )

    if (ok) {
      dispatch(
        setAlert({
          title: 'Đã tạo việc',
          message: 'Việc mới đã được thêm vào bảng.',
          type: 'success'
        })
      )
      setIsTaskModalOpen(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const currentTask = tasksRef.current.find((task) => task.id === taskId)
    if (!currentTask) {
      return
    }

    const ok = await commitTaskMutation(
      (prev) => {
        const filtered = prev.filter((task) => task.id !== taskId)
        return reindexStatus(filtered, currentTask.status)
      },
      { affectedStatuses: [currentTask.status], deletedIds: [taskId] }
    )

    if (ok) {
      dispatch(
        setAlert({
          title: 'Đã xóa việc',
          message: 'Việc đã được xóa khỏi bảng.',
          type: 'info'
        })
      )
    }
  }

  const openCreateColumnModal = () => {
    setColumnModalMode('create')
    setEditingColumn(null)
    setIsColumnModalOpen(true)
  }

  const openEditColumnModal = (column: KanbanColumn) => {
    setColumnModalMode('edit')
    setEditingColumn(column)
    setIsColumnModalOpen(true)
  }

  const handleColumnSubmit = (input: { title: string; status: string }) => {
    if (columnModalMode === 'edit' && editingColumn) {
      setColumns((prev) =>
        prev.map((column) =>
          column.status === editingColumn.status ? { ...column, title: input.title } : column
        )
      )

      dispatch(
        setAlert({
          title: 'Đã cập nhật cột',
          message: 'Tên cột đã được thay đổi.',
          type: 'success'
        })
      )
      setIsColumnModalOpen(false)
      return
    }

    const status = sanitizeStatus(input.status)
    if (!status) {
      dispatch(
        setAlert({
          title: 'Mã trạng thái không hợp lệ',
          message: 'Vui lòng nhập mã trạng thái khác.',
          type: 'error'
        })
      )
      return
    }

    if (columns.some((column) => column.status === status)) {
      dispatch(
        setAlert({
          title: 'Mã trạng thái bị trùng',
          message: 'Mã trạng thái đã tồn tại, hãy chọn mã khác.',
          type: 'error'
        })
      )
      return
    }

    setColumns((prev) => [...prev, { id: status, title: input.title, status }])
    setIsColumnModalOpen(false)

    dispatch(
      setAlert({
        title: 'Đã tạo cột',
        message: `Cột "${input.title}" đã được thêm.`,
        type: 'success'
      })
    )
  }

  const handleDeleteColumn = async (column: KanbanColumn) => {
    if (columns.length === 1) {
      dispatch(
        setAlert({
          title: 'Không thể xóa',
          message: 'Bảng phải có ít nhất một cột.',
          type: 'warning'
        })
      )
      return
    }

    const taskCount = tasksByStatus(tasks, column.status).length
    if (
      taskCount > 0 &&
      !window.confirm(
        `Cột "${column.title}" có ${taskCount} việc. Bạn có chắc muốn xóa cột này?`
      )
    ) {
      return
    }

    const deletedTaskIds = tasksRef.current
      .filter((task) => task.status === column.status)
      .map((task) => task.id)
    const ok = await commitTaskMutation(
      (prev) => prev.filter((task) => task.status !== column.status),
      { affectedStatuses: [column.status], deletedIds: deletedTaskIds }
    )
    if (!ok) {
      return
    }
    setColumns((prev) => prev.filter((item) => item.status !== column.status))

    dispatch(
      setAlert({
        title: 'Đã xóa cột',
        message: `Cột "${column.title}" đã được xóa.`,
        type: 'info'
      })
    )
  }

  const handleQuickMove = async (taskId: string, nextStatus: string) => {
    const current = tasksRef.current.find((task) => task.id === taskId)
    if (!current || current.status === nextStatus) {
      return
    }

    await commitTaskMutation(
      (prev) => {
        const removed = prev.filter((task) => task.id !== taskId)
        const nextPosition = tasksByStatus(removed, nextStatus).length
        const moved: KanbanTask = {
          ...current,
          status: nextStatus,
          position: nextPosition
        }

        let merged = [...removed, moved]
        merged = reindexStatus(merged, current.status)
        merged = reindexStatus(merged, nextStatus)
        return merged
      },
      { affectedStatuses: [current.status, nextStatus] }
    )
  }

  const handleExport = () => {
    const payload: BoardState = { columns, tasks }
    const fileName = `${storageKey.replace(/\./g, '-')}.json`
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Partial<BoardState>
      const normalized = normalizeBoardState(parsed, defaultColumns, defaultTasks)
      const previousColumns = cloneColumns(columns)
      const previousTasks = cloneTasks(tasksRef.current)
      setColumns(normalized.columns)
      setTasks(normalized.tasks)

      if (isSupabaseMode) {
        const removedIds = previousTasks
          .filter((task) => !normalized.tasks.some((item) => item.id === task.id))
          .map((task) => task.id)
        const ok = await persistTaskChanges(
          normalized.tasks,
          normalized.columns.map((column) => column.status),
          removedIds
        )
        if (!ok) {
          setColumns(previousColumns)
          setTasks(previousTasks)
          throw new Error('Không thể đồng bộ dữ liệu import lên Supabase')
        }
      }

      dispatch(
        setAlert({
          title: 'Nhập dữ liệu thành công',
          message: `Đã nạp board "${boardLabel}" từ file JSON.`,
          type: 'success'
        })
      )
    } catch {
      dispatch(
        setAlert({
          title: 'Nhập dữ liệu thất bại',
          message: 'File JSON không hợp lệ hoặc không đúng cấu trúc.',
          type: 'error'
        })
      )
    } finally {
      event.target.value = ''
    }
  }

  const handleForceSyncNow = async () => {
    if (!isSupabaseMode) {
      dispatch(
        setAlert({
          title: 'Đang ở chế độ local',
          message: 'Hãy đăng nhập và tham gia couple để bật đồng bộ Supabase.',
          type: 'info'
        })
      )
      return
    }

    const snapshot = cloneTasks(tasksRef.current)
    const ok = await persistTaskChanges(snapshot, columns.map((column) => column.status))
    dispatch(
      setAlert({
        title: ok ? 'Đồng bộ thành công' : 'Đồng bộ thất bại',
        message: ok ? 'Việc đã được đồng bộ lên Supabase.' : 'Không thể đồng bộ lúc này.',
        type: ok ? 'success' : 'warning'
      })
    )
  }

  if (!hydrated) {
    return (
      <div className={`rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900 ${theme.frame}`}>
        <p className="text-sm text-gray-500 dark:text-gray-300">Đang tải dữ liệu board...</p>
      </div>
    )
  }

  const taskModalInitial =
    taskModalMode === 'edit' && editingTask
      ? {
          content: editingTask.content,
          note: editingTask.note,
          dueDate: editingTask.dueDate,
          status: editingTask.status
        }
      : {
          content: '',
          note: '',
          dueDate: '',
          status: taskModalStatus || columns[0]?.status || ''
        }

  return (
    <>
      <div className={`rounded-2xl border bg-white shadow-sm dark:bg-gray-900 ${theme.frame}`}>
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{boardLabel}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Kéo thả task giữa các cột. Trên mobile có thể dùng dropdown để chuyển cột.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${syncStatus === 'SYNCED'
                ? theme.syncedBadge
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                }`}
            >
              Trạng thái: {syncStatus === 'SYNCED' ? 'ĐÃ ĐỒNG BỘ' : 'CỤC BỘ'}
            </span>
            <button
              type="button"
              onClick={() => void handleForceSyncNow()}
              disabled={!isSupabaseMode || isSyncing}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </button>
            <button
              type="button"
              onClick={() => openCreateTaskModal(columns[0]?.status || '')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${theme.primaryButton}`}
            >
              + Việc mới
            </button>
            <button
              type="button"
              onClick={openCreateColumnModal}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition dark:hover:bg-gray-800 ${theme.secondaryButton}`}
            >
              + Cột
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Xuất JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Nhập JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="overflow-x-auto p-4">
            <div className="flex min-w-max gap-4">
              {columns.map((column) => (
                <div
                  key={column.status}
                  className={`w-72 flex-shrink-0 rounded-xl border border-gray-100 p-3 dark:border-gray-800 dark:bg-gray-800/40 ${theme.columnBg}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {column.title}
                    </h4>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openCreateTaskModal(column.status)}
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        title="Thêm task"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditColumnModal(column)}
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        title="Đổi tên cột"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M17.414 2.586a2 2 0 010 2.828l-9.5 9.5a1 1 0 01-.39.242l-4 1.333a1 1 0 01-1.265-1.265l1.333-4a1 1 0 01.242-.39l9.5-9.5a2 2 0 012.828 0z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(column)}
                        className={`rounded-md p-1 text-gray-500 ${theme.deleteAction}`}
                        title="Xóa cột"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h.293l.853 10.243A2 2 0 007.14 18h5.72a2 2 0 001.994-1.757L15.707 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-1 4a1 1 0 012 0v8a1 1 0 11-2 0V6zm4-1a1 1 0 00-1 1v8a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <Droppable droppableId={column.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[7rem] space-y-2 rounded-lg p-1 transition ${snapshot.isDraggingOver ? theme.dragOver : ''}`}
                      >
                        {groupedTasks[column.status]?.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(draggableProvided, draggableSnapshot) => (
                              <article
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                className={`rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition dark:border-gray-700 dark:bg-gray-900 ${draggableSnapshot.isDragging ? 'rotate-1 shadow-lg' : ''}`}
                              >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <p className="text-sm text-gray-800 dark:text-gray-100">{task.content}</p>
                                  <button
                                    type="button"
                                    {...draggableProvided.dragHandleProps}
                                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                    title="Kéo để di chuyển"
                                  >
                                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M7 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-1.5 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-1.5 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm1.5 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                    </svg>
                                  </button>
                                </div>

                                {task.note && (
                                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{task.note}</p>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={task.status}
                                    onChange={(event) => handleQuickMove(task.id, event.target.value)}
                                    className={`rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 outline-none transition focus:ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 ${theme.ring}`}
                                  >
                                    {columns.map((option) => (
                                      <option key={`${task.id}-${option.status}`} value={option.status}>
                                        {option.title}
                                      </option>
                                    ))}
                                  </select>

                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openEditTaskModal(task)}
                                      className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task.id)}
                                      className={`rounded-md px-2 py-1 text-xs font-medium ${theme.deleteText}`}
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </div>

                                {task.dueDate && (
                                  <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                                    Hạn: {task.dueDate}
                                  </p>
                                )}
                              </article>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}

              <button
                type="button"
                onClick={openCreateColumnModal}
                className={`w-64 flex-shrink-0 rounded-xl border border-dashed p-4 text-sm font-semibold transition ${theme.addColumn}`}
              >
                + Thêm cột mới
              </button>
            </div>
          </div>
        </DragDropContext>
      </div>

      {isTaskModalOpen && (
        <TaskModal
          mode={taskModalMode}
          colorMode={colorMode}
          columns={columns}
          initialData={taskModalInitial}
          onClose={() => setIsTaskModalOpen(false)}
          onSubmit={handleTaskSubmit}
        />
      )}

      {isColumnModalOpen && (
        <ColumnModal
          mode={columnModalMode}
          colorMode={colorMode}
          initialData={
            editingColumn
              ? {
                  title: editingColumn.title,
                  status: editingColumn.status
                }
              : undefined
          }
          onClose={() => setIsColumnModalOpen(false)}
          onSubmit={handleColumnSubmit}
        />
      )}
    </>
  )
}





