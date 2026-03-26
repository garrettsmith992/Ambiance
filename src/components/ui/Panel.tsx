import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  children: ReactNode
  className?: string
  headerRight?: ReactNode
}

export function Panel({ title, children, className = '', headerRight }: PanelProps) {
  return (
    <div className={`bg-surface-raised border border-border rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium tracking-wide uppercase text-text-secondary">{title}</h2>
        {headerRight}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}
