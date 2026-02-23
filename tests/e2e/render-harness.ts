import { DragDropManager } from '../../dist/index.mjs'

type DemoItem = {
  id: string
  label: string
}

type DemoPosition = string

const CELL_COLORS: Record<string, string> = {
  a: '#ef4444',
  b: '#2563eb',
}

function getCellColor(id: string): string {
  return CELL_COLORS[id] ?? '#334155'
}

export function renderHarness(): { dragStartCellA: () => void; destroy: () => void } {
  document.body.innerHTML = `
    <h1>dnd-manager static harness</h1>
    <p id="status" data-testid="status">Loading...</p>
    <div id="grid" class="grid" data-testid="grid">
      <div
        class="cell"
        data-testid="cell-a"
        data-kind="cell"
        data-id="a"
        data-label="Alpha"
        style="background: #ef4444"
      >
        Alpha
      </div>
      <div
        class="cell"
        data-testid="cell-b"
        data-kind="cell"
        data-id="b"
        data-label="Beta"
        style="background: #2563eb"
      >
        Beta
      </div>
    </div>
    <div id="drag-preview" hidden data-testid="drag-preview"></div>
  `

  const status = document.querySelector<HTMLElement>('[data-testid="status"]')
  const grid = document.querySelector<HTMLElement>('[data-testid="grid"]')
  const preview = document.querySelector<HTMLElement>('[data-testid="drag-preview"]')
  const cellA = document.querySelector<HTMLElement>('[data-testid="cell-a"]')

  if (!status || !grid || !preview || !cellA) {
    throw new Error('Failed to render e2e harness')
  }

  status.textContent = 'Library loaded from dist.'

  const updateCellVisual = (cell: HTMLElement, item: DemoItem): void => {
    cell.dataset.id = item.id
    cell.dataset.label = item.label
    cell.textContent = item.label
    cell.style.background = getCellColor(item.id)
  }

  const manager = new DragDropManager<DemoItem, DemoPosition>(
    grid,
    {
      draggableKind: 'cell',
      droppableKind: 'cell',
      dragThreshold: 4,
      clickThreshold: 8,
    },
    {
      onDragStart: (_element, _position, item) => {
        preview.hidden = false
        preview.textContent = item.label
        preview.style.background = getCellColor(item.id)
        status.textContent = `Dragging ${item.label}`
      },
      onDragMove: (pos) => {
        preview.style.left = `${pos.x}px`
        preview.style.top = `${pos.y}px`
      },
      onDrop: (sourcePosition, targetPosition, sourceItem) => {
        const sourceCell = grid.querySelector<HTMLElement>(`[data-id="${sourcePosition}"]`)
        const targetCell = grid.querySelector<HTMLElement>(`[data-id="${targetPosition}"]`)
        if (!sourceCell || !targetCell) return

        const targetItem = {
          id: targetCell.dataset.id ?? '',
          label: targetCell.dataset.label ?? '',
        }

        updateCellVisual(targetCell, sourceItem)
        updateCellVisual(sourceCell, targetItem)
        status.textContent = `Dropped ${sourceItem.label} on ${targetPosition.toUpperCase()}`
      },
      onDragEnd: () => {
        preview.hidden = true
        status.textContent = 'Ready'
      },
      onClick: (element) => {
        status.textContent = `Clicked ${element.dataset.label}`
      },
      getItemData: (element) => ({
        id: element.dataset.id ?? '',
        label: element.dataset.label ?? '',
      }),
      getItemPosition: (element) => element.dataset.id ?? null,
    },
  )

  const dragStartCellA = (): void => {
    cellA.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 80, clientY: 80 }),
    )
    cellA.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 92, clientY: 80 }),
    )
  }

  return {
    dragStartCellA,
    destroy: () => manager.destroy(),
  }
}
