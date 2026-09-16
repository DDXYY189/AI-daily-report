import type { ReactNode } from 'react'

/**
 * 滚动入场包装。所有位移动画都集中在这里，便于统一受
 * prefers-reduced-motion 控制（此时直接渲染静态内容）。
 */
import { motion, useReducedMotion } from 'motion/react'
import { EASE_OUT, DURATION } from '../../lib/motion'

export function Reveal({
  children,
  delay = 0,
  duration = DURATION.slow,
  y = 18,
  className = '',
}: {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}
