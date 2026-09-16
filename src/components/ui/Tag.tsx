import type { ReactNode } from 'react'

type Tone = 'default' | 'accent' | 'mono'

const TONES: Record<Tone, string> = {
  default: 'border-line-2 text-fg-muted',
  accent: 'border-accent-dim bg-accent-wash text-accent',
  mono: 'border-line-2 font-mono text-fg-muted',
}

/**
 * 标签 / 徽标。圆角固定为 control 档（SHAPE LOCK），
 * 与卡片 panel 档区分，规则全站一致。
 */
export function Tag({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-xs leading-none ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
