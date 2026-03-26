interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  className?: string
}

export function Slider({ value, onChange, min = 0, max = 1, step = 0.01, label, className = '' }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label && <span className="text-sm text-text-secondary w-16 shrink-0">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border accent-accent"
        style={{
          background: `linear-gradient(to right, var(--color-accent) ${percent}%, var(--color-border) ${percent}%)`,
        }}
      />
      <span className="text-xs text-text-secondary w-10 text-right tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}
