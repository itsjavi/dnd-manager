import { DragPreviewController, type DragDropCallbacks } from 'dnd-manager'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDragDropManager } from '~/hooks/use-drag-drop-manager'
import { INITIAL_LIST_DATA } from '~/lib/demo-data'
import type { DemoConfig, DemoItem, ListPosition, ManagerSnapshot } from '~/lib/demo-types'
import { cn } from '~/lib/utils'

type AutoScrollListDemoProps = {
  config: DemoConfig
  onEvent: (name: string, detail: string) => void
  onManagerSnapshot: (snapshot: ManagerSnapshot) => void
  onInstanceIdChange: (id: number) => void
  onControlsReady: (controls: { restart: () => void; destroy: () => void }) => void
}

function getListPosition(element: HTMLElement): ListPosition | null {
  const index = element.dataset.index
  if (index === undefined) {
    return null
  }
  return { index: Number(index) }
}

export function AutoScrollListDemo({
  config,
  onEvent,
  onManagerSnapshot,
  onInstanceIdChange,
  onControlsReady,
}: AutoScrollListDemoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewControllerRef = useRef(
    new DragPreviewController({
      className: 'drop-shadow-xl',
    }),
  )
  const [listData, setListData] = useState(INITIAL_LIST_DATA)

  useEffect(() => {
    return () => {
      previewControllerRef.current.destroy()
    }
  }, [])

  const callbacks = useMemo<DragDropCallbacks<DemoItem, ListPosition>>(
    () => ({
      getItemPosition: (element) => getListPosition(element),
      getItemData: (_, position) => listData[position.index] ?? null,
      onDragStart: (element, position, item) => {
        previewControllerRef.current.startFromElement(element)
        onEvent('onDragStart', `List index ${position.index}: ${item.name}`)
      },
      onDragMove: (pos) => {
        previewControllerRef.current.moveToPointer(pos)
      },
      onDrop: (sourcePosition, targetPosition, sourceItem) => {
        onEvent('onDrop', `${sourceItem.name}: ${sourcePosition.index} -> ${targetPosition.index}`)
        if (sourcePosition.index === targetPosition.index) {
          return
        }
        setListData((previousData) => {
          const nextData = [...previousData]
          const target = nextData[targetPosition.index] ?? null
          nextData[targetPosition.index] = sourceItem
          nextData[sourcePosition.index] = target
          return nextData
        })
      },
      onDragEnd: () => {
        previewControllerRef.current.stop()
        onEvent('onDragEnd', 'List drag completed')
      },
      onClick: (_, position) => {
        const item = listData[position.index]
        onEvent(
          'onClick',
          item ? `Clicked ${item.name}` : `Clicked empty slot at ${position.index}`,
        )
      },
    }),
    [listData, onEvent],
  )

  const managerConfig = useMemo(
    () => ({
      draggableKind: 'list-item',
      droppableKind: 'list-item',
      cancelOnEscape: true,
      cancelOnPointerLeave: true,
      dragThreshold: config.dragThreshold,
      clickThreshold: config.clickThreshold,
      scrollThreshold: config.scrollThreshold,
      scrollSpeed: config.scrollSpeed,
    }),
    [config.clickThreshold, config.dragThreshold, config.scrollSpeed, config.scrollThreshold],
  )

  const manager = useDragDropManager<DemoItem, ListPosition>({
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
        <h3 className="text-base font-semibold text-slate-100">Scenario: Auto-Scroll List</h3>
        <p className="mt-1 text-xs text-slate-400">
          Scroll this section and drag near viewport edges to trigger auto-scroll.
        </p>
      </header>
      <div ref={containerRef} className="space-y-2">
        {listData.map((item, index) => (
          <article
            key={`slot-${index}`}
            data-kind="list-item"
            data-index={index}
            data-empty={item ? undefined : 'true'}
            className={cn(
              'h-16 rounded-xl border border-slate-700/80 px-4 transition duration-150',
              'flex items-center text-sm font-medium select-none touch-none',
              'data-[dragging=true]:opacity-40 data-[dragging=true]:cursor-grabbing',
              'data-[hovered=true]:scale-[1.01] data-[hovered=true]:ring-2 data-[hovered=true]:ring-cyan-400/80',
              item ? 'cursor-grab text-white' : 'border-dashed bg-slate-900/40 text-slate-500',
            )}
            style={item ? { background: item.color } : undefined}
          >
            {item ? item.name : `Empty Slot ${index + 1}`}
          </article>
        ))}
      </div>
    </section>
  )
}
