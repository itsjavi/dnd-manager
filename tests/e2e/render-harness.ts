import { DragDropManager, DragPreviewController } from '../../dist/index.mjs'

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

type RenderHarnessResult = {
  dragStartCellA: () => void
  dragCellAToCellBAndDrop: () => void
  cancelDragFromCellA: () => void
  smallMoveFromCellAThenRelease: () => void
  destroy: () => void
}

type MultiContainerPosition = {
  containerId: string
  itemId: string
}

type RenderCrossContainerHarnessResult = {
  dragLeftAToRightBAndDrop: () => void
  destroy: () => void
}

export function renderHarness(): RenderHarnessResult {
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
  `

  const status = document.querySelector<HTMLElement>('[data-testid="status"]')
  const grid = document.querySelector<HTMLElement>('[data-testid="grid"]')
  const cellA = document.querySelector<HTMLElement>('[data-testid="cell-a"]')
  const cellB = document.querySelector<HTMLElement>('[data-testid="cell-b"]')

  if (!status || !grid || !cellA || !cellB) {
    throw new Error('Failed to render e2e harness')
  }

  status.textContent = 'Library loaded from dist.'

  const updateCellVisual = (cell: HTMLElement, item: DemoItem): void => {
    cell.dataset.id = item.id
    cell.dataset.label = item.label
    cell.textContent = item.label
    cell.style.background = getCellColor(item.id)
  }

  const previewController = new DragPreviewController({
    className: 'drop-shadow-xl',
  })

  const manager = new DragDropManager<DemoItem, DemoPosition>(
    grid,
    {
      draggableKind: 'cell',
      droppableKind: 'cell',
      dragThreshold: 4,
      clickThreshold: 8,
    },
    {
      onDragStart: (element, _position, item) => {
        previewController.startFromElement(element)
        status.textContent = `Dragging ${item.label}`
      },
      onDragMove: (pos) => {
        previewController.moveToPointer(pos)
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
        previewController.stop()
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

  const dragCellAToCellBAndDrop = (): void => {
    const cellBRect = cellB.getBoundingClientRect()
    const targetX = Math.round(cellBRect.left + cellBRect.width / 2)
    const targetY = Math.round(cellBRect.top + cellBRect.height / 2)

    dragStartCellA()
    cellA.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: targetX, clientY: targetY }),
    )
    cellA.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: targetX, clientY: targetY }),
    )
  }

  const cancelDragFromCellA = (): void => {
    dragStartCellA()
    cellA.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, clientX: 92, clientY: 80 }),
    )
  }

  const smallMoveFromCellAThenRelease = (): void => {
    cellA.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 80, clientY: 80 }),
    )
    cellA.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 82, clientY: 80 }),
    )
    cellA.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 82, clientY: 80 }))
  }

  return {
    dragStartCellA,
    dragCellAToCellBAndDrop,
    cancelDragFromCellA,
    smallMoveFromCellAThenRelease,
    destroy: () => {
      previewController.destroy()
      manager.destroy()
    },
  }
}

export function renderCrossContainerHarness(): RenderCrossContainerHarnessResult {
  document.body.innerHTML = `
    <h1>dnd-manager static harness</h1>
    <p id="status" data-testid="status">Loading...</p>
    <div class="lanes">
      <section data-testid="left-lane">
        <h2>Left</h2>
        <div id="left-grid" data-container="left" data-testid="left-grid">
          <div data-kind="cell" data-testid="left-cell-a" data-id="a" data-label="Alpha">Alpha</div>
          <div data-kind="cell" data-testid="left-cell-b" data-id="b" data-label="Beta">Beta</div>
        </div>
      </section>
      <section data-testid="right-lane">
        <h2>Right</h2>
        <div id="right-grid" data-container="right" data-testid="right-grid">
          <div data-kind="cell" data-testid="right-cell-a" data-id="a" data-label="Gamma">Gamma</div>
          <div data-kind="cell" data-testid="right-cell-b" data-id="b" data-label="Delta">Delta</div>
        </div>
      </section>
    </div>
  `

  const status = document.querySelector<HTMLElement>('[data-testid="status"]')
  const leftGrid = document.querySelector<HTMLElement>('[data-testid="left-grid"]')
  const rightGrid = document.querySelector<HTMLElement>('[data-testid="right-grid"]')
  const leftCellA = document.querySelector<HTMLElement>('[data-testid="left-cell-a"]')
  const rightCellB = document.querySelector<HTMLElement>('[data-testid="right-cell-b"]')

  if (!status || !leftGrid || !rightGrid || !leftCellA || !rightCellB) {
    throw new Error('Failed to render cross-container e2e harness')
  }

  status.textContent = 'Library loaded from dist.'

  const allGrids: Record<string, HTMLElement> = {
    left: leftGrid,
    right: rightGrid,
  }

  const updateCellVisual = (cell: HTMLElement, nextLabel: string): void => {
    cell.dataset.label = nextLabel
    cell.textContent = nextLabel
  }

  const getPositionFromElement = (element: HTMLElement): MultiContainerPosition | null => {
    const container = element.closest<HTMLElement>('[data-container]')
    const containerId = container?.dataset.container
    const itemId = element.dataset.id
    if (!containerId || !itemId) return null

    return { containerId, itemId }
  }

  const getCellAtPosition = (position: MultiContainerPosition): HTMLElement | null => {
    const grid = allGrids[position.containerId]
    if (!grid) return null
    return grid.querySelector<HTMLElement>(`[data-id="${position.itemId}"]`)
  }

  const createManager = (grid: HTMLElement): DragDropManager<DemoItem, MultiContainerPosition> =>
    new DragDropManager<DemoItem, MultiContainerPosition>(
      grid,
      {
        draggableKind: 'cell',
        droppableKind: 'cell',
        dragThreshold: 4,
      },
      {
        getItemData: (element) => ({
          id: element.dataset.id ?? '',
          label: element.dataset.label ?? '',
        }),
        getItemPosition: (element) => getPositionFromElement(element),
        onDrop: (sourcePos, targetPos, sourceItem) => {
          const sourceCell = getCellAtPosition(sourcePos)
          const targetCell = getCellAtPosition(targetPos)
          if (!sourceCell || !targetCell) return

          const targetLabel = targetCell.dataset.label ?? ''
          updateCellVisual(targetCell, sourceItem.label)
          updateCellVisual(sourceCell, targetLabel)

          status.textContent = `Moved ${sourceItem.label} from ${sourcePos.containerId} to ${targetPos.containerId}`
        },
        onDragEnd: () => {
          if (status.textContent?.startsWith('Moved ')) return
          status.textContent = 'Ready'
        },
      },
    )

  const leftManager = createManager(leftGrid)
  const rightManager = createManager(rightGrid)

  const dragLeftAToRightBAndDrop = (): void => {
    const targetRect = rightCellB.getBoundingClientRect()
    const targetX = Math.round(targetRect.left + targetRect.width / 2)
    const targetY = Math.round(targetRect.top + targetRect.height / 2)

    leftCellA.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 80 }),
    )
    leftCellA.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 72, clientY: 80 }),
    )
    leftCellA.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: targetX, clientY: targetY }),
    )
    leftCellA.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: targetX, clientY: targetY }),
    )
  }

  return {
    dragLeftAToRightBAndDrop,
    destroy: () => {
      leftManager.destroy()
      rightManager.destroy()
    },
  }
}
