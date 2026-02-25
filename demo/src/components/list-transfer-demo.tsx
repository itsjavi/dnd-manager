import { DragPreviewController, type DragDropCallbacks } from 'dnd-manager'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDragDropManager } from '~/hooks/use-drag-drop-manager'
import type { DemoConfig, ManagerSnapshot } from '~/lib/demo-types'
import { cn } from '~/lib/utils'

type TransferKind = 'quest' | 'bounty'
type TransferListId = 'backlog' | 'active'

type TransferItem = {
  id: string
  name: string
  color: string
  kind: TransferKind
}

type TransferPosition = {
  listId: TransferListId
  index: number
}

type TransferData = Record<TransferListId, (TransferItem | null)[]>

type ListTransferDemoProps = {
  config: DemoConfig
  onEvent: (name: string, detail: string) => void
  onManagerSnapshot: (snapshot: ManagerSnapshot) => void
  onInstanceIdChange: (id: number) => void
  onControlsReady: (controls: { restart: () => void; destroy: () => void }) => void
}

const LIST_CONFIG: Record<
  TransferListId,
  { title: string; accepts: TransferKind[]; description: string }
> = {
  backlog: {
    title: 'Backlog',
    accepts: ['quest', 'bounty'],
    description: 'Accepts quest and bounty items.',
  },
  active: {
    title: 'Active Quests',
    accepts: ['quest'],
    description: 'Accepts only quest items.',
  },
}

const INITIAL_TRANSFER_DATA: TransferData = {
  backlog: [
    { id: 'q1', name: 'Rescue the Ranger', color: '#4f46e5', kind: 'quest' },
    { id: 'b1', name: 'Track the Bandit', color: '#f97316', kind: 'bounty' },
    { id: 'q2', name: 'Seal the Rift', color: '#0ea5e9', kind: 'quest' },
    { id: 'b2', name: 'Capture the Smuggler', color: '#f59e0b', kind: 'bounty' },
    null,
    null,
  ],
  active: [
    { id: 'q3', name: 'Escort the Caravan', color: '#8b5cf6', kind: 'quest' },
    null,
    null,
    null,
    null,
    null,
  ],
}

function getTransferPosition(element: HTMLElement): TransferPosition | null {
  const listId = element.dataset.listId as TransferListId | undefined
  const index = element.dataset.index
  if (!listId || (listId !== 'backlog' && listId !== 'active') || index === undefined) {
    return null
  }
  return {
    listId,
    index: Number(index),
  }
}

function kindBadgeClass(kind: TransferKind): string {
  switch (kind) {
    case 'quest':
      return 'border-indigo-300/60 bg-indigo-400/20 text-indigo-100'
    case 'bounty':
      return 'border-amber-300/60 bg-amber-400/20 text-amber-100'
    default: {
      const exhaustiveKind: never = kind
      return exhaustiveKind
    }
  }
}

export function ListTransferDemo({
  config,
  onEvent,
  onManagerSnapshot,
  onInstanceIdChange,
  onControlsReady,
}: ListTransferDemoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewControllerRef = useRef(
    new DragPreviewController({
      className: 'drop-shadow-xl',
    }),
  )
  const [transferData, setTransferData] = useState<TransferData>(INITIAL_TRANSFER_DATA)
  const [draggedKind, setDraggedKind] = useState<TransferKind | null>(null)

  useEffect(() => {
    return () => {
      previewControllerRef.current.destroy()
    }
  }, [])

  const callbacks = useMemo<DragDropCallbacks<TransferItem, TransferPosition>>(
    () => ({
      getItemPosition: (element) => getTransferPosition(element),
      getItemData: (_element, position) => transferData[position.listId]?.[position.index] ?? null,
      onDragStart: (element, position, item) => {
        previewControllerRef.current.startFromElement(element)
        setDraggedKind(item.kind)
        onEvent('onDragStart', `Dragging ${item.name} (${item.kind}) from ${position.listId}`)
      },
      onDragMove: (pos) => {
        previewControllerRef.current.moveToPointer(pos)
      },
      onDrop: (sourcePosition, targetPosition, sourceItem) => {
        if (
          sourcePosition.listId === targetPosition.listId &&
          sourcePosition.index === targetPosition.index
        ) {
          return
        }

        const acceptedKinds = LIST_CONFIG[targetPosition.listId].accepts
        if (!acceptedKinds.includes(sourceItem.kind)) {
          onEvent(
            'onDropRejected',
            `${sourceItem.kind} cannot be dropped in ${LIST_CONFIG[targetPosition.listId].title}`,
          )
          return
        }

        onEvent(
          'onDrop',
          `${sourceItem.name} moved ${sourcePosition.listId}[${sourcePosition.index}] -> ${targetPosition.listId}[${targetPosition.index}]`,
        )

        setTransferData((previousData) => {
          const nextData: TransferData = {
            backlog: [...previousData.backlog],
            active: [...previousData.active],
          }
          const targetItem = nextData[targetPosition.listId][targetPosition.index] ?? null
          nextData[targetPosition.listId][targetPosition.index] = sourceItem
          nextData[sourcePosition.listId][sourcePosition.index] = targetItem
          return nextData
        })
      },
      onDragEnd: () => {
        previewControllerRef.current.stop()
        setDraggedKind(null)
        onEvent('onDragEnd', 'Transfer drag completed')
      },
      onClick: (_element, position) => {
        const item = transferData[position.listId][position.index]
        onEvent(
          'onClick',
          item
            ? `${item.name} (${item.kind}) in ${position.listId}`
            : `Clicked empty slot ${position.listId}[${position.index}]`,
        )
      },
    }),
    [onEvent, transferData],
  )

  const managerConfig = useMemo(
    () => ({
      draggableKind: 'transfer-item',
      droppableKind: 'transfer-item',
      cancelOnEscape: true,
      cancelOnPointerLeave: true,
      dragThreshold: config.dragThreshold,
      clickThreshold: config.clickThreshold,
      scrollThreshold: config.scrollThreshold,
      scrollSpeed: config.scrollSpeed,
    }),
    [config.clickThreshold, config.dragThreshold, config.scrollSpeed, config.scrollThreshold],
  )

  const manager = useDragDropManager<TransferItem, TransferPosition>({
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
        <h3 className="text-base font-semibold text-slate-100">
          Scenario: List Transfer With Kind Rules
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Move items between lists only when the target list accepts that item kind.
        </p>
      </header>
      <div ref={containerRef} className="grid gap-4 md:grid-cols-2">
        {(Object.keys(LIST_CONFIG) as TransferListId[]).map((listId) => {
          const listConfig = LIST_CONFIG[listId]
          const acceptsDraggedKind = draggedKind ? listConfig.accepts.includes(draggedKind) : true
          const hoverRingClass = acceptsDraggedKind
            ? 'data-[hovered=true]:ring-emerald-400/80'
            : 'data-[hovered=true]:ring-rose-400/80'
          return (
            <article
              key={listId}
              className="rounded-xl border border-slate-800/80 bg-slate-950/35 p-3"
            >
              <h4 className="text-sm font-semibold text-slate-100">{listConfig.title}</h4>
              <p className="mt-1 text-xs text-slate-400">{listConfig.description}</p>
              <div className="mt-3 space-y-2">
                {transferData[listId].map((item, index) => (
                  <div
                    key={`${listId}-${index}`}
                    data-kind="transfer-item"
                    data-list-id={listId}
                    data-index={index}
                    data-empty={item ? undefined : 'true'}
                    className={cn(
                      'rounded-lg border border-slate-700/80 px-3 py-2 transition duration-150 select-none touch-none',
                      'data-[dragging=true]:opacity-40 data-[dragging=true]:cursor-grabbing',
                      'data-[hovered=true]:scale-[1.01] data-[hovered=true]:ring-2',
                      hoverRingClass,
                      item
                        ? 'cursor-grab text-white'
                        : 'border-dashed bg-slate-900/40 text-sm text-slate-500',
                    )}
                    style={item ? { background: item.color } : undefined}
                  >
                    {item ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{item.name}</span>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            kindBadgeClass(item.kind),
                          )}
                        >
                          {item.kind}
                        </span>
                      </div>
                    ) : (
                      <span>Empty Slot</span>
                    )}
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
