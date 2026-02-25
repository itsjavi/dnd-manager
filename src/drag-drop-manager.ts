/**
 * Framework-agnostic Drag and Drop Manager
 *
 * A data-driven drag-and-drop utility that works with React and vanilla JS.
 * Uses data attributes and direct DOM manipulation for optimal performance.
 *
 * @template TItem - The type of data associated with draggable items
 * @template TPosition - The type representing position/coordinates (e.g., {x, y}, {box, cell}, etc.)
 */

export type DragDropConfig = {
  /**
   * Minimum distance in pixels the pointer must move before a drag operation starts.
   * Prevents accidental drags from small movements and allows normal scrolling on mobile.
   * Checked during `pointermove` before drag has started.
   * @default 10
   * @example
   * dragThreshold: 15  // Harder to start drag (better for mobile scroll)
   */
  dragThreshold?: number

  /**
   * Maximum distance in pixels between pointerdown and pointerup to treat as a click/tap.
   * Used to distinguish intentional clicks from cancelled drag attempts.
   * Only checked on `pointerup` if drag never started.
   * @default 10
   * @example
   * clickThreshold: 5   // Stricter click detection
   * clickThreshold: 15  // More forgiving for mobile taps
   */
  clickThreshold?: number

  /**
   * Distance in pixels from viewport edge that triggers auto-scrolling during drag.
   * When dragging near screen edges, the window automatically scrolls.
   * @default 100
   * @example
   * scrollThreshold: 50   // Start scrolling closer to edges
   * scrollThreshold: 150  // Larger safe zone before scrolling
   */
  scrollThreshold?: number

  /**
   * Scroll speed in pixels per animation frame during auto-scroll.
   * Higher values = faster scrolling when dragging near viewport edges.
   * @default 10
   * @example
   * scrollSpeed: 5   // Slower, smoother scroll
   * scrollSpeed: 20  // Faster scroll
   */
  scrollSpeed?: number

  /**
   * Cancel the current drag operation when Escape is pressed.
   * Useful for explicit keyboard cancellation.
   * @default true
   */
  cancelOnEscape?: boolean

  /**
   * Cancel the current drag operation when the pointer leaves the browser window.
   * Prevents "stuck dragging" when pointerup happens outside the app/window.
   * @default true
   */
  cancelOnPointerLeave?: boolean

  /**
   * The `data-kind` value(s) for draggable elements.
   * Can be a single kind or multiple kinds.
   * Each draggable element should still expose a single `data-kind` value.
   * @example
   * draggableKind: 'cell'       // <div data-kind="cell">
   * draggableKind: ['quest', 'bounty'] // <div data-kind="quest">
   * draggableKind: 'card'       // <div data-kind="card">
   * draggableKind: 'list-item'  // <div data-kind="list-item">
   */
  draggableKind: string | string[]

  /**
   * The `data-kind` value(s) for droppable target elements.
   * Can be a single kind or multiple kinds.
   * Elements with matching kinds can receive dropped items.
   * Each droppable element should still expose a single `data-kind` value.
   * Often the same as `draggableKind` for reorderable lists.
   * @example
   * droppableKind: 'cell'   // Can drop on cells
   * droppableKind: ['quest', 'bounty'] // Can drop on either kind
   * droppableKind: 'zone'   // Can drop on zones
   */
  droppableKind: string | string[]
}

export type PointerPosition = {
  x: number
  y: number
}

export type DragDropCallbacks<TItem, TPosition> = {
  /** Called when determining if an element can be dragged */
  canDrag?: (element: HTMLElement, position: TPosition) => boolean
  /** Called when drag starts (after threshold is met) */
  onDragStart?: (element: HTMLElement, position: TPosition, item: TItem) => void
  /** Called continuously during drag */
  onDragMove?: (pos: PointerPosition, hoveredElement: HTMLElement | null) => void
  /** Called when item is dropped on a valid target */
  onDrop?: (sourcePosition: TPosition, targetPosition: TPosition, sourceItem: TItem) => void
  /** Called when drag ends (regardless of success) */
  onDragEnd?: () => void
  /** Called on simple click/tap (no drag) */
  onClick?: (element: HTMLElement, position: TPosition) => void
  /** Called to extract item data from an element */
  getItemData?: (element: HTMLElement, position: TPosition) => TItem | null
  /** Called to get the custom position/coordinates of an element */
  getItemPosition: (element: HTMLElement, kind: string) => TPosition | null
}

type DragState<TItem, TPosition> = {
  startPosition: PointerPosition | null
  sourceElement: HTMLElement | null
  sourcePosition: TPosition | null
  sourceItem: TItem | null
  activePointerId: number | null
  isDragging: boolean
  lastHoveredElement: HTMLElement | null
}

export class DragDropManager<TItem = unknown, TPosition = unknown> {
  private container: HTMLElement
  private config: Required<DragDropConfig>
  private draggableKinds: string[]
  private droppableKinds: string[]
  private callbacks: DragDropCallbacks<TItem, TPosition>
  private state: DragState<TItem, TPosition> = {
    startPosition: null,
    sourceElement: null,
    sourcePosition: null,
    sourceItem: null,
    activePointerId: null,
    isDragging: false,
    lastHoveredElement: null,
  }
  private rafId: number | null = null
  private lastPointerPos: PointerPosition | null = null
  private boundHandlers: {
    pointerDown: (e: PointerEvent) => void
    pointerMove: (e: PointerEvent) => void
    pointerUp: (e: PointerEvent) => void
    pointerCancel: (e: PointerEvent) => void
    keyDown: (e: KeyboardEvent) => void
    mouseOut: (e: MouseEvent) => void
  }

  constructor(
    containerRef: { current: HTMLElement | null } | string | HTMLElement,
    config: DragDropConfig,
    callbacks: DragDropCallbacks<TItem, TPosition>,
  ) {
    // Resolve container element
    if (typeof containerRef === 'string') {
      const element = document.querySelector<HTMLElement>(containerRef)
      if (!element) {
        throw new Error(`DragDropManager: Could not find element with selector "${containerRef}"`)
      }
      this.container = element
    } else if (typeof containerRef === 'object' && 'current' in containerRef) {
      if (!containerRef.current) {
        throw new Error('DragDropManager: Ref.current is null')
      }
      this.container = containerRef.current
    } else {
      this.container = containerRef as HTMLElement
    }

    this.config = {
      dragThreshold: config.dragThreshold ?? 10,
      clickThreshold: config.clickThreshold ?? 10,
      scrollThreshold: config.scrollThreshold ?? 100,
      scrollSpeed: config.scrollSpeed ?? 10,
      cancelOnEscape: config.cancelOnEscape ?? true,
      cancelOnPointerLeave: config.cancelOnPointerLeave ?? true,
      draggableKind: config.draggableKind,
      droppableKind: config.droppableKind,
    }
    this.draggableKinds = this.normalizeKindList(this.config.draggableKind)
    this.droppableKinds = this.normalizeKindList(this.config.droppableKind)

    this.callbacks = callbacks

    // Bind handlers to preserve context
    this.boundHandlers = {
      pointerDown: this.handlePointerDown.bind(this),
      pointerMove: this.handlePointerMove.bind(this),
      pointerUp: this.handlePointerUp.bind(this),
      pointerCancel: this.handlePointerCancel.bind(this),
      keyDown: this.handleKeyDown.bind(this),
      mouseOut: this.handleMouseOut.bind(this),
    }

    this.attachListeners()
  }

  private attachListeners(): void {
    this.container.addEventListener('pointerdown', this.boundHandlers.pointerDown)
    this.container.addEventListener('pointermove', this.boundHandlers.pointerMove)
    this.container.addEventListener('pointerup', this.boundHandlers.pointerUp)
    this.container.addEventListener('pointercancel', this.boundHandlers.pointerCancel)
    window.addEventListener('pointerup', this.boundHandlers.pointerUp)
    window.addEventListener('pointercancel', this.boundHandlers.pointerCancel)
    window.addEventListener('keydown', this.boundHandlers.keyDown)
    window.addEventListener('mouseout', this.boundHandlers.mouseOut)
  }

  private handlePointerDown(e: PointerEvent): void {
    if (this.state.startPosition) return

    const target = e.target as HTMLElement
    const draggableMatch = this.findElementByKinds(target, this.draggableKinds)

    if (!draggableMatch) return

    const { element: draggableElement, kind: sourceKind } = draggableMatch

    const position = this.callbacks.getItemPosition(draggableElement, sourceKind)
    if (!position) return

    // Check if element is empty (convention: data-empty="any-value")
    const isEmpty = draggableElement.dataset.empty !== undefined
    if (isEmpty) return

    // Check canDrag callback
    if (this.callbacks.canDrag && !this.callbacks.canDrag(draggableElement, position)) {
      return
    }

    // Get item data
    const item = this.callbacks.getItemData?.(draggableElement, position) ?? null
    if (!item) return

    // Prevent text selection during potential drag
    e.preventDefault()

    // Store start position and element info
    this.state.startPosition = { x: e.clientX, y: e.clientY }
    this.state.sourceElement = draggableElement
    this.state.sourcePosition = position
    this.state.sourceItem = item
    this.state.activePointerId = this.getPointerId(e)

    // Capture pointer events outside container boundaries when supported.
    if (
      this.state.activePointerId !== null &&
      typeof draggableElement.setPointerCapture === 'function'
    ) {
      try {
        draggableElement.setPointerCapture(this.state.activePointerId)
      } catch {
        // Ignore unsupported/inactive-pointer capture errors.
      }
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isActivePointer(e)) return

    const currentPos: PointerPosition = { x: e.clientX, y: e.clientY }

    // Check if we should start dragging (threshold not yet met)
    if (this.state.startPosition && !this.state.isDragging) {
      const distance = this.getDistance(this.state.startPosition, currentPos)

      if (distance >= this.config.dragThreshold) {
        // Start drag
        this.state.isDragging = true

        if (this.state.sourceElement && this.state.sourcePosition && this.state.sourceItem) {
          // Set data-dragging attribute on source
          this.state.sourceElement.setAttribute('data-dragging', 'true')

          // Notify drag start
          this.callbacks.onDragStart?.(
            this.state.sourceElement,
            this.state.sourcePosition,
            this.state.sourceItem,
          )
        }
      }
      return
    }

    if (!this.state.isDragging) return

    // Store latest position for RAF
    this.lastPointerPos = currentPos

    // Throttle updates to 60fps using RAF
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null
        if (!this.lastPointerPos) return

        const pos = this.lastPointerPos

        // Find hovered droppable element
        const elementUnderCursor = document.elementFromPoint(pos.x, pos.y) as HTMLElement
        const droppableMatch = this.findElementByKinds(elementUnderCursor, this.droppableKinds)
        const droppableElement = droppableMatch?.element ?? null

        // Update hover feedback
        if (droppableElement !== this.state.lastHoveredElement) {
          // Remove hover from previous element
          if (this.state.lastHoveredElement) {
            this.state.lastHoveredElement.removeAttribute('data-hovered')
          }

          // Add hover to current element (including the source element).
          // This enables "drag over itself" states (e.g. combined data-dragging + data-hovered styling).
          if (droppableElement) {
            droppableElement.setAttribute('data-hovered', 'true')
            this.state.lastHoveredElement = droppableElement
          } else {
            this.state.lastHoveredElement = null
          }
        }

        // Auto-scroll
        this.handleAutoScroll(pos)

        // Notify drag move
        this.callbacks.onDragMove?.(pos, this.state.lastHoveredElement)
      })
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isActivePointer(e)) return

    // Handle click/tap if we never started dragging
    if (this.state.startPosition && !this.state.isDragging) {
      const currentPos = { x: e.clientX, y: e.clientY }
      const distance = this.getDistance(this.state.startPosition, currentPos)

      // If distance is very small, treat as click
      if (
        distance < this.config.clickThreshold &&
        this.state.sourceElement &&
        this.state.sourcePosition
      ) {
        this.callbacks.onClick?.(this.state.sourceElement, this.state.sourcePosition)
      }

      this.cleanup()
      return
    }

    if (!this.state.isDragging || !this.state.sourcePosition || !this.state.sourceItem) {
      this.cleanup()
      return
    }

    // Find drop target
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
    const droppableMatch = this.findElementByKinds(target, this.droppableKinds)
    const droppableElement = droppableMatch?.element ?? null

    if (droppableElement && droppableMatch) {
      const targetPosition = this.callbacks.getItemPosition(droppableElement, droppableMatch.kind)

      if (targetPosition) {
        // Notify drop
        this.callbacks.onDrop?.(this.state.sourcePosition, targetPosition, this.state.sourceItem)
      }
    }

    this.cleanup()
  }

  private handlePointerCancel(): void {
    this.cleanup()
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.config.cancelOnEscape) return
    if (e.key !== 'Escape') return
    if (!this.state.startPosition) return
    this.cleanup()
  }

  private handleMouseOut(e: MouseEvent): void {
    if (!this.config.cancelOnPointerLeave) return
    if (!this.state.startPosition) return
    if (e.relatedTarget !== null) return
    this.cleanup()
  }

  private handleAutoScroll(pos: PointerPosition): void {
    const { scrollThreshold, scrollSpeed } = this.config
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let scrollX = 0
    let scrollY = 0

    // Check horizontal scroll
    if (pos.x < scrollThreshold) {
      scrollX = -scrollSpeed
    } else if (pos.x > viewportWidth - scrollThreshold) {
      scrollX = scrollSpeed
    }

    // Check vertical scroll
    if (pos.y < scrollThreshold) {
      scrollY = -scrollSpeed
    } else if (pos.y > viewportHeight - scrollThreshold) {
      scrollY = scrollSpeed
    }

    if (scrollX !== 0 || scrollY !== 0) {
      window.scrollBy(scrollX, scrollY)
    }
  }

  private cleanup(): void {
    // Release pointer capture if we own it.
    if (
      this.state.sourceElement &&
      this.state.activePointerId !== null &&
      typeof this.state.sourceElement.hasPointerCapture === 'function' &&
      typeof this.state.sourceElement.releasePointerCapture === 'function' &&
      this.state.sourceElement.hasPointerCapture(this.state.activePointerId)
    ) {
      try {
        this.state.sourceElement.releasePointerCapture(this.state.activePointerId)
      } catch {
        // Ignore release errors for inactive pointer.
      }
    }

    // Remove data-dragging attribute
    if (this.state.sourceElement) {
      this.state.sourceElement.removeAttribute('data-dragging')
    }

    // Remove hover attribute
    if (this.state.lastHoveredElement) {
      this.state.lastHoveredElement.removeAttribute('data-hovered')
    }

    // Cancel RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    // Notify drag end
    if (this.state.isDragging) {
      this.callbacks.onDragEnd?.()
    }

    // Reset state
    this.state = {
      startPosition: null,
      sourceElement: null,
      sourcePosition: null,
      sourceItem: null,
      activePointerId: null,
      isDragging: false,
      lastHoveredElement: null,
    }
    this.lastPointerPos = null
  }

  private getPointerId(e: PointerEvent): number | null {
    return typeof e.pointerId === 'number' ? e.pointerId : null
  }

  private isActivePointer(e: PointerEvent): boolean {
    if (this.state.activePointerId === null) {
      return true
    }
    const pointerId = this.getPointerId(e)
    return pointerId === null || pointerId === this.state.activePointerId
  }

  private normalizeKindList(kinds: string | string[]): string[] {
    const values = Array.isArray(kinds) ? kinds : [kinds]
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
  }

  /**
   * Find closest ancestor element with a `data-kind` matching any expected kind.
   */
  private findElementByKinds(
    element: HTMLElement | null,
    kinds: string[],
  ): { element: HTMLElement; kind: string } | null {
    let current = element
    while (current && current !== this.container) {
      const elementKind = current.dataset.kind
      if (elementKind && kinds.includes(elementKind)) {
        return { element: current, kind: elementKind }
      }
      current = current.parentElement
    }
    return null
  }

  /**
   * Calculate distance between two points
   */
  private getDistance(p1: PointerPosition, p2: PointerPosition): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  /**
   * Get current drag state (read-only)
   */
  public getState(): Readonly<DragState<TItem, TPosition>> {
    return { ...this.state }
  }

  /**
   * Check if currently dragging
   */
  public isDragging(): boolean {
    return this.state.isDragging
  }

  /**
   * Cleanup and remove event listeners
   */
  public destroy(): void {
    this.cleanup()
    this.container.removeEventListener('pointerdown', this.boundHandlers.pointerDown)
    this.container.removeEventListener('pointermove', this.boundHandlers.pointerMove)
    this.container.removeEventListener('pointerup', this.boundHandlers.pointerUp)
    this.container.removeEventListener('pointercancel', this.boundHandlers.pointerCancel)
    window.removeEventListener('pointerup', this.boundHandlers.pointerUp)
    window.removeEventListener('pointercancel', this.boundHandlers.pointerCancel)
    window.removeEventListener('keydown', this.boundHandlers.keyDown)
    window.removeEventListener('mouseout', this.boundHandlers.mouseOut)
  }
}
