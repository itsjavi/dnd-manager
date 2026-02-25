import type { DemoConfig, DemoItem } from './demo-types'

export const DEFAULT_DEMO_CONFIG: DemoConfig = {
  dragThreshold: 10,
  clickThreshold: 10,
  scrollThreshold: 120,
  scrollSpeed: 12,
}

export const INITIAL_GRID_DATA: (DemoItem | null)[][] = [
  [
    { id: '1', name: 'Fire Bolt', color: '#ef4444' },
    { id: '2', name: 'Shield', color: '#3b82f6' },
    { id: '3', name: 'Healing Word', color: '#10b981' },
  ],
  [
    null,
    { id: '4', name: 'Misty Step', color: '#8b5cf6' },
    { id: '5', name: 'Smite', color: '#f59e0b' },
  ],
  [
    { id: '6', name: 'Counterspell', color: '#14b8a6' },
    null,
    { id: '7', name: 'Locked Relic', color: '#475569', canDrag: false },
  ],
]

export const INITIAL_LIST_DATA: (DemoItem | null)[] = Array.from({ length: 24 }, (_, index) => {
  if (index === 4 || index === 12 || index === 19) {
    return null
  }

  return {
    id: String(index + 1),
    name: `Quest #${index + 1}`,
    color: index % 2 === 0 ? '#6366f1' : '#06b6d4',
  }
})
