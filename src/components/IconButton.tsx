import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export function IconButton({ children, className = '', label, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${className}`.trim()}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
