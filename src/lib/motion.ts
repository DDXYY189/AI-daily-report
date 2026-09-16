import type { Transition, Variants } from 'motion/react'

/**
 * 全站统一的缓动与时长。
 * 动效动机（每条都能一句话说清，没有为了动而动的动画）：
 * - 滚动入场 Reveal：建立阅读层级与叙事顺序
 * - 卡片 hover       ：即时反馈，说明元素可交互
 * - 导航玻璃化       ：状态反馈，滚动后与内容分离
 * - 表单四态         ：状态转换（idle / loading / error / success）
 */

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1]

export const DURATION = {
  fast: 0.24,
  base: 0.5,
  slow: 0.72,
} as const

export const transition = (delay = 0, duration = DURATION.slow): Transition => ({
  duration,
  delay,
  ease: EASE_OUT,
})

/** 单个元素上浮入场 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
}

/** 容器级错峰，子项用 fadeUp */
export const staggerContainer = (stagger = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
})

/** 卡片 hover 的轻微抬升，配合 border 提亮使用 */
export const hoverLift = {
  rest: { y: 0 },
  hover: { y: -4 },
} as const
