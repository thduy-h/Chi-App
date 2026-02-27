export interface KanbanColumn {
  id: string
  title: string
  status: string
}

export interface KanbanTask {
  id: string
  content: string
  status: string
  position: number
  note?: string
  dueDate?: string
  createdAt: string
}

export interface BoardState {
  columns: KanbanColumn[]
  tasks: KanbanTask[]
}

export interface TaskModalInput {
  content: string
  note?: string
  dueDate?: string
  status: string
}

export interface ItineraryDay {
  id: string
  title: string
  date: string
  activities: string
}
