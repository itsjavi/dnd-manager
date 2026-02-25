import { useCallback, useMemo, useState } from 'react'
import { AutoScrollListDemo } from '~/components/auto-scroll-list-demo'
import { CodeSnippets } from '~/components/code-snippets'
import { ConfigControls } from '~/components/config-controls'
import { EventLog } from '~/components/event-log'
import { GridDemo } from '~/components/grid-demo'
import { ListTransferDemo } from '~/components/list-transfer-demo'
import { StateInspector } from '~/components/state-inspector'
import { DEFAULT_DEMO_CONFIG } from '~/lib/demo-data'
import type { ManagerSnapshot, TelemetryEvent } from '~/lib/demo-types'
import { assetUrl, cn } from '~/lib/utils'

type Scenario = 'grid' | 'list' | 'transfer'

const EMPTY_SNAPSHOT: ManagerSnapshot = {
  active: false,
  isDragging: false,
  state: null,
}

export default function App() {
  const [scenario, setScenario] = useState<Scenario>('grid')
  const [config, setConfig] = useState(DEFAULT_DEMO_CONFIG)
  const [events, setEvents] = useState<TelemetryEvent[]>([])
  const [snapshot, setSnapshot] = useState<ManagerSnapshot>(EMPTY_SNAPSHOT)
  const [instanceId, setInstanceId] = useState(0)
  const [managerControls, setManagerControls] = useState({
    destroy: () => {},
    restart: () => {},
  })

  const logoUrl = assetUrl('/logo.png')

  const addEvent = useCallback((name: string, detail: string) => {
    setEvents((previousEvents) => {
      const nextEvents = [
        {
          id: crypto.randomUUID(),
          name,
          detail,
          createdAt: new Date().toLocaleTimeString(),
        },
        ...previousEvents,
      ]
      return nextEvents.slice(0, 120)
    })
  }, [])

  const scenarioButtons = useMemo(() => {
    return [
      { id: 'grid' as const, label: 'Grid Scenario' },
      { id: 'list' as const, label: 'Auto-Scroll Scenario' },
      { id: 'transfer' as const, label: 'List Transfer Scenario' },
    ]
  }, [])

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-8">
      <header className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/70 px-6 py-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] md:px-10 md:py-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative z-10 space-y-5">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            <img
              src={logoUrl}
              alt="logo"
              aria-hidden="true"
              className="h-10 w-10 invert object-contain md:h-12 md:w-12 [mix-blend-mode:lighten]"
            />
            dnd-manager
          </h1>
          <p className="max-w-4xl text-xl font-medium leading-relaxed text-slate-200 md:text-2xl">
            modern, lightweight, data-driven Drag-and-Drop library
          </p>
          <p className="max-w-4xl text-base leading-relaxed text-slate-300">
            Build performant drag-and-drop interactions for vanilla JavaScript or any framework.
            This interactive demo covers callbacks, configurable thresholds, state inspection, and
            drag preview rendering for production-grade UI flows.
          </p>
          <p className="max-w-4xl text-sm leading-relaxed text-slate-400 md:text-base">
            Great for sortable grids, auto-scrolling lists, and custom drag workflows where you want
            full data-level control without heavy abstractions.
          </p>
        </div>
        <div className="relative z-10 mt-6">
          <pre className="inline-block max-w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <code>pnpm add dnd-manager</code>
          </pre>
        </div>
        <div className="relative z-10 mt-4 flex flex-wrap gap-3 text-sm">
          <a
            className="rounded-lg border border-indigo-400/60 bg-indigo-500/15 px-3 py-2 text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/25 hover:text-white"
            href="https://github.com/itsjavi/dnd-manager"
            target="_blank"
            rel="noreferrer"
          >
            GitHub Repository
          </a>
          <a
            className="rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-slate-100 transition hover:border-slate-400 hover:text-white"
            href="https://github.com/itsjavi/dnd-manager/tree/main/demo/src"
            target="_blank"
            rel="noreferrer"
          >
            Examples
          </a>
          <a
            className="rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-slate-100 transition hover:border-slate-400 hover:text-white"
            href="https://www.npmjs.com/package/dnd-manager"
            target="_blank"
            rel="noreferrer"
          >
            npm
          </a>
          <a
            className="rounded-lg border border-transparent bg-transparent px-3 py-2 text-slate-100 underline decoration-dotted underline-offset-4 transition hover:border-slate-400 hover:text-white"
            href="https://context7.com/itsjavi/dnd-manager/llms.txt?tokens=10000"
            target="_blank"
            rel="noreferrer"
          >
            llms.txt
          </a>
        </div>
      </header>

      <section id="playground" className="grid gap-4 xl:grid-cols-[1fr_2fr_1fr]">
        <div className="order-2 space-y-4 xl:order-1">
          <ConfigControls config={config} onChange={setConfig} />
          <StateInspector
            snapshot={snapshot}
            instanceId={instanceId}
            onDestroy={managerControls.destroy}
            onRestart={managerControls.restart}
          />
        </div>
        <div className="order-1 space-y-3 xl:order-2">
          <div className="panel-card">
            <div className="flex flex-wrap gap-2">
              {scenarioButtons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => {
                    setScenario(button.id)
                    setSnapshot(EMPTY_SNAPSHOT)
                  }}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition',
                    scenario === button.id
                      ? 'border-indigo-400/70 bg-indigo-400/20 text-indigo-100'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500',
                  )}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
          {scenario === 'grid' ? (
            <GridDemo
              config={config}
              onEvent={addEvent}
              onManagerSnapshot={setSnapshot}
              onInstanceIdChange={setInstanceId}
              onControlsReady={setManagerControls}
            />
          ) : scenario === 'list' ? (
            <AutoScrollListDemo
              config={config}
              onEvent={addEvent}
              onManagerSnapshot={setSnapshot}
              onInstanceIdChange={setInstanceId}
              onControlsReady={setManagerControls}
            />
          ) : (
            <ListTransferDemo
              config={config}
              onEvent={addEvent}
              onManagerSnapshot={setSnapshot}
              onInstanceIdChange={setInstanceId}
              onControlsReady={setManagerControls}
            />
          )}
        </div>
        <div className="order-3 xl:order-3">
          <EventLog events={events} onClear={() => setEvents([])} />
        </div>
      </section>

      <CodeSnippets />

      <footer className="border-t border-slate-800/80 pt-6 text-center text-sm text-slate-500">
        Created by Javi Aguilar (
        <a
          href="https://itsjavi.com"
          target="_blank"
          rel="noreferrer"
          className="text-slate-400 hover:text-slate-200"
        >
          itsjavi.com
        </a>
        )
      </footer>
    </main>
  )
}
