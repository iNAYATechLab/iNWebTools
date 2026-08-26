import type { ToolOption } from '../../../types/tools';

interface ToolControlsProps {
  options: ToolOption[];
  values: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
}

export function ToolControls({ options, values, onChange }: ToolControlsProps) {
  if (!options || options.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-slate-400">
        No additional parameters required. Ready for standard high-speed processing.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Processing Settings
      </h3>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
        {options.map((option) => {
          const currentValue = values[option.id] !== undefined ? values[option.id] : option.default;

          if (option.type === 'slider') {
            const min = option.min ?? 0;
            const max = option.max ?? 100;
            const step = option.step ?? 1;
            const numVal =
              typeof currentValue === 'number' ? currentValue : Number(currentValue) || min;

            return (
              <div key={option.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={option.id} className="font-medium text-slate-300">
                    {option.label}
                  </label>
                  <span className="font-mono text-brand-400 font-semibold">
                    {numVal} {option.unit ?? ''}
                  </span>
                </div>
                <input
                  id={option.id}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={numVal}
                  onChange={(e) => onChange(option.id, Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{min}</span>
                  <span>{max}</span>
                </div>
              </div>
            );
          }

          if (option.type === 'select') {
            return (
              <div key={option.id} className="space-y-1.5">
                <label htmlFor={option.id} className="block text-xs font-medium text-slate-300">
                  {option.label}
                </label>
                <select
                  id={option.id}
                  value={String(currentValue ?? '')}
                  onChange={(e) => onChange(option.id, e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  {(option.options ?? []).map((opt) => (
                    <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (option.type === 'toggle') {
            const isChecked = Boolean(currentValue);
            return (
              <div key={option.id} className="flex items-center justify-between py-1">
                <label
                  htmlFor={option.id}
                  className="text-xs font-medium text-slate-300 cursor-pointer"
                >
                  {option.label}
                </label>
                <button
                  id={option.id}
                  type="button"
                  role="switch"
                  aria-checked={isChecked}
                  onClick={() => onChange(option.id, !isChecked)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    isChecked ? 'bg-brand-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isChecked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          }

          if (option.type === 'password' || option.type === 'text') {
            return (
              <div key={option.id} className="space-y-1.5">
                <label htmlFor={option.id} className="block text-xs font-medium text-slate-300">
                  {option.label}
                </label>
                <input
                  id={option.id}
                  type={option.type}
                  value={String(currentValue ?? '')}
                  onChange={(e) => onChange(option.id, e.target.value)}
                  placeholder={option.label}
                  className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
