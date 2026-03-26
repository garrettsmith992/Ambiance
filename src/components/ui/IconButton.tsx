import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  active?: boolean
}

export function IconButton({ children, active, className = '', ...props }: IconButtonProps) {
  return (
    <button
      className={`p-2 rounded-md transition-colors
        ${active
          ? 'bg-accent/20 text-accent-hover'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
        } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
