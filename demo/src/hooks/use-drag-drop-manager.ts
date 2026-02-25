import { DragDropManager, type DragDropCallbacks, type DragDropConfig } from 'dnd-manager'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

type UseDragDropManagerParams<TItem, TPosition> = {
  containerRef: RefObject<HTMLElement | null>
  config: DragDropConfig
  callbacks: DragDropCallbacks<TItem, TPosition>
  enabled?: boolean
}

type UseDragDropManagerResult = {
  instanceId: number
  getStateSnapshot: () => Record<string, unknown> | null
  isDragging: () => boolean
  destroyManager: () => void
  restartManager: () => void
}

export function useDragDropManager<TItem, TPosition>({
  containerRef,
  config,
  callbacks,
  enabled = true,
}: UseDragDropManagerParams<TItem, TPosition>): UseDragDropManagerResult {
  const managerRef = useRef<DragDropManager<TItem, TPosition> | null>(null)
  const [instanceId, setInstanceId] = useState(0)
  const [restartTick, setRestartTick] = useState(0)

  const destroyManager = useCallback(() => {
    managerRef.current?.destroy()
    managerRef.current = null
  }, [])

  const restartManager = useCallback(() => {
    setRestartTick((previousTick) => previousTick + 1)
  }, [])

  const getStateSnapshot = useCallback(() => {
    const state = managerRef.current?.getState()
    if (!state) {
      return null
    }
    return {
      startPosition: state.startPosition,
      sourceElement: state.sourceElement ? state.sourceElement.dataset : null,
      sourcePosition: state.sourcePosition as Record<string, unknown> | null,
      sourceItem: state.sourceItem as Record<string, unknown> | null,
      isDragging: state.isDragging,
      lastHoveredElement: state.lastHoveredElement ? state.lastHoveredElement.dataset : null,
    }
  }, [])

  const isDragging = useCallback(() => {
    return managerRef.current?.isDragging() ?? false
  }, [])

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      destroyManager()
      return
    }

    const manager = new DragDropManager<TItem, TPosition>(containerRef, config, callbacks)
    managerRef.current = manager
    setInstanceId((previousId) => previousId + 1)

    return () => {
      manager.destroy()
      if (managerRef.current === manager) {
        managerRef.current = null
      }
    }
  }, [callbacks, config, containerRef, destroyManager, enabled, restartTick])

  return {
    instanceId,
    getStateSnapshot,
    isDragging,
    destroyManager,
    restartManager,
  }
}
