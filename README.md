# dnd-manager

Simple, performant, and data-driven Drag-and-Drop library for vanilla JS, compatible with any
framework, and designed for developers who want full control over drag-and-drop UX without being
locked into specific component patterns or opinionated libraries.

This document provides practical examples of using the library in both vanilla JavaScript and React
applications.

## Table of Contents

1. [Installation](#installation)
2. [Clone Preview Helper](#clone-preview-helper)
3. [Vanilla JS Example](#vanilla-js-example)
4. [Vanilla JS Example with multiple managers](#vanilla-js-example-with-multiple-managers)
5. [React Example](#react-example)

---

## Installation

```bash
pnpm add dnd-manager
```

Or with npm/yarn:

```bash
npm install dnd-manager
yarn add dnd-manager
```

---

## Clone Preview Helper

Use `new DragPreviewController()` to get a clone of the dragged element that follows the cursor with
`position: fixed`, `pointer-events: none`, and transform-based movement.

```typescript
import {
  DragPreviewController,
  DragDropManager,
  type DragDropCallbacks,
  type PointerPosition,
} from 'dnd-manager'

type Item = { index: number }
type Position = { index: number }

const preview = new DragPreviewController({
  zIndex: 9999,
  opacity: 0.95,
  className: 'drop-shadow-xl',
})

const callbacks: DragDropCallbacks<Item, Position> = {
  getItemPosition: (element) => {
    const raw = element.dataset.index
    if (!raw) return null
    const index = Number.parseInt(raw, 10)
    return Number.isFinite(index) ? { index } : null
  },

  getItemData: (_element, pos) => ({ index: pos.index }),

  onDragStart: (element) => {
    preview.startFromElement(element)
  },

  onDragMove: (pos: PointerPosition) => {
    preview.moveToPointer(pos)
  },

  onDragEnd: () => {
    preview.stop()
  },
}

const manager = new DragDropManager<Item, Position>(
  '#container',
  {
    draggableKind: 'ITEM',
    droppableKind: 'ITEM',
  },
  callbacks,
)

// Important cleanup for unmount/page teardown.
function cleanup() {
  preview.destroy()
  manager.destroy()
}
```

This helper uses the clone-in-`document.body` pattern to avoid drift in scrolled containers and
keeps cursor tracking smooth via transform updates.

---

## Vanilla JS Example

This example creates a draggable grid with cells that can be reordered. Clicking a cell logs its
data to the console, and dragging shows a preview element following the cursor.

**HTML:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vanilla JS DragDrop Grid</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
        background: #f9fafb;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, 120px);
        gap: 8px;
        padding: 20px;
      }

      .cell {
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        border-radius: 8px;
        padding: 20px;
        min-height: 80px;
        transition:
          transform 0.2s,
          opacity 0.2s,
          box-shadow 0.2s;
        user-select: none;
        touch-action: none;
      }

      .cell:not([data-empty]) {
        color: white;
        cursor: grab;
      }

      .cell[data-empty] {
        background: #f3f4f6;
        border: 2px dashed #d1d5db;
      }

      /* Dragging states */
      .cell[data-dragging='true'] {
        opacity: 0.4;
        cursor: grabbing !important;
      }

      .cell[data-hovered='true'] {
        transform: scale(1.05);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
      }

      /* Drag preview */
      #drag-preview {
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        opacity: 0;
        transform: translate(-50%, -50%);
        transition: opacity 0.2s;
        padding: 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      }
    </style>
  </head>
  <body>
    <h1>Vanilla JS Drag & Drop Grid</h1>
    <p>Drag cells to reorder, click to log to console</p>

    <div id="grid-container" class="grid">
      <!-- Row 0 -->
      <div
        class="cell"
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
        class="cell"
        data-kind="cell"
        data-row="0"
        data-col="1"
        data-item-id="2"
        data-name="Item 2"
        style="background: #3b82f6"
      >
        Item 2
      </div>
      <div
        class="cell"
        data-kind="cell"
        data-row="0"
        data-col="2"
        data-item-id="3"
        data-name="Item 3"
        style="background: #10b981"
      >
        Item 3
      </div>

      <!-- Row 1 -->
      <div
        class="cell"
        data-kind="cell"
        data-row="1"
        data-col="0"
        data-item-id="4"
        data-name="Item 4"
        style="background: #f59e0b"
      >
        Item 4
      </div>
      <div class="cell" data-kind="cell" data-row="1" data-col="1" data-empty></div>
      <div
        class="cell"
        data-kind="cell"
        data-row="1"
        data-col="2"
        data-item-id="5"
        data-name="Item 5"
        style="background: #8b5cf6"
      >
        Item 5
      </div>

      <!-- Row 2 -->
      <div
        class="cell"
        data-kind="cell"
        data-row="2"
        data-col="0"
        data-item-id="6"
        data-name="Item 6"
        style="background: #ec4899"
      >
        Item 6
      </div>
      <div
        class="cell"
        data-kind="cell"
        data-row="2"
        data-col="1"
        data-item-id="7"
        data-name="Item 7"
        style="background: #14b8a6"
      >
        Item 7
      </div>
      <div class="cell" data-kind="cell" data-row="2" data-col="2" data-empty></div>
    </div>

    <!-- Drag preview element -->
    <div id="drag-preview"></div>

    <script type="module" src="./app.ts"></script>
  </body>
</html>
```

**TypeScript (app.ts):**

```typescript
import { DragDropManager, type DragDropCallbacks } from 'dnd-manager'

// Types
type GridItem = {
  id: string
  name: string
  color: string
}

type GridPosition = {
  row: number
  col: number
}

// Initialize
function initDragDropGrid(): void {
  const container = document.getElementById('grid-container')
  const preview = document.getElementById('drag-preview')

  if (!container || !preview) return

  // Setup DragDropManager callbacks
  const callbacks: DragDropCallbacks<GridItem, GridPosition> = {
    getItemPosition: (element, kind) => {
      const row = element.dataset.row
      const col = element.dataset.col
      if (row === undefined || col === undefined) return null

      return {
        row: parseInt(row, 10),
        col: parseInt(col, 10),
      }
    },

    getItemData: (element, position) => {
      const itemId = element.dataset.itemId
      const name = element.dataset.name
      const color = element.style.background

      if (!itemId || !name || !color) return null

      return {
        id: itemId,
        name: name,
        color: color,
      }
    },

    onDragStart: (element, position, item) => {
      console.log('🚀 Drag started:', item)

      // Copy element dimensions and styles to preview
      const rect = element.getBoundingClientRect()
      preview.textContent = item.name
      preview.style.background = item.color
      preview.style.width = `${rect.width}px`
      preview.style.height = `${rect.height}px`
      preview.style.opacity = '0.9'
    },

    onDragMove: (pos, hoveredElement) => {
      // Update preview position
      preview.style.left = `${pos.x}px`
      preview.style.top = `${pos.y}px`
    },

    onDrop: (sourcePos, targetPos, sourceItem) => {
      console.log('📦 Dropped:', {
        from: sourcePos,
        to: targetPos,
        item: sourceItem,
      })

      // Get source and target elements
      const sourceElement = container.querySelector(
        `[data-row="${sourcePos.row}"][data-col="${sourcePos.col}"]`,
      ) as HTMLElement
      const targetElement = container.querySelector(
        `[data-row="${targetPos.row}"][data-col="${targetPos.col}"]`,
      ) as HTMLElement

      if (!sourceElement || !targetElement) return

      // Swap element contents and data attributes
      const tempContent = sourceElement.innerHTML
      const tempId = sourceElement.dataset.itemId
      const tempName = sourceElement.dataset.name
      const tempColor = sourceElement.style.background
      const tempEmpty = sourceElement.dataset.empty

      // Update source with target data
      sourceElement.innerHTML = targetElement.innerHTML
      sourceElement.dataset.itemId = targetElement.dataset.itemId || ''
      sourceElement.dataset.name = targetElement.dataset.name || ''
      sourceElement.style.background = targetElement.style.background
      if (targetElement.dataset.empty !== undefined) {
        sourceElement.dataset.empty = ''
      } else {
        delete sourceElement.dataset.empty
      }

      // Update target with source data
      targetElement.innerHTML = tempContent
      targetElement.dataset.itemId = tempId || ''
      targetElement.dataset.name = tempName || ''
      targetElement.style.background = tempColor
      if (tempEmpty !== undefined) {
        targetElement.dataset.empty = ''
      } else {
        delete targetElement.dataset.empty
      }
    },

    onDragEnd: () => {
      // Hide preview
      preview.style.opacity = '0'
    },

    onClick: (element, position) => {
      const itemId = element.dataset.itemId
      const name = element.dataset.name
      const color = element.style.background

      if (itemId && name) {
        console.log('👆 Clicked:', { id: itemId, name, color })
      }
    },
  }

  // Create DragDropManager instance
  const dragDropManager = new DragDropManager<GridItem, GridPosition>(
    container,
    {
      draggableKind: 'cell',
      droppableKind: 'cell',
      dragThreshold: 10,
      clickThreshold: 10,
      scrollThreshold: 100,
      scrollSpeed: 10,
      cancelOnEscape: true,
      cancelOnPointerLeave: true,
    },
    callbacks,
  )

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    dragDropManager.destroy()
  })
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initDragDropGrid)
```

---

## Vanilla JS Example with multiple managers

The library also supports dragging between separate manager instances.

You can create two independent `DragDropManager` instances (one per container) and move items
between them when the following conditions are met:

- both containers use compatible `data-kind` values
- `getItemPosition()` includes enough identity to locate an item globally (for example,
  `containerId + itemId`)
- your `onDrop()` updates shared app state (or both DOM containers) using source and target
  positions

The `onDrop` hook is invoked on the manager where the drag started. In practice, this works well for
shared state updates because that callback still receives both source and target positions.

```typescript
import { DragDropManager, type DragDropCallbacks } from 'dnd-manager'

type Item = { id: string; label: string }
type Position = { containerId: 'left' | 'right'; itemId: string }

const left = document.querySelector<HTMLElement>('#left-grid')
const right = document.querySelector<HTMLElement>('#right-grid')

if (!left || !right) {
  throw new Error('Missing containers')
}

const containers: Record<Position['containerId'], HTMLElement> = {
  left,
  right,
}

const getItemPosition: DragDropCallbacks<Item, Position>['getItemPosition'] = (element) => {
  const containerId = element.closest<HTMLElement>('[data-container]')?.dataset.container as
    | Position['containerId']
    | undefined
  const itemId = element.dataset.id
  if (!containerId || !itemId) return null

  return { containerId, itemId }
}

const callbacks: DragDropCallbacks<Item, Position> = {
  getItemData: (element) => ({
    id: element.dataset.id ?? '',
    label: element.dataset.label ?? '',
  }),
  getItemPosition,
  onDrop: (sourcePos, targetPos, sourceItem) => {
    const source = containers[sourcePos.containerId].querySelector<HTMLElement>(
      `[data-id="${sourcePos.itemId}"]`,
    )
    const target = containers[targetPos.containerId].querySelector<HTMLElement>(
      `[data-id="${targetPos.itemId}"]`,
    )
    if (!source || !target) return

    const targetLabel = target.dataset.label ?? ''
    source.dataset.label = targetLabel
    source.textContent = targetLabel
    target.dataset.label = sourceItem.label
    target.textContent = sourceItem.label
  },
}

const leftManager = new DragDropManager<Item, Position>(
  left,
  { draggableKind: 'cell', droppableKind: 'cell' },
  callbacks,
)

const rightManager = new DragDropManager<Item, Position>(
  right,
  { draggableKind: 'cell', droppableKind: 'cell' },
  callbacks,
)

// Cleanup
window.addEventListener('beforeunload', () => {
  leftManager.destroy()
  rightManager.destroy()
})
```

---

## React Example

This example shows the same draggable grid implemented as a React component with TypeScript.

```typescript
import { useEffect, useRef, useState } from 'react'
import { DragDropManager, type DragDropCallbacks } from 'dnd-manager'

// Types
type GridItem = {
  id: string
  name: string
  color: string
}

type GridPosition = {
  row: number
  col: number
}

// Initial data
const INITIAL_DATA: (GridItem | null)[][] = [
  [
    { id: '1', name: 'Item 1', color: '#ef4444' },
    { id: '2', name: 'Item 2', color: '#3b82f6' },
    { id: '3', name: 'Item 3', color: '#10b981' },
  ],
  [
    { id: '4', name: 'Item 4', color: '#f59e0b' },
    null,
    { id: '5', name: 'Item 5', color: '#8b5cf6' },
  ],
  [
    { id: '6', name: 'Item 6', color: '#ec4899' },
    { id: '7', name: 'Item 7', color: '#14b8a6' },
    null,
  ],
]

// Cell component
type CellProps = {
  item: GridItem | null
  row: number
  col: number
} & React.ComponentProps<'div'>

function GridCell({ item, row, col, ...props }: CellProps) {
  if (item) {
    return (
      <div
        data-kind="cell"
        data-row={row}
        data-col={col}
        data-item-id={item.id}
        className="grid-cell grid-cell--filled"
        style={{
          background: item.color,
        }}
        {...props}
      >
        {item.name}
      </div>
    )
  }

  return (
    <div
      data-kind="cell"
      data-row={row}
      data-col={col}
      data-empty="true"
      className="grid-cell grid-cell--empty"
      {...props}
    />
  )
}

// Drag preview component
type DragPreviewProps = {
  item: GridItem | null
  position: { x: number; y: number } | null
  width?: number
  height?: number
}

function DragPreview({ item, position, width, height }: DragPreviewProps) {
  if (!item || !position) return null

  return (
    <div
      className="drag-preview"
      style={{
        left: position.x,
        top: position.y,
        background: item.color,
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
      }}
    >
      {item.name}
    </div>
  )
}

// Main component
export function DraggableGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [gridData, setGridData] = useState<(GridItem | null)[][]>(INITIAL_DATA)
  const [dragPreview, setDragPreview] = useState<{
    item: GridItem | null
    position: { x: number; y: number } | null
    width?: number
    height?: number
  }>({ item: null, position: null })

  useEffect(() => {
    if (!containerRef.current) return

    // Setup callbacks
    const callbacks: DragDropCallbacks<GridItem, GridPosition> = {
      getItemPosition: (element, kind) => {
        const row = element.dataset.row
        const col = element.dataset.col
        if (row === undefined || col === undefined) return null

        return {
          row: parseInt(row, 10),
          col: parseInt(col, 10),
        }
      },

      getItemData: (element, position) => {
        return gridData[position.row][position.col]
      },

      onDragStart: (element, position, item) => {
        console.log('🚀 Drag started:', item)

        // Store element dimensions for preview
        const rect = element.getBoundingClientRect()
        setDragPreview({
          item,
          position: null,
          width: rect.width,
          height: rect.height,
        })
      },

      onDragMove: (pos, hoveredElement) => {
        setDragPreview((prev) => ({
          ...prev,
          position: pos,
        }))
      },

      onDrop: (sourcePos, targetPos, sourceItem) => {
        console.log('📦 Dropped:', {
          from: sourcePos,
          to: targetPos,
          item: sourceItem,
        })

        // Swap items
        setGridData((prevData) => {
          const newData = prevData.map((row) => [...row])
          const targetItem = newData[targetPos.row][targetPos.col]
          newData[targetPos.row][targetPos.col] = sourceItem
          newData[sourcePos.row][sourcePos.col] = targetItem
          return newData
        })
      },

      onDragEnd: () => {
        setDragPreview({ item: null, position: null, width: undefined, height: undefined })
      },

      onClick: (element, position) => {
        const item = gridData[position.row][position.col]
        if (item) {
          console.log('👆 Clicked:', item)
        }
      },
    }

    // Create manager
    const manager = new DragDropManager<GridItem, GridPosition>(
      containerRef,
      {
        draggableKind: 'cell',
        droppableKind: 'cell',
        dragThreshold: 10,
        clickThreshold: 10,
        scrollThreshold: 100,
        scrollSpeed: 10,
        cancelOnEscape: true,
        cancelOnPointerLeave: true,
      },
      callbacks,
    )

    // Cleanup
    return () => {
      manager.destroy()
    }
  }, [gridData])

  return (
    <div className="draggable-grid-container">
      <h1>React Drag & Drop Grid</h1>
      <p>Drag cells to reorder, click to log to console</p>

      <div ref={containerRef} className="grid">
        {gridData.map((row, rowIndex) =>
          row.map((item, colIndex) => (
            <GridCell key={`${rowIndex}-${colIndex}`} item={item} row={rowIndex} col={colIndex} />
          )),
        )}
      </div>

      <DragPreview
        item={dragPreview.item}
        position={dragPreview.position}
        width={dragPreview.width}
        height={dragPreview.height}
      />
    </div>
  )
}
```

**CSS (Tailwind or plain CSS):**

```css
/* Container */
.draggable-grid-container {
  padding: 20px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

/* Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 120px);
  gap: 8px;
  padding: 20px;
}

/* Grid cells */
.grid-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 8px;
  transition:
    transform 0.2s,
    opacity 0.2s,
    box-shadow 0.2s;
  user-select: none;
  touch-action: none;
}

.grid-cell--filled {
  padding: 20px;
  color: white;
  cursor: grab;
  min-height: 80px;
}

.grid-cell--empty {
  background: #f3f4f6;
  border: 2px dashed #d1d5db;
  min-height: 80px;
}

/* Dragging state */
.grid-cell[data-dragging='true'] {
  opacity: 0.4;
  cursor: grabbing !important;
}

/* Hover state */
.grid-cell[data-hovered='true'] {
  transform: scale(1.05);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

/* Drag preview */
.drag-preview {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  padding: 20px;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
}
```

**With Tailwind CSS:**

```typescript
// Update cell component to use Tailwind classes
function GridCell({ item, row, col, ...props }: CellProps) {
  if (item) {
    return (
      <div
        data-kind="cell"
        data-row={row}
        data-col={col}
        data-item-id={item.id}
        className="flex items-center justify-center p-5 rounded-lg cursor-grab
                   font-semibold text-white transition-all duration-200
                   data-[dragging=true]:opacity-40 data-[dragging=true]:cursor-grabbing
                   data-[hovered=true]:scale-105 data-[hovered=true]:ring-4
                   data-[hovered=true]:ring-blue-500/50"
        style={{ background: item.color }}
        {...props}
      >
        {item.name}
      </div>
    )
  }

  return (
    <div
      data-kind="cell"
      data-row={row}
      data-col={col}
      data-empty="true"
      className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg min-h-[80px]"
      {...props}
    />
  )
}

// Drag preview with Tailwind
function DragPreview({ item, position, width, height }: DragPreviewProps) {
  if (!item || !position) return null

  return (
    <div
      className="fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2
                 p-5 rounded-lg text-white font-semibold shadow-2xl opacity-90"
      style={{
        left: position.x,
        top: position.y,
        background: item.color,
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
      }}
    >
      {item.name}
    </div>
  )
}
```

---

## Covered Features

### Both Examples Include:

1. **Grid Layout** - 3x3 grid with draggable cells
2. **Click Detection** - Logs item data to console on click
3. **Drag Preview** - Visual feedback following cursor during drag, matching original element size
4. **Swap Behavior** - Items swap positions on drop
5. **Empty Cells** - Non-draggable placeholder cells
6. **Visual Feedback** - Opacity changes, hover states, and scaling
7. **TypeScript Types** - Full type safety with generics

### DragDropManager Features Used:

- `data-empty` convention - Elements with `data-empty` are automatically treated as non-draggable
- `getItemPosition` - Extracts grid coordinates from data attributes
- `getItemData` - Retrieves item data from grid state
- `onDragStart` - Shows preview and updates source appearance
  - Uses `getBoundingClientRect()` to copy element dimensions to preview
- `onDragMove` - Updates preview position in real-time
- `onDrop` - Swaps items and updates state
- `onDragEnd` - Hides preview
- `onClick` - Handles click/tap events

### Configuration:

- `draggableKind` / `droppableKind` - Accept `string` or `string[]` to match one or many kinds. Each
  element should still expose a single `data-kind` value.
- `dragThreshold: 10` - Prevents accidental drags
- `clickThreshold: 10` - Distinguishes clicks from drags
- `scrollThreshold: 100` - Auto-scroll near viewport edges
- `scrollSpeed: 10` - Smooth scroll speed
- `cancelOnEscape: true` - Cancels active drag when Escape is pressed
- `cancelOnPointerLeave: true` - Cancels active drag if pointer leaves the window

---

## Notes

- **Performance**: The manager uses `requestAnimationFrame` for smooth updates at 60fps
- **Mobile-Friendly**: Uses pointer events which work with touch, mouse, and pen
- **Accessibility**: Uses data attributes that don't interfere with screen readers
- **React Integration**: Manager is created in `useEffect` with proper cleanup
- **State Management**: React example uses `useState` to trigger re-renders after drops
