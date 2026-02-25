import type { TelemetryEvent } from '~/lib/demo-types'

type EventLogProps = {
  events: TelemetryEvent[]
  onClear: () => void
}

export function EventLog({ events, onClear }: EventLogProps) {
  return (
    <section className="panel-card min-h-80 space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Callback Events</h3>
          <p className="mt-1 text-xs text-slate-400">
            Live stream of dnd-manager callback activity.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 transition hover:border-slate-400 hover:text-white"
        >
          Clear
        </button>
      </header>
      <ul className="max-h-72 space-y-2 overflow-auto rounded-lg border border-slate-800/80 bg-slate-950/50 p-2">
        {events.length === 0 ? (
          <li className="rounded-md px-2 py-2 text-xs text-slate-500">
            No events yet. Start dragging or clicking items.
          </li>
        ) : null}
        {events.map((event) => (
          <li
            key={event.id}
            className="rounded-md border border-slate-800 bg-slate-900/70 px-2 py-2"
          >
            <p className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{event.createdAt}</span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-indigo-300">
                {event.name}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-200">{event.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
