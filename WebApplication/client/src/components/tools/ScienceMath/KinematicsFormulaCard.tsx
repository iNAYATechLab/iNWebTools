interface KinematicsFormulaCardProps {
  topic?: 'kinematics' | 'ohms' | 'energy' | 'force';
}

export function KinematicsFormulaCard({ topic = 'kinematics' }: KinematicsFormulaCardProps) {
  const configs = {
    kinematics: {
      title: 'Classical Kinematics Equations',
      badge: 'Mechanics',
      formulas: [
        { name: 'Velocity-Time Relation', eq: 'v = u + a · t' },
        { name: 'Displacement-Time Relation', eq: 's = u · t + ½ a · t²' },
        { name: 'Velocity-Displacement Relation', eq: 'v² = u² + 2 · a · s' },
        { name: 'Average Velocity', eq: 's = ½ (u + v) · t' },
      ],
      variables: [
        { sym: 'u', label: 'Initial Velocity (m/s)' },
        { sym: 'v', label: 'Final Velocity (m/s)' },
        { sym: 'a', label: 'Acceleration (m/s²)' },
        { sym: 't', label: 'Time Duration (s)' },
        { sym: 's', label: 'Displacement (m)' },
      ],
    },
    ohms: {
      title: "Ohm's Law & Electrical Power Circle",
      badge: 'Electromagnetism',
      formulas: [
        { name: 'Voltage Law', eq: 'V = I · R' },
        { name: 'Electric Power', eq: 'P = V · I' },
        { name: 'Joule Power Law', eq: 'P = I² · R' },
        { name: 'Voltage Power Law', eq: 'P = V² / R' },
      ],
      variables: [
        { sym: 'V', label: 'Voltage (Volts - V)' },
        { sym: 'I', label: 'Current (Amperes - A)' },
        { sym: 'R', label: 'Resistance (Ohms - Ω)' },
        { sym: 'P', label: 'Power (Watts - W)' },
      ],
    },
    energy: {
      title: 'Mechanical Work & Conservation of Energy',
      badge: 'Thermodynamics & Energy',
      formulas: [
        { name: 'Kinetic Energy', eq: 'Eₖ = ½ · m · v²' },
        { name: 'Gravitational Potential Energy', eq: 'Eₚ = m · g · h' },
        { name: 'Mechanical Work', eq: 'W = F · d · cos(θ)' },
      ],
      variables: [
        { sym: 'm', label: 'Mass (kg)' },
        { sym: 'v', label: 'Velocity (m/s)' },
        { sym: 'g', label: 'Gravity constant (9.80665 m/s²)' },
        { sym: 'h', label: 'Height (m)' },
      ],
    },
    force: {
      title: "Newton's Laws of Motion & Momentum",
      badge: 'Classical Dynamics',
      formulas: [
        { name: "Newton's Second Law", eq: 'F = m · a' },
        { name: 'Linear Momentum', eq: 'p = m · v' },
        { name: 'Impulse', eq: 'J = F · Δt = Δp' },
      ],
      variables: [
        { sym: 'F', label: 'Force (Newtons - N)' },
        { sym: 'm', label: 'Mass (kg)' },
        { sym: 'a', label: 'Acceleration (m/s²)' },
        { sym: 'p', label: 'Momentum (kg·m/s)' },
      ],
    },
  };

  const active = configs[topic] || configs.kinematics;

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {active.title}
        </h3>
        <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30">
          {active.badge}
        </span>
      </div>

      {/* Formulas List */}
      <div className="grid gap-3 sm:grid-cols-2">
        {active.formulas.map((f, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-950/80 p-4 shadow-sm"
          >
            <span className="text-[11px] font-medium text-slate-400">{f.name}</span>
            <span className="mt-2 font-mono text-base font-black text-brand-300">{f.eq}</span>
          </div>
        ))}
      </div>

      {/* Variables Legend */}
      <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Variable Glossary & SI Units
        </h4>
        <div className="grid gap-2 sm:grid-cols-2 text-xs">
          {active.variables.map((v, i) => (
            <div key={i} className="flex items-center gap-2 font-mono">
              <strong className="text-purple-400">{v.sym}:</strong>
              <span className="text-slate-300 font-sans">{v.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
