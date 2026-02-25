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
  index?: number
}

type TransferData = Record<TransferListId, TransferItem[]>

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
  ],
  active: [{ id: 'q3', name: 'Escort the Caravan', color: '#8b5cf6', kind: 'quest' }],
}

function getTransferPosition(element: HTMLElement): TransferPosition | null {
  const listId = element.dataset.listId as TransferListId | undefined
  const index = element.dataset.index
  if (!listId || (listId !== 'backlog' && listId !== 'active')) {
    return null
  }
  const parsedIndex = index === undefined ? undefined : Number(index)
  return {
    listId,
    index: Number.isFinite(parsedIndex) ? parsedIndex : undefined,
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
      getItemData: (_element, position) => {
        if (position.index === undefined) {
          return null
        }
        return transferData[position.listId]?.[position.index] ?? null
      },
      onDragStart: (element, position, item) => {
        previewControllerRef.current.startFromElement(element)
        setDraggedKind(item.kind)
        onEvent('onDragStart', `Dragging ${item.name} (${item.kind}) from ${position.listId}`)
      },
      onDragMove: (pos) => {
        previewControllerRef.current.moveToPointer(pos)
      },
      onDrop: (sourcePosition, targetPosition, sourceItem) => {
        const sourceIndex = sourcePosition.index
        if (sourceIndex === undefined) {
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

        const targetIndex = targetPosition.index
        if (
          sourcePosition.listId === targetPosition.listId &&
          (targetIndex === undefined || targetIndex === sourceIndex)
        ) {
          return
        }

        // For cross-list item-to-item swaps, validate that the displaced item
        // can move back into the source list.
        if (targetIndex !== undefined && sourcePosition.listId !== targetPosition.listId) {
          const displacedItem = transferData[targetPosition.listId][targetIndex]
          if (displacedItem) {
            const sourceAcceptedKinds = LIST_CONFIG[sourcePosition.listId].accepts
            if (!sourceAcceptedKinds.includes(displacedItem.kind)) {
              onEvent(
                'onDropRejected',
                `${displacedItem.kind} cannot be moved to ${LIST_CONFIG[sourcePosition.listId].title}`,
              )
              return
            }
          }
        }

        onEvent(
          'onDrop',
          targetIndex === undefined
            ? `${sourceItem.name} moved ${sourcePosition.listId}[${sourceIndex}] -> ${targetPosition.listId}`
            : `${sourceItem.name} moved ${sourcePosition.listId}[${sourceIndex}] -> ${targetPosition.listId}[${targetIndex}]`,
        )

        setTransferData((previousData) => {
          if (sourcePosition.listId === targetPosition.listId && targetIndex !== undefined) {
            const nextList = [...previousData[sourcePosition.listId]]
            const sourceItemInList = nextList[sourceIndex]
            const targetItemInList = nextList[targetIndex]
            if (!sourceItemInList || !targetItemInList) {
              return previousData
            }
            nextList[sourceIndex] = targetItemInList
            nextList[targetIndex] = sourceItemInList
            return {
              ...previousData,
              [sourcePosition.listId]: nextList,
            }
          }

          const sourceList = [...previousData[sourcePosition.listId]]
          const targetList = [...previousData[targetPosition.listId]]
          const [movedItem] = sourceList.splice(sourceIndex, 1)
          if (!movedItem) {
            return previousData
          }

          if (targetIndex === undefined) {
            targetList.push(movedItem)
          } else {
            const displacedItem = targetList[targetIndex]
            targetList[targetIndex] = movedItem
            if (displacedItem) {
              sourceList.push(displacedItem)
            }
          }

          return {
            ...previousData,
            [sourcePosition.listId]: sourceList,
            [targetPosition.listId]: targetList,
          }
        })
      },
      onDragEnd: () => {
        previewControllerRef.current.stop()
        setDraggedKind(null)
        onEvent('onDragEnd', 'Transfer drag completed')
      },
      onClick: (_element, position) => {
        const item =
          position.index === undefined
            ? null
            : (transferData[position.listId][position.index] ?? null)
        onEvent(
          'onClick',
          item
            ? `${item.name} (${item.kind}) in ${position.listId}`
            : `Clicked column ${position.listId}`,
        )
      },
    }),
    [onEvent, transferData],
  )

  const managerConfig = useMemo(
    () => ({
      draggableKind: ['quest', 'bounty'],
      droppableKind: ['transfer-list', 'quest', 'bounty'],
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
              data-kind="transfer-list"
              data-list-id={listId}
              className={cn(
                'rounded-xl border border-slate-800/80 bg-slate-950/35 p-3 transition duration-150',
                'data-[hovered=true]:ring-2',
                hoverRingClass,
              )}
            >
              <h4 className="text-sm font-semibold text-slate-100">{listConfig.title}</h4>
              <p className="mt-1 text-xs text-slate-400">{listConfig.description}</p>
              <div className="mt-3 space-y-2">
                {transferData[listId].map((item, index) => (
                  <div
                    key={item.id}
                    data-kind={item.kind}
                    data-list-id={listId}
                    data-index={index}
                    className={cn(
                      'flex cursor-grab select-none items-center justify-between gap-2 rounded-md px-3 py-2 text-white transition duration-150 touch-none',
                      'data-[dragging=true]:cursor-grabbing data-[dragging=true]:opacity-40',
                      'data-[hovered=true]:opacity-65 data-[hovered=true]:ring-2 data-[hovered=true]:ring-white/35',
                    )}
                    style={{ background: item.color }}
                  >
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
                ))}
                {transferData[listId].length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-700/80 px-3 py-4 text-sm text-slate-500">
                    Drop here
                  </div>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
