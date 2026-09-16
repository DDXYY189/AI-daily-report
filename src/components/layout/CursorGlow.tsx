import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import GlowCursor from '../ui/GlowCursor'

/**
 * 指针光轨的开关与配色。
 *
 * 为什么需要这一层：
 *
 * 1. **GlowCursor 上游没有处理 prefers-reduced-motion，也不区分触屏。**
 *    而它的 fragment shader 里 `discard` 写在 63 次循环**之后** —— 也就是说
 *    即使光轨已经淡出到不可见，每帧仍然要跑满整个开销。所以在触屏或降低动效偏好下
 *    不能只是「传 enabled=false」，必须干脆不挂载这个 canvas。
 *
 * 2. 用 `useSyncExternalStore` 而不是 `useState + useEffect` 读媒体查询：
 *    后者在首帧拿到的是 false，要等 effect 跑完才变 true，会导致包裹层出现又消失、
 *    把整棵子树重新挂载一次（Hero 的 WebGL 上下文与 ScrollTrigger 都会被重建）。
 *    `useSyncExternalStore` 在客户端首帧就能同步拿到正确值，没有这个问题。
 *    `getServerSnapshot` 返回 false，所以 SSR 时直接渲染 children，不会碰 window。
 *
 * 3. 配色改成站内令牌：上游默认 `#67E8F9` / `#A78BFA`（青 + 紫罗兰），
 *    紫色要换掉。这里用强调色 → 强调色暗档的过渡，头部亮、尾部沉。
 *
 * 关于包裹范围（重要）：
 * 这个 shader 对每个像素固定循环 MAX_POINTS-1 = 63 次，且 `discard`
 * 写在循环**之后** —— 也就是说光轨淡出到不可见时，每帧仍然要跑满开销。
 * 所以开销只由 **canvas 面积 × dpr²** 决定，包裹范围就是最大的那一档变量。
 * 因此这里只包 Hero 的内容区（约一个视口），而不是整页：
 * 首屏约 207 万碎片，整页约 1060 万，差 5 倍。
 * 想让它覆盖整页，把包裹层挪到 <main> 上即可，但要清楚代价。
 */

const CURSOR_QUERY =
  '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

function subscribe(onStoreChange: () => void) {
  const query = window.matchMedia(CURSOR_QUERY)
  query.addEventListener('change', onStoreChange)
  return () => query.removeEventListener('change', onStoreChange)
}

const getSnapshot = () => window.matchMedia(CURSOR_QUERY).matches

/** 服务端一律关闭：SSR 阶段没有指针，也不该碰 window */
const getServerSnapshot = () => false

export function CursorGlow({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // 不满足条件时**完全不挂载** GlowCursor：不创建 canvas、不建 WebGL 上下文、不进 rAF 循环
  if (!enabled) return <>{children}</>

  return (
    <GlowCursor
      color="#5bc8e8"
      secondaryColor="#2e7d93"
      /* 上游默认 1.5。这个 shader 的循环次数是常量（63 次/像素），
         开销只由 canvas 面积 × dpr² 决定，所以 dpr 是最直接的一档。
         包住整页 <main> 已经是最省的范围选择，这里再压到 1。 */
      maxDevicePixelRatio={1}
    >
      {children}
    </GlowCursor>
  )
}
