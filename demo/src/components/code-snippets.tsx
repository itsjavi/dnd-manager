const QUICK_START_SNIPPET = `// pnpm add dnd-manager

import {
  DragDropManager,
  DragPreviewController,
  type DragDropCallbacks,
  type PointerPosition,
} from 'dnd-manager'

const container = document.querySelector<HTMLElement>('#grid')
if (!container) throw new Error('Missing #grid container')

const preview = new DragPreviewController({
  className: 'drop-shadow-xl',
  zIndex: 9999,
})

const callbacks: DragDropCallbacks<Item, Position> = {
  getItemPosition: (element) => ({
    row: Number(element.dataset.row),
    col: Number(element.dataset.col),
  }),
  getItemData: (_element, pos) => data[pos.row][pos.col] ?? null,
  canDrag: () => true,
  onDragStart: (element) => preview.startFromElement(element),
  onDragMove: (pos: PointerPosition) => preview.moveToPointer(pos),
  onDrop: (sourcePos, targetPos, sourceItem) => {
    if (sourcePos.row === targetPos.row && sourcePos.col === targetPos.col) return
    // handle reorder or swap
  },
  onDragEnd: () => preview.stop(),
  onClick: (element, pos) => {
    // handle click/tap
  },
}

const manager = new DragDropManager<Item, Position>(container, {
  // Supports string OR string[] for multi-kind matching.
  // Each element should still expose a single data-kind value.
  draggableKind: ['cell'],
  droppableKind: ['cell'],
  dragThreshold: 10,
  clickThreshold: 10,
  scrollThreshold: 100,
  scrollSpeed: 10,
  cancelOnEscape: true,
  cancelOnPointerLeave: true,
}, callbacks)

window.addEventListener('beforeunload', () => {
  preview.destroy()
  manager.destroy()
})`

type SnippetProps = {
  title: string
  code: string
}

function Snippet({ title, code }: SnippetProps) {
  return (
    <article className="panel-card space-y-2">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-300">
        <code>{code}</code>
      </pre>
    </article>
  )
}

export function CodeSnippets() {
  return (
    <section id="api-snippets" className="grid gap-4">
      <Snippet title="Quick Start (Vanilla) + Full Callback Surface" code={QUICK_START_SNIPPET} />
    </section>
  )
}
