import type { ManagerSnapshot } from '~/lib/demo-types'

type StateInspectorProps = {
  snapshot: ManagerSnapshot
  instanceId: number
  onDestroy: () => void
  onRestart: () => void
}

export function StateInspector({
  snapshot,
  instanceId,
  onDestroy,
  onRestart,
}: StateInspectorProps) {
  return (
    <section className="panel-card space-y-3">
      <header>
        <h3 className="text-base font-semibold text-slate-100">State Inspector</h3>
        <p className="mt-1 text-xs text-slate-400">
          Observe `isDragging()` and `getState()` output from the active manager.
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-2">
          <dt className="text-slate-400">Manager Active</dt>
          <dd className="mt-1 font-mono text-slate-100">{snapshot.active ? 'true' : 'false'}</dd>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/80 p-2">
          <dt className="text-slate-400">isDragging()</dt>
          <dd className="mt-1 font-mono text-slate-100">
            {snapshot.isDragging ? 'true' : 'false'}
          </dd>
        </div>
        <div className="col-span-2 rounded-md border border-slate-800 bg-slate-900/80 p-2">
          <dt className="text-slate-400">Instance ID</dt>
          <dd className="mt-1 font-mono text-slate-100">{instanceId}</dd>
        </div>
      </dl>
      <pre className="h-56 overflow-auto rounded-lg border border-slate-800/80 bg-slate-950/80 p-3 text-[11px] text-slate-300">
        {JSON.stringify(snapshot.state, null, 2)}
      </pre>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-md border border-indigo-500/70 bg-indigo-500/15 px-2 py-1 text-xs text-indigo-100 transition hover:bg-indigo-500/30"
        >
          Restart Manager
        </button>
        <button
          type="button"
          onClick={onDestroy}
          className="rounded-md border border-rose-500/70 bg-rose-500/15 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/30"
        >
          Destroy Manager
        </button>
      </div>
    </section>
  )
}
