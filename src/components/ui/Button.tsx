import type { ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'quiet'
type Size = 'md' | 'lg'

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium ' +
  'rounded-control transition-[background-color,border-color,color,transform] duration-200 ease-out ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55'

/* 对比度已核算：#5bc8e8 底 + #171a21 字 = 9.0:1，满足 WCAG AA */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-void hover:bg-[#74d2ec]',
  ghost: 'border border-line-2 text-fg hover:border-line-3 hover:bg-surface-2',
  quiet: 'text-fg-muted hover:text-fg',
}

const SIZES: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[0.9375rem]',
}

export interface ButtonProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  className?: string
  /** 传入即渲染为 <a>，http(s) 链接自动加 noopener */
  href?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
  iconLeft?: ReactNode
  iconRight?: ReactNode
  'aria-label'?: string
}

/**
 * CTA 按钮。全站同一 intent 只用同一个 label（订阅类统一为「订阅今日日报」），
 * 且一律 whitespace-nowrap，保证桌面端不会折成两行。
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  href,
  type = 'button',
  disabled = false,
  onClick,
  iconLeft,
  iconRight,
  'aria-label': ariaLabel,
}: ButtonProps) {
  const cls = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  const inner = (
    <>
      {iconLeft}
      {children}
      {iconRight}
    </>
  )

  if (href) {
    const external = href.startsWith('http')
    return (
      <a
        href={href}
        className={cls}
        aria-label={ariaLabel}
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {inner}
      </a>
    )
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cls}
    >
      {inner}
    </button>
  )
}
