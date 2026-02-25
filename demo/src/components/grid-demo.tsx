import { DragPreviewController, type DragDropCallbacks } from 'dnd-manager'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDragDropManager } from '~/hooks/use-drag-drop-manager'
import { INITIAL_GRID_DATA } from '~/lib/demo-data'
import type { DemoConfig, DemoItem, GridPosition, ManagerSnapshot } from '~/lib/demo-types'
import { cn } from '~/lib/utils'

type GridDemoProps = {
  config: DemoConfig
  onEvent: (name: string, detail: string) => void
  onManagerSnapshot: (snapshot: ManagerSnapshot) => void
  onInstanceIdChange: (id: number) => void
  onControlsReady: (controls: { restart: () => void; destroy: () => void }) => void
}

function getGridPosition(element: HTMLElement): GridPosition | null {
  const row = element.dataset.row
  const col = element.dataset.col
  if (row === undefined || col === undefined) {
    return null
  }
  return { row: Number(row), col: Number(col) }
}

export function GridDemo({
  config,
  onEvent,
  onManagerSnapshot,
  onInstanceIdChange,
  onControlsReady,
}: GridDemoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastMoveLogAtRef = useRef(0)
  const previewControllerRef = useRef(
    new DragPreviewController({
      className: 'drop-shadow-xl',
    }),
  )
  const [gridData, setGridData] = useState(INITIAL_GRID_DATA)

  useEffect(() => {
    return () => {
      previewControllerRef.current.destroy()
    }
  }, [])

  const callbacks = useMemo<DragDropCallbacks<DemoItem, GridPosition>>(
    () => ({
      getItemPosition: (element) => getGridPosition(element),
      getItemData: (_, position) => {
        return gridData[position.row]?.[position.col] ?? null
      },
      canDrag: (_, position) => {
        const item = gridData[position.row]?.[position.col]
        const allowed = Boolean(item && item.canDrag !== false)
        if (!allowed && item) {
          onEvent('canDrag', `${item.name} is locked (canDrag=false)`)
        }
        return allowed
      },
      onDragStart: (element, position, item) => {
        previewControllerRef.current.startFromElement(element)
        onEvent('onDragStart', `From row ${position.row}, col ${position.col}: ${item.name}`)
      },
      onDragMove: (pos, hoveredElement) => {
        previewControllerRef.current.moveToPointer(pos)
        const now = Date.now()
        if (now - lastMoveLogAtRef.current > 300) {
          lastMoveLogAtRef.current = now
          const hovered = hoveredElement?.dataset.row
            ? `row ${hoveredElement.dataset.row}, col ${hoveredElement.dataset.col}`
            : 'none'
          onEvent(
            'onDragMove',
            `Pointer (${Math.round(pos.x)}, ${Math.round(pos.y)}) over ${hovered}`,
          )
        }
      },
      onDrop: (sourcePosition, targetPosition, sourceItem) => {
        onEvent(
          'onDrop',
          `${sourceItem.name}: (${sourcePosition.row},${sourcePosition.col}) -> (${targetPosition.row},${targetPosition.col})`,
        )
        if (
          sourcePosition.row === targetPosition.row &&
          sourcePosition.col === targetPosition.col
        ) {
          return
        }
        setGridData((previousData) => {
          const nextData = previousData.map((row) => [...row])
          const targetItem = nextData[targetPosition.row]?.[targetPosition.col] ?? null
          nextData[targetPosition.row][targetPosition.col] = sourceItem
          nextData[sourcePosition.row][sourcePosition.col] = targetItem
          return nextData
        })
      },
      onDragEnd: () => {
        previewControllerRef.current.stop()
        onEvent('onDragEnd', 'Drag operation completed')
      },
      onClick: (_, position) => {
        const item = gridData[position.row]?.[position.col]
        if (!item) {
          onEvent('onClick', `Clicked empty cell at (${position.row},${position.col})`)
          return
        }
        onEvent('onClick', `Clicked ${item.name}`)
      },
    }),
    [gridData, onEvent],
  )

  const managerConfig = useMemo(
    () => ({
      draggableKind: 'cell',
      droppableKind: 'cell',
      cancelOnEscape: true,
      cancelOnPointerLeave: true,
      dragThreshold: config.dragThreshold,
      clickThreshold: config.clickThreshold,
      scrollThreshold: config.scrollThreshold,
      scrollSpeed: config.scrollSpeed,
    }),
    [config.clickThreshold, config.dragThreshold, config.scrollSpeed, config.scrollThreshold],
  )

  const manager = useDragDropManager<DemoItem, GridPosition>({
    containerRef,
    config: managerConfig,
    callbacks,
  })

  useEffect(() => {
    onControlsReady({
      destroy: manager.destroyManager,
      restart: manager.restartManager,
    })
  }, [manager.destroyManager, manager.restartManager, onControlsReady])

  useEffect(() => {
    onInstanceIdChange(manager.instanceId)
  }, [manager.instanceId, onInstanceIdChange])

  useEffect(() => {
    const interval = window.setInterval(() => {
      onManagerSnapshot({
        active: manager.instanceId > 0,
        isDragging: manager.isDragging(),
        state: manager.getStateSnapshot(),
      })
    }, 180)

    return () => {
      window.clearInterval(interval)
    }
  }, [manager.getStateSnapshot, manager.instanceId, manager.isDragging, onManagerSnapshot])

  return (
    <section className="panel-card relative space-y-4">
      <header>
        <h3 className="text-base font-semibold text-slate-100">Scenario: Grid Reordering</h3>
        <p className="mt-1 text-xs text-slate-400">
          Includes empty cells and one locked item to demonstrate `data-empty` and `canDrag`.
        </p>
      </header>
      <div ref={containerRef} className="grid grid-cols-3 gap-3 p-2">
        {gridData.map((row, rowIndex) =>
          row.map((item, colIndex) => {
            const isEmpty = !item
            return (
              <article
                key={`${rowIndex}-${colIndex}`}
                data-kind="cell"
                data-row={rowIndex}
                data-col={colIndex}
                data-empty={isEmpty ? 'true' : undefined}
                className={cn(
                  'h-24 rounded-xl border border-slate-700/80 transition duration-150',
                  'flex items-center justify-center text-center text-sm font-semibold select-none touch-none',
                  'data-[dragging=true]:opacity-35 data-[dragging=true]:cursor-grabbing',
                  'data-[hovered=true]:scale-[1.02] data-[hovered=true]:ring-2 data-[hovered=true]:ring-indigo-400/80',
                  isEmpty
                    ? 'border-dashed bg-slate-900/40 text-slate-500'
                    : 'cursor-grab text-white',
                )}
                style={item ? { background: item.color } : undefined}
              >
                {isEmpty ? 'Empty Slot' : item.name}
              </article>
            )
          }),
        )}
      </div>
    </section>
  )
}
