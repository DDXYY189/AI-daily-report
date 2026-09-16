import type { ReactNode } from 'react'

/**
 * 版心容器：严格 1700px，符合 PC 端优先的布局规范。
 * 在超宽屏上不再放大，靠两侧留白维持克制的观感。
 */
export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[1700px] px-6 lg:px-12 ${className}`}>
      {children}
    </div>
  )
}
