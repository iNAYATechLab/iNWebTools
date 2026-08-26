interface BmiVisualGaugeProps {
  bmi: number;
  category?: string;
  healthyWeightRange?: string;
  bmiPrime?: number;
}

export function BmiVisualGauge({
  bmi,
  category = 'Normal',
  healthyWeightRange,
  bmiPrime,
}: BmiVisualGaugeProps) {
  // Normalize BMI between 12 and 45 for percentage placement
  const clampedBmi = Math.max(12, Math.min(45, bmi));
  const percent = ((clampedBmi - 12) / (45 - 12)) * 100;

  const getColor = (val: number) => {
    if (val < 18.5) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (val < 25) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (val < 30) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          WHO Body Mass Index (BMI) Classification
        </h3>
        <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${getColor(bmi)}`}>
          {category}
        </span>
      </div>

      {/* Main Metric Callout */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
        <div className="space-y-1">
          <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
            {bmi}
          </span>
          <span className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            kg / m² Score
          </span>
        </div>

        {bmiPrime && (
          <div className="space-y-1">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-brand-400">
              {bmiPrime}
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              BMI Prime (Ratio to 25.0)
            </span>
          </div>
        )}
      </div>

      {/* Multi-Zone Gauge Meter */}
      <div className="space-y-2">
        <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-800 p-0.5 shadow-inner">
          {/* Gradient zones: Underweight -> Normal -> Overweight -> Obese */}
          <div className="absolute inset-0 flex">
            <div className="w-[19.7%] bg-blue-500/80" title="Underweight (< 18.5)" />
            <div className="w-[19.4%] bg-emerald-500/90" title="Normal (18.5 - 24.9)" />
            <div className="w-[15.1%] bg-amber-500/90" title="Overweight (25.0 - 29.9)" />
            <div className="w-[45.8%] bg-rose-500/90" title="Obese (≥ 30.0)" />
          </div>

          {/* Needle / Indicator Marker */}
          <div
            className="absolute top-0 bottom-0 w-2.5 -ml-1 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] ring-2 ring-slate-950 transition-all duration-300"
            style={{ left: `${percent}%` }}
          />
        </div>

        {/* Labels below Gauge */}
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>&lt; 18.5 (Under)</span>
          <span className="text-emerald-400 font-semibold">18.5 – 24.9 (Normal)</span>
          <span className="text-amber-400">25 – 29.9 (Over)</span>
          <span className="text-rose-400">≥ 30 (Obese)</span>
        </div>
      </div>

      {/* Healthy Weight Recommendation */}
      {healthyWeightRange && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
          <span className="text-slate-300">Healthy Weight Range for your height:</span>
          <strong className="font-mono text-emerald-300">{healthyWeightRange}</strong>
        </div>
      )}
    </div>
  );
}
