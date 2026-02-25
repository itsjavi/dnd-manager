import type { DemoConfig } from '~/lib/demo-types'

type ConfigControlsProps = {
  config: DemoConfig
  onChange: (nextConfig: DemoConfig) => void
}

type ConfigField = {
  id: keyof DemoConfig
  label: string
  min: number
  max: number
}

const CONFIG_FIELDS: ConfigField[] = [
  { id: 'dragThreshold', label: 'Drag Threshold', min: 0, max: 40 },
  { id: 'clickThreshold', label: 'Click Threshold', min: 0, max: 40 },
  { id: 'scrollThreshold', label: 'Scroll Threshold', min: 20, max: 260 },
  { id: 'scrollSpeed', label: 'Scroll Speed', min: 2, max: 40 },
]

export function ConfigControls({ config, onChange }: ConfigControlsProps) {
  return (
    <section className="panel-card space-y-4">
      <header>
        <h3 className="text-base font-semibold text-slate-100">Config</h3>
        <p className="mt-1 text-xs text-slate-400">
          Tune core drag and auto-scroll behavior in real time.
        </p>
      </header>
      <div className="space-y-3">
        {CONFIG_FIELDS.map((field) => {
          const value = config[field.id]
          return (
            <label key={field.id} className="block space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{field.label}</span>
                <span className="font-mono text-slate-100">{value}px</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  value={value}
                  className="w-full accent-indigo-400"
                  onChange={(event) => {
                    const nextValue = Number(event.currentTarget.value)
                    onChange({ ...config, [field.id]: nextValue })
                  }}
                />
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={value}
                  className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                  onChange={(event) => {
                    const rawValue = Number(event.currentTarget.value)
                    const clampedValue = Math.min(field.max, Math.max(field.min, rawValue))
                    onChange({ ...config, [field.id]: clampedValue })
                  }}
                />
              </div>
            </label>
          )
        })}
      </div>
    </section>
  )
}
