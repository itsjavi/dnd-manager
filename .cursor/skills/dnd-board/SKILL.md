---
name: dnd-board
description:
  Scaffold a kanban board or transfer-list layout with drag-and-drop between columns using
  dnd-manager. Use when the user wants to create a kanban board, transfer list, multi-column
  drag-and-drop, or move items between lists using dnd-manager. Covers both vanilla JS and React.
---

# Build a DnD Board with dnd-manager

## Prerequisites

```bash
pnpm add dnd-manager
```

## Key concepts

A board has **columns** (drop targets) and **items** (draggable cards). Items can be dragged within
a column (reorder) or across columns (transfer). This is different from a grid or sortable list:

- **Multiple `data-kind` values**: items use their own kind (e.g. `"task"`, `"bug"`), columns use a
  separate kind (e.g. `"column"`). Config lists all kinds in arrays.
- **Position includes `columnId`**: `{ columnId: string; index?: number }`. When `index` is
  undefined, the drop targets the column itself (append).
- **Accept rules**: columns can restrict which item kinds they accept. Validate in `onDrop` before
  mutating state.
- **Columns are droppable too**: items can be dropped on a column (not just on another item) to
  append to that column's list.

## Workflow

1. Define item and column types, plus accept rules per column
2. Create markup: columns with `data-kind="column"`, items with `data-kind="<itemKind>"`
3. Set up `DragPreviewController`
4. Implement callbacks with `{ columnId, index? }` positions
5. Validate kind acceptance in `onDrop` before mutating
6. Configure `draggableKind` and `droppableKind` as arrays

---

## API quick reference

```typescript
import {
  DragDropManager,
  DragPreviewController,
  type DragDropCallbacks,
  type DragDropConfig,
} from 'dnd-manager'
```

### Config for boards

Both `draggableKind` and `droppableKind` accept `string[]`. Items are draggable; columns and items
are droppable:

```typescript
const config: DragDropConfig = {
  draggableKind: ['task', 'bug'], // item kinds that can be dragged
  droppableKind: ['column', 'task', 'bug'], // columns + items are drop targets
  scrollThreshold: 120,
  scrollSpeed: 12,
}
```

### Position type

```typescript
type BoardPosition = {
  columnId: string
  index?: number // undefined when dropping on a column (not an item)
}
```

### Callback signatures

```typescript
{
  getItemPosition: (element: HTMLElement, kind: string) => BoardPosition | null  // Required
  getItemData?: (element: HTMLElement, position: BoardPosition) => TItem | null
  canDrag?: (element: HTMLElement, position: BoardPosition) => boolean
  onDragStart?: (element: HTMLElement, position: BoardPosition, item: TItem) => void
  onDragMove?: (pos: PointerPosition, hoveredElement: HTMLElement | null) => void
  onDrop?: (source: BoardPosition, target: BoardPosition, sourceItem: TItem) => void
  onDragEnd?: (result: DragEndResult<TItem, BoardPosition> | null) => void
  onClick?: (element: HTMLElement, position: BoardPosition) => void
}
```

### Data attributes

| Attribute              | Used on         | Purpose                                                 |
| ---------------------- | --------------- | ------------------------------------------------------- |
| `data-kind`            | Columns + items | Columns: `"column"`. Items: their kind (e.g. `"task"`). |
| `data-column-id`       | Columns + items | Identifies which column the element belongs to.         |
| `data-index`           | Items only      | Position within the column.                             |
| `data-dragging="true"` | Items           | Auto-set by manager during drag.                        |
| `data-hovered="true"`  | Columns + items | Auto-set by manager on hover target.                    |

---

## Vanilla JS pattern

```typescript
import { DragDropManager, DragPreviewController, type DragDropCallbacks } from 'dnd-manager'

// 1. Types
type ItemKind = 'task' | 'bug'
type ColumnId = 'todo' | 'doing' | 'done'

type BoardItem = { id: string; name: string; color: string; kind: ItemKind }
type BoardPosition = { columnId: ColumnId; index?: number }
type BoardData = Record<ColumnId, BoardItem[]>

// 2. Column config with accept rules
const COLUMNS: Record<ColumnId, { title: string; accepts: ItemKind[] }> = {
  todo: { title: 'To Do', accepts: ['task', 'bug'] },
  doing: { title: 'Doing', accepts: ['task', 'bug'] },
  done: { title: 'Done', accepts: ['task'] },
}

// 3. State
let data: BoardData = {
  todo: [
    { id: '1', name: 'Design API', color: '#4f46e5', kind: 'task' },
    { id: '2', name: 'Fix login', color: '#f97316', kind: 'bug' },
  ],
  doing: [{ id: '3', name: 'Write tests', color: '#0ea5e9', kind: 'task' }],
  done: [],
}

const container = document.getElementById('board')!
const preview = new DragPreviewController({ className: 'drop-shadow-xl' })

// 4. Render
function renderBoard() {
  container.innerHTML = (Object.keys(COLUMNS) as ColumnId[])
    .map((colId) => {
      const col = COLUMNS[colId]
      const items = data[colId]
      const itemsHtml =
        items.length > 0
          ? items
              .map(
                (item, i) =>
                  `<div class="board-item" data-kind="${item.kind}"
                  data-column-id="${colId}" data-index="${i}"
                  style="background:${item.color}">
              ${item.name}
              <span class="kind-badge">${item.kind}</span>
            </div>`,
              )
              .join('')
          : `<div class="board-empty">Drop here</div>`

      return `<div class="board-column" data-kind="column" data-column-id="${colId}">
        <h3>${col.title}</h3>
        <p class="accepts">Accepts: ${col.accepts.join(', ')}</p>
        <div class="board-column-items">${itemsHtml}</div>
      </div>`
    })
    .join('')
}

// 5. Callbacks
const callbacks: DragDropCallbacks<BoardItem, BoardPosition> = {
  getItemPosition: (el) => {
    const columnId = el.dataset.columnId as ColumnId | undefined
    if (!columnId || !(columnId in COLUMNS)) return null
    const rawIndex = el.dataset.index
    const index = rawIndex != null ? +rawIndex : undefined
    return { columnId, index: Number.isFinite(index) ? index : undefined }
  },

  getItemData: (_, pos) => {
    if (pos.index === undefined) return null
    return data[pos.columnId]?.[pos.index] ?? null
  },

  onDragStart: (el) => preview.startFromElement(el),
  onDragMove: (pos) => preview.moveToPointer(pos),

  onDrop: (source, target, sourceItem) => {
    if (source.index === undefined) return

    // Validate: target column accepts this item kind
    if (!COLUMNS[target.columnId].accepts.includes(sourceItem.kind)) return

    // Same column, same index or no target index → no-op
    if (
      source.columnId === target.columnId &&
      (target.index === undefined || target.index === source.index)
    )
      return

    // Cross-column swap: validate displaced item can go to source column
    if (target.index !== undefined && source.columnId !== target.columnId) {
      const displaced = data[target.columnId][target.index]
      if (displaced && !COLUMNS[source.columnId].accepts.includes(displaced.kind)) return
    }

    // Mutate
    if (source.columnId === target.columnId && target.index !== undefined) {
      const list = data[source.columnId]
      ;[list[source.index], list[target.index]] = [list[target.index], list[source.index]]
    } else {
      const srcList = data[source.columnId]
      const tgtList = data[target.columnId]
      const [moved] = srcList.splice(source.index, 1)
      if (target.index !== undefined) {
        const displaced = tgtList[target.index]
        tgtList[target.index] = moved
        if (displaced) srcList.push(displaced)
      } else {
        tgtList.push(moved)
      }
    }

    renderBoard()
  },

  onDragEnd: () => preview.stop(),

  onClick: (_, pos) => {
    if (pos.index === undefined) return
    const item = data[pos.columnId]?.[pos.index]
    if (item) console.log('Clicked', item)
  },
}

// 6. Init
renderBoard()

const manager = new DragDropManager<BoardItem, BoardPosition>(
  container,
  {
    draggableKind: ['task', 'bug'],
    droppableKind: ['column', 'task', 'bug'],
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
<div id="board" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
  <!-- Columns rendered by renderBoard() -->
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

// 1. Types
type ItemKind = 'task' | 'bug'
type ColumnId = 'todo' | 'doing' | 'done'

type BoardItem = { id: string; name: string; color: string; kind: ItemKind }
type BoardPosition = { columnId: ColumnId; index?: number }
type BoardData = Record<ColumnId, BoardItem[]>

// 2. Column config
const COLUMNS: Record<ColumnId, { title: string; accepts: ItemKind[] }> = {
  todo: { title: 'To Do', accepts: ['task', 'bug'] },
  doing: { title: 'Doing', accepts: ['task', 'bug'] },
  done: { title: 'Done', accepts: ['task'] },
}
const COLUMN_IDS = Object.keys(COLUMNS) as ColumnId[]

const INITIAL_DATA: BoardData = {
  todo: [
    { id: '1', name: 'Design API', color: '#4f46e5', kind: 'task' },
    { id: '2', name: 'Fix login', color: '#f97316', kind: 'bug' },
  ],
  doing: [{ id: '3', name: 'Write tests', color: '#0ea5e9', kind: 'task' }],
  done: [],
}

export function DndBoard() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [boardData, setBoardData] = useState<BoardData>(INITIAL_DATA)

  // 3. Preview controller
  const previewRef = useRef(new DragPreviewController({ className: 'drop-shadow-xl' }))
  useEffect(() => {
    return () => previewRef.current.destroy()
  }, [])

  // 4. Callbacks
  const callbacks = useMemo<DragDropCallbacks<BoardItem, BoardPosition>>(
    () => ({
      getItemPosition: (el) => {
        const columnId = el.dataset.columnId as ColumnId | undefined
        if (!columnId || !(columnId in COLUMNS)) return null
        const raw = el.dataset.index
        const index = raw != null ? +raw : undefined
        return { columnId, index: Number.isFinite(index) ? index : undefined }
      },

      getItemData: (_, pos) => {
        if (pos.index === undefined) return null
        return boardData[pos.columnId]?.[pos.index] ?? null
      },

      onDragStart: (el) => previewRef.current.startFromElement(el),
      onDragMove: (pos) => previewRef.current.moveToPointer(pos),

      onDrop: (source, target, sourceItem) => {
        if (source.index === undefined) return
        if (!COLUMNS[target.columnId].accepts.includes(sourceItem.kind)) return
        if (
          source.columnId === target.columnId &&
          (target.index === undefined || target.index === source.index)
        )
          return

        if (target.index !== undefined && source.columnId !== target.columnId) {
          const displaced = boardData[target.columnId][target.index]
          if (displaced && !COLUMNS[source.columnId].accepts.includes(displaced.kind)) return
        }

        setBoardData((prev) => {
          if (source.columnId === target.columnId && target.index !== undefined) {
            const list = [...prev[source.columnId]]
            ;[list[source.index!], list[target.index]] = [list[target.index], list[source.index!]]
            return { ...prev, [source.columnId]: list }
          }

          const srcList = [...prev[source.columnId]]
          const tgtList = [...prev[target.columnId]]
          const [moved] = srcList.splice(source.index!, 1)
          if (target.index !== undefined) {
            const displaced = tgtList[target.index]
            tgtList[target.index] = moved
            if (displaced) srcList.push(displaced)
          } else {
            tgtList.push(moved)
          }

          return {
            ...prev,
            [source.columnId]: srcList,
            [target.columnId]: tgtList,
          }
        })
      },

      onDragEnd: () => previewRef.current.stop(),

      onClick: (_, pos) => {
        if (pos.index === undefined) return
        const item = boardData[pos.columnId]?.[pos.index]
        if (item) console.log('Clicked', item)
      },
    }),
    [boardData],
  )

  // 5. Config
  const config = useMemo<DragDropConfig>(
    () => ({
      draggableKind: ['task', 'bug'],
      droppableKind: ['column', 'task', 'bug'],
      scrollThreshold: 120,
      scrollSpeed: 12,
    }),
    [],
  )

  // 6. Manager
  useEffect(() => {
    if (!containerRef.current) return
    const manager = new DragDropManager<BoardItem, BoardPosition>(containerRef, config, callbacks)
    return () => manager.destroy()
  }, [callbacks, config])

  // 7. Render
  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLUMN_IDS.length}, 1fr)`,
        gap: '16px',
      }}
    >
      {COLUMN_IDS.map((colId) => {
        const col = COLUMNS[colId]
        const items = boardData[colId]

        return (
          <div
            key={colId}
            data-kind="column"
            data-column-id={colId}
            style={{
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px',
              minHeight: '200px',
              transition: 'box-shadow 0.15s',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{col.title}</h3>
            <p style={{ margin: '4px 0 12px', fontSize: '11px', color: '#94a3b8' }}>
              Accepts: {col.accepts.join(', ')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  data-kind={item.kind}
                  data-column-id={colId}
                  data-index={index}
                  style={{
                    background: item.color,
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'grab',
                    userSelect: 'none',
                    touchAction: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'opacity 0.15s',
                  }}
                >
                  <span>{item.name}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      opacity: 0.8,
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                    }}
                  >
                    {item.kind}
                  </span>
                </div>
              ))}
              {items.length === 0 && (
                <div
                  style={{
                    border: '2px dashed #475569',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  Drop here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

---

## CSS for drag/hover states

```css
/* Dragging item */
[data-dragging='true'] {
  opacity: 0.4;
  cursor: grabbing !important;
}

/* Hovered item */
[data-kind='task'][data-hovered='true'],
[data-kind='bug'][data-hovered='true'] {
  opacity: 0.65;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
}

/* Hovered column (accepts) */
[data-kind='column'][data-hovered='true'] {
  box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.8);
}
```

For per-column accept/reject visual feedback, track the dragged item's kind in state and
conditionally apply accept vs. reject ring colors on columns.

---

## Accept rules pattern

The key difference from a simple list: validate in `onDrop` before mutating.

```typescript
onDrop: (source, target, sourceItem) => {
  // 1. Source must have an index
  if (source.index === undefined) return

  // 2. Target column must accept this kind
  if (!COLUMNS[target.columnId].accepts.includes(sourceItem.kind)) return

  // 3. Cross-column swap: displaced item must be accepted by source column
  if (target.index !== undefined && source.columnId !== target.columnId) {
    const displaced = data[target.columnId][target.index]
    if (displaced && !COLUMNS[source.columnId].accepts.includes(displaced.kind)) return
  }

  // 4. Now safe to mutate
}
```

---

## Checklist

- [ ] `dnd-manager` installed
- [ ] Types defined: `TItem` with `kind` field, `TPosition` as `{ columnId, index? }`
- [ ] Column accept rules defined per column
- [ ] `draggableKind` = array of item kinds; `droppableKind` = `['column', ...itemKinds]`
- [ ] Columns have `data-kind="column"` and `data-column-id`
- [ ] Items have `data-kind="<itemKind>"`, `data-column-id`, and `data-index`
- [ ] `getItemPosition` returns `{ columnId, index }` for items, `{ columnId }` for columns
- [ ] `getItemData` returns `null` when `index` is undefined (column-level drop)
- [ ] `onDrop` validates accept rules before mutating state
- [ ] Cross-column swap validates displaced item can go to source column
- [ ] `DragPreviewController` wired to `onDragStart`/`onDragMove`/`onDragEnd`
- [ ] Cleanup: `preview.destroy()` and `manager.destroy()`
- [ ] CSS for `[data-dragging]` and `[data-hovered]` on both items and columns
