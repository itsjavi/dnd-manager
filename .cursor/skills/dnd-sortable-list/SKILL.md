---
name: dnd-sortable-list
description:
  Scaffold a sortable vertical list with auto-scroll and drag preview using dnd-manager. Use when
  the user wants to create a sortable list, reorderable list, draggable list, or auto-scrolling
  drag-and-drop list using dnd-manager. Covers both vanilla JS and React.
---

# Build a Sortable List with dnd-manager

## Prerequisites

```bash
pnpm add dnd-manager
```

## Key differences from grid

A sortable list uses **index-based positioning** (`{ index: number }`) instead of row/col. Elements
use `data-index` instead of `data-row`/`data-col`. Auto-scroll is the main UX feature — items near
viewport edges trigger scrolling during drag.

## Workflow

1. Define `TItem` and `TPosition` types (position is `{ index: number }`)
2. Create list markup with `data-kind` and `data-index`
3. Set up `DragPreviewController` for drag feedback
4. Implement callbacks: position from `data-index`, swap in `onDrop`
5. Configure `scrollThreshold` and `scrollSpeed` for auto-scroll
6. Add CSS for drag/hover states

---

## API quick reference

```typescript
import {
  DragDropManager,
  DragPreviewController,
  type DragDropCallbacks,
  type DragDropConfig,
  type DragEndResult,
  type PointerPosition,
} from 'dnd-manager'
```

### DragDropCallbacks<TItem, TPosition>

```typescript
{
  getItemPosition: (element: HTMLElement, kind: string) => TPosition | null  // Required
  getItemData?: (element: HTMLElement, position: TPosition) => TItem | null
  canDrag?: (element: HTMLElement, position: TPosition) => boolean
  onDragStart?: (element: HTMLElement, position: TPosition, item: TItem) => void
  onDragMove?: (pos: PointerPosition, hoveredElement: HTMLElement | null) => void
  onDrop?: (sourcePosition: TPosition, targetPosition: TPosition, sourceItem: TItem) => void
  onDragEnd?: (result: DragEndResult<TItem, TPosition> | null) => void
  onClick?: (element: HTMLElement, position: TPosition) => void
}
```

### Config (auto-scroll relevant options)

```typescript
{
  draggableKind: string | string[]    // Required
  droppableKind: string | string[]    // Required
  dragThreshold?: number              // Default: 10
  clickThreshold?: number             // Default: 10
  scrollThreshold?: number            // Default: 100. Distance from viewport edge to trigger scroll.
  scrollSpeed?: number                // Default: 10. Pixels per frame during auto-scroll.
  cancelOnEscape?: boolean            // Default: true
  cancelOnPointerLeave?: boolean      // Default: true
}
```

### DragPreviewController

```typescript
new DragPreviewController({
  zIndex?: number,           // Default: 9999
  opacity?: number,          // Default: 0.95
  centerOnCursor?: boolean,  // Default: true
  className?: string | string[],
  appendTo?: HTMLElement,    // Default: document.body
})
```

Methods: `startFromElement(el)`, `moveToPointer(pos)`, `stop()`, `destroy()`.

### Constructor

```typescript
new DragDropManager<TItem, TPosition>(
  containerRef: HTMLElement | string | { current: HTMLElement | null },
  config: DragDropConfig,
  callbacks: DragDropCallbacks<TItem, TPosition>,
)
```

Methods: `destroy()`, `isDragging()`, `getState()`.

### Data attributes

| Attribute              | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `data-kind`            | Must match config `draggableKind`/`droppableKind` |
| `data-index`           | List position, read by `getItemPosition`          |
| `data-empty`           | Presence makes element non-draggable (empty slot) |
| `data-dragging="true"` | Auto-set on source element during drag            |
| `data-hovered="true"`  | Auto-set on hovered droppable during drag         |

### Callback lifecycle

1. pointerdown → `getItemPosition` → check `data-empty` → `canDrag` → `getItemData`
2. Pointer past threshold → `onDragStart` (+ `data-dragging="true"`)
3. Pointer moves → `onDragMove` (+ `data-hovered` toggled, auto-scroll near edges)
4. Drop on valid target → `onDrop` then `onDragEnd(result)`
5. Cancelled → `onDragEnd(null)`
6. Click (no drag) → `onClick`

---

## Vanilla JS pattern

```typescript
import { DragDropManager, DragPreviewController, type DragDropCallbacks } from 'dnd-manager'

// 1. Define types
type ListItem = { id: string; name: string; color: string }
type ListPosition = { index: number }

// 2. State
let items: (ListItem | null)[] = [
  { id: '1', name: 'Task 1', color: '#6366f1' },
  { id: '2', name: 'Task 2', color: '#06b6d4' },
  null, // empty slot
  { id: '3', name: 'Task 3', color: '#6366f1' },
  { id: '4', name: 'Task 4', color: '#06b6d4' },
  { id: '5', name: 'Task 5', color: '#6366f1' },
  { id: '6', name: 'Task 6', color: '#06b6d4' },
  null,
  { id: '7', name: 'Task 7', color: '#6366f1' },
  { id: '8', name: 'Task 8', color: '#06b6d4' },
]

const container = document.getElementById('list')!

// 3. Preview controller
const preview = new DragPreviewController({
  zIndex: 9999,
  opacity: 0.95,
  className: 'drop-shadow-xl',
})

// 4. Render function (re-renders list from items array)
function renderList() {
  container.innerHTML = items
    .map((item, i) => {
      if (!item) {
        return `<div class="list-item list-item--empty"
                     data-kind="list-item" data-index="${i}" data-empty>
                  Empty Slot
                </div>`
      }
      return `<div class="list-item"
                   data-kind="list-item" data-index="${i}"
                   data-item-id="${item.id}" data-name="${item.name}"
                   style="background: ${item.color}">
                ${item.name}
              </div>`
    })
    .join('')
}

// 5. Callbacks
const callbacks: DragDropCallbacks<ListItem, ListPosition> = {
  getItemPosition: (el) => {
    const index = el.dataset.index
    return index != null ? { index: +index } : null
  },

  getItemData: (_, pos) => items[pos.index] ?? null,

  onDragStart: (el) => preview.startFromElement(el),
  onDragMove: (pos) => preview.moveToPointer(pos),

  onDrop: (from, to, sourceItem) => {
    if (from.index === to.index) return
    const target = items[to.index]
    items[to.index] = sourceItem
    items[from.index] = target
    renderList()
  },

  onDragEnd: () => preview.stop(),

  onClick: (_, pos) => {
    const item = items[pos.index]
    if (item) console.log('Clicked', item)
  },
}

// 6. Initial render + create manager
renderList()

const manager = new DragDropManager<ListItem, ListPosition>(
  container,
  {
    draggableKind: 'list-item',
    droppableKind: 'list-item',
    scrollThreshold: 120,
    scrollSpeed: 12,
  },
  callbacks,
)

// 7. Cleanup
window.addEventListener('beforeunload', () => {
  preview.destroy()
  manager.destroy()
})
```

### Required HTML

```html
<div
  id="list"
  style="display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto;"
>
  <!-- Items rendered by renderList() -->
</div>
```

---

## React pattern

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DragDropManager,
  DragPreviewController,
  type DragDropCallbacks,
  type DragDropConfig,
} from 'dnd-manager'

// 1. Define types
type ListItem = { id: string; name: string; color: string }
type ListPosition = { index: number }

// 2. Initial data
const INITIAL_ITEMS: (ListItem | null)[] = Array.from({ length: 20 }, (_, i) => {
  if (i === 4 || i === 12) return null
  return {
    id: String(i + 1),
    name: `Task #${i + 1}`,
    color: i % 2 === 0 ? '#6366f1' : '#06b6d4',
  }
})

export function SortableList() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState(INITIAL_ITEMS)

  // 3. Preview controller (stable ref, cleaned up on unmount)
  const previewRef = useRef(new DragPreviewController({ className: 'drop-shadow-xl' }))

  useEffect(() => {
    return () => previewRef.current.destroy()
  }, [])

  // 4. Callbacks (depend on items for getItemData/onClick)
  const callbacks = useMemo<DragDropCallbacks<ListItem, ListPosition>>(
    () => ({
      getItemPosition: (el) => {
        const index = el.dataset.index
        return index != null ? { index: +index } : null
      },

      getItemData: (_, pos) => items[pos.index] ?? null,

      onDragStart: (el) => previewRef.current.startFromElement(el),
      onDragMove: (pos) => previewRef.current.moveToPointer(pos),

      onDrop: (from, to, sourceItem) => {
        if (from.index === to.index) return
        setItems((prev) => {
          const next = [...prev]
          next[to.index] = sourceItem
          next[from.index] = prev[to.index]
          return next
        })
      },

      onDragEnd: () => previewRef.current.stop(),

      onClick: (_, pos) => {
        const item = items[pos.index]
        if (item) console.log('Clicked', item)
      },
    }),
    [items],
  )

  // 5. Config (tune scrollThreshold/scrollSpeed for auto-scroll feel)
  const config = useMemo<DragDropConfig>(
    () => ({
      draggableKind: 'list-item',
      droppableKind: 'list-item',
      scrollThreshold: 120,
      scrollSpeed: 12,
    }),
    [],
  )

  // 6. Create manager, rebuild when callbacks change
  useEffect(() => {
    if (!containerRef.current) return
    const manager = new DragDropManager<ListItem, ListPosition>(containerRef, config, callbacks)
    return () => manager.destroy()
  }, [callbacks, config])

  // 7. Render
  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '500px',
        overflowY: 'auto',
      }}
    >
      {items.map((item, index) => (
        <div
          key={`slot-${index}`}
          data-kind="list-item"
          data-index={index}
          data-empty={item ? undefined : 'true'}
          style={{
            height: '56px',
            borderRadius: '12px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 500,
            fontSize: '14px',
            userSelect: 'none',
            touchAction: 'none',
            transition: 'opacity 0.15s, transform 0.15s',
            ...(item
              ? { background: item.color, color: 'white', cursor: 'grab' }
              : {
                  background: 'transparent',
                  border: '2px dashed #475569',
                  color: '#64748b',
                }),
          }}
        >
          {item ? item.name : `Empty Slot`}
        </div>
      ))}
    </div>
  )
}
```

---

## CSS for drag/hover states

```css
[data-dragging='true'] {
  opacity: 0.4;
  cursor: grabbing !important;
}

[data-hovered='true'] {
  transform: scale(1.01);
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.8);
}
```

Or with Tailwind `data-*` variants on each list item:

```
data-[dragging=true]:opacity-40 data-[dragging=true]:cursor-grabbing
data-[hovered=true]:scale-[1.01] data-[hovered=true]:ring-2 data-[hovered=true]:ring-cyan-400/80
```

## Auto-scroll tuning

| Option            | Effect                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| `scrollThreshold` | Larger = auto-scroll activates further from edge (default 100, try 120) |
| `scrollSpeed`     | Higher = faster scroll during drag (default 10, try 12-15)              |

Auto-scroll triggers when the pointer is within `scrollThreshold` pixels of the viewport edge during
drag. Works with both the window and scrollable containers.

---

## Checklist

- [ ] `dnd-manager` installed
- [ ] Types defined (`TItem` with id/name/color, `TPosition` as `{ index: number }`)
- [ ] List container has scrollable overflow (`max-height` + `overflow-y: auto`)
- [ ] Each item has `data-kind="list-item"` and `data-index`
- [ ] Empty slots marked with `data-empty`
- [ ] `DragPreviewController` created and wired to `onDragStart`/`onDragMove`/`onDragEnd`
- [ ] `getItemPosition` returns `{ index }` from `data-index` (or `null`)
- [ ] `getItemData` returns item from array at `position.index`
- [ ] `onDrop` swaps items at source and target indices
- [ ] `scrollThreshold` and `scrollSpeed` tuned for the list height
- [ ] `preview.destroy()` and `manager.destroy()` called on cleanup
- [ ] CSS for `[data-dragging]` and `[data-hovered]` selectors
