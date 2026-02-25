---
name: dnd-grid
description:
  Scaffold a drag-and-drop grid using the dnd-manager library with DragPreviewController. Use when
  the user wants to create a draggable grid, sortable grid, reorderable grid, or any drag-and-drop
  interface using dnd-manager. Covers both vanilla JS and React.
---

# Build a DnD Grid with dnd-manager

## Prerequisites

Install `dnd-manager`:

```bash
pnpm add dnd-manager
# or: npm install dnd-manager
```

## Workflow

1. Define `TItem` and `TPosition` types for your grid
2. Create grid markup with required data attributes
3. Set up `DragPreviewController` for drag feedback
4. Implement `DragDropCallbacks` (position, data, drag/drop handlers)
5. Create `DragDropManager` and wire cleanup
6. Add CSS for drag/hover states

Follow the framework-specific pattern below (vanilla JS or React).

---

## Required data attributes

Every draggable/droppable element **must** have:

| Attribute                             | Purpose                                              |
| ------------------------------------- | ---------------------------------------------------- |
| `data-kind="<kind>"`                  | Must match `draggableKind`/`droppableKind` in config |
| `data-row`, `data-col` (or similar)   | Position data read by `getItemPosition`              |
| Item data attrs (e.g. `data-item-id`) | Read by `getItemData`                                |

Special attributes (set automatically by the manager):

| Attribute              | Purpose                              |
| ---------------------- | ------------------------------------ |
| `data-empty`           | Presence makes element non-draggable |
| `data-dragging="true"` | Set on source element during drag    |
| `data-hovered="true"`  | Set on hovered droppable during drag |

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

### DragDropConfig

```typescript
{
  draggableKind: string | string[]    // Required
  droppableKind: string | string[]    // Required
  dragThreshold?: number              // Default: 10
  clickThreshold?: number             // Default: 10
  scrollThreshold?: number            // Default: 100
  scrollSpeed?: number                // Default: 10
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

### Callback lifecycle

1. pointerdown → `getItemPosition` → check `data-empty` → `canDrag` → `getItemData`
2. Pointer past threshold → `onDragStart` (+ `data-dragging="true"`)
3. Pointer moves → `onDragMove` (+ `data-hovered="true"` toggled)
4. Drop on valid target → `onDrop` then `onDragEnd(result)`
5. Cancelled → `onDragEnd(null)`
6. Click (no drag) → `onClick`

---

## Vanilla JS pattern

```typescript
import { DragDropManager, DragPreviewController, type DragDropCallbacks } from 'dnd-manager'

// 1. Define types
type GridItem = { id: string; name: string; color: string }
type GridPosition = { row: number; col: number }

// 2. Get container
const container = document.getElementById('grid')!

// 3. Create preview controller
const preview = new DragPreviewController({
  zIndex: 9999,
  opacity: 0.95,
  className: 'drop-shadow-xl',
})

// 4. Implement callbacks
const callbacks: DragDropCallbacks<GridItem, GridPosition> = {
  getItemPosition: (el) => {
    const row = el.dataset.row,
      col = el.dataset.col
    return row != null && col != null ? { row: +row, col: +col } : null
  },

  getItemData: (el) => {
    const id = el.dataset.itemId,
      name = el.dataset.name,
      color = el.style.background
    return id && name && color ? { id, name, color } : null
  },

  onDragStart: (el) => preview.startFromElement(el),
  onDragMove: (pos) => preview.moveToPointer(pos),

  onDrop: (from, to) => {
    const srcEl = container.querySelector(
      `[data-row="${from.row}"][data-col="${from.col}"]`,
    ) as HTMLElement
    const tgtEl = container.querySelector(
      `[data-row="${to.row}"][data-col="${to.col}"]`,
    ) as HTMLElement
    if (srcEl && tgtEl) {
      // Swap contents, data attributes, and styles between source and target
      const swap = (attr: string) => {
        const tmp = srcEl.dataset[attr] ?? ''
        srcEl.dataset[attr] = tgtEl.dataset[attr] ?? ''
        tgtEl.dataset[attr] = tmp
      }
      const tmpHtml = srcEl.innerHTML
      srcEl.innerHTML = tgtEl.innerHTML
      tgtEl.innerHTML = tmpHtml
      const tmpBg = srcEl.style.background
      srcEl.style.background = tgtEl.style.background
      tgtEl.style.background = tmpBg
      swap('itemId')
      swap('name')
      // Handle data-empty swap
      const srcEmpty = srcEl.dataset.empty !== undefined
      const tgtEmpty = tgtEl.dataset.empty !== undefined
      srcEmpty ? (tgtEl.dataset.empty = '') : delete tgtEl.dataset.empty
      tgtEmpty ? (srcEl.dataset.empty = '') : delete srcEl.dataset.empty
    }
  },

  onDragEnd: () => preview.stop(),

  onClick: (el, pos) => {
    console.log('Clicked cell', { id: el.dataset.itemId, pos })
  },
}

// 5. Create manager
const manager = new DragDropManager<GridItem, GridPosition>(
  container,
  { draggableKind: 'cell', droppableKind: 'cell' },
  callbacks,
)

// 6. Cleanup on teardown
window.addEventListener('beforeunload', () => {
  preview.destroy()
  manager.destroy()
})
```

### Required HTML structure

```html
<div id="grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
  <div
    data-kind="cell"
    data-row="0"
    data-col="0"
    data-item-id="1"
    data-name="Item 1"
    style="background: #ef4444"
  >
    Item 1
  </div>
  <div
    data-kind="cell"
    data-row="0"
    data-col="1"
    data-item-id="2"
    data-name="Item 2"
    style="background: #3b82f6"
  >
    Item 2
  </div>
  <!-- Empty slot -->
  <div data-kind="cell" data-row="0" data-col="2" data-empty></div>
</div>
```

---

## React pattern

```tsx
import { useEffect, useRef, useState } from 'react'
import { DragDropManager, DragPreviewController, type DragDropCallbacks } from 'dnd-manager'

// 1. Define types
type GridItem = { id: string; name: string; color: string }
type GridPosition = { row: number; col: number }

// 2. Define initial data
const INITIAL_GRID: (GridItem | null)[][] = [
  [
    { id: '1', name: 'Item 1', color: '#ef4444' },
    { id: '2', name: 'Item 2', color: '#3b82f6' },
    { id: '3', name: 'Item 3', color: '#10b981' },
  ],
  [
    { id: '4', name: 'Item 4', color: '#f59e0b' },
    null, // empty slot
    { id: '5', name: 'Item 5', color: '#8b5cf6' },
  ],
]

export function DndGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [gridData, setGridData] = useState(INITIAL_GRID)

  // 3. Create preview controller (stable ref)
  const previewRef = useRef(new DragPreviewController({ zIndex: 9999, opacity: 0.95 }))

  useEffect(() => {
    if (!containerRef.current) return
    const preview = previewRef.current

    // 4. Implement callbacks
    const callbacks: DragDropCallbacks<GridItem, GridPosition> = {
      getItemPosition: (el) => {
        const row = el.dataset.row,
          col = el.dataset.col
        return row != null && col != null ? { row: +row, col: +col } : null
      },

      getItemData: (_, pos) => gridData[pos.row]?.[pos.col] ?? null,

      onDragStart: (el) => preview.startFromElement(el),
      onDragMove: (pos) => preview.moveToPointer(pos),

      onDrop: (from, to, item) => {
        setGridData((prev) => {
          const next = prev.map((row) => [...row])
          next[to.row][to.col] = item
          next[from.row][from.col] = prev[to.row][to.col]
          return next
        })
      },

      onDragEnd: () => preview.stop(),

      onClick: (_, pos) => {
        const item = gridData[pos.row]?.[pos.col]
        if (item) console.log('Clicked', item)
      },
    }

    // 5. Create manager
    const manager = new DragDropManager<GridItem, GridPosition>(
      containerRef,
      { draggableKind: 'cell', droppableKind: 'cell' },
      callbacks,
    )

    return () => manager.destroy()
  }, [gridData])

  // 6. Cleanup preview on unmount
  useEffect(() => {
    return () => previewRef.current.destroy()
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridData[0]?.length ?? 3}, 1fr)`,
        gap: '8px',
      }}
    >
      {gridData.map((row, rowIdx) =>
        row.map((item, colIdx) =>
          item ? (
            <div
              key={`${rowIdx}-${colIdx}`}
              data-kind="cell"
              data-row={rowIdx}
              data-col={colIdx}
              data-item-id={item.id}
              style={{
                background: item.color,
                color: 'white',
                padding: '20px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'grab',
                userSelect: 'none',
                touchAction: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.name}
            </div>
          ) : (
            <div
              key={`${rowIdx}-${colIdx}`}
              data-kind="cell"
              data-row={rowIdx}
              data-col={colIdx}
              data-empty
              style={{
                background: '#f3f4f6',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                minHeight: '60px',
              }}
            />
          ),
        ),
      )}
    </div>
  )
}
```

---

## CSS for drag/hover states

Style feedback using the auto-managed data attributes:

```css
[data-dragging='true'] {
  opacity: 0.4;
  cursor: grabbing !important;
}

[data-hovered='true'] {
  transform: scale(1.05);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}
```

Or with Tailwind `data-*` variants:

```
data-[dragging=true]:opacity-40 data-[dragging=true]:cursor-grabbing
data-[hovered=true]:scale-105 data-[hovered=true]:ring-4 data-[hovered=true]:ring-blue-500/50
```

---

## Checklist

- [ ] `dnd-manager` installed
- [ ] Types defined (`TItem`, `TPosition`)
- [ ] Elements have `data-kind`, position attrs, and item data attrs
- [ ] Empty slots marked with `data-empty`
- [ ] `DragPreviewController` created and wired to `onDragStart`/`onDragMove`/`onDragEnd`
- [ ] `getItemPosition` returns position from data attrs (or `null`)
- [ ] `getItemData` returns item data (or `null`)
- [ ] `onDrop` or `onDragEnd(result)` updates DOM/state
- [ ] `preview.destroy()` and `manager.destroy()` called on cleanup
- [ ] CSS/Tailwind styles for `[data-dragging]` and `[data-hovered]`
