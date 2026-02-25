export type DemoItem = {
  id: string
  name: string
  color: string
  canDrag?: boolean
}

export type GridPosition = {
  row: number
  col: number
}

export type ListPosition = {
  index: number
}

export type DemoConfig = {
  dragThreshold: number
  clickThreshold: number
  scrollThreshold: number
  scrollSpeed: number
}

export type TelemetryEvent = {
  id: string
  name: string
  detail: string
  createdAt: string
}

export type ManagerSnapshot = {
  isDragging: boolean
  state: Record<string, unknown> | null
  active: boolean
}
