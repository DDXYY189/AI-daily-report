import { Component, useEffect, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import GhostFibers from './GhostFibers'
import { FluidBackdrop } from './FluidBackdrop'

/**
 * 纤维场配色：从本站的冷色基调派生，而不是用 React Bits 的默认紫罗兰。
 *
 * 上游默认是 lineColor #140E35 / glowColor #3437A0（深紫 + 靛蓝）。
 * 本站锁定单一冷青强调色（#5bc8e8），紫色背景会和整个 UI 打架，
 * 也会踩到设计规范里明确要避开的「AI 紫」。
 *
 * 换色时保持了**各色相对地色的亮度比例**，而不是照搬上游的绝对值 ——
 * 上游地色是 #120F17（L* 约 4.4），本站页面底是 #171a21（L* 9.25），
 * 直接照搬绝对值会让纤维比地色还暗，整个效果看不见。
 * 想调回上游默认紫色，把这两个值换成 #140E35 / #3437A0 即可。
 */
const FIBER_LINE_COLOR = '#0d2b37'
const FIBER_GLOW_COLOR = '#1a7791'

/** 地色跟随本站 --color-void，让 Hero 与页面底色连成一片，而不是一块更暗的框 */
const FIBER_BACKDROP = '#171a21'

type ScenePhase = 'loading' | 'ready' | 'error'

/**
 * 场景错误边界。
 *
 * 为什么必须有：ogl 在拿不到 WebGL2 上下文、或 shader 编译/链接失败时会直接抛错，
 * 而且抛在 useEffect 里。没有错误边界的话 React 会卸载整棵树 —— 也就是**整页白屏**。
 * 这里把它降级成「背景用 CSS 兜底层」，正文完全不受影响。
 */
interface SceneBoundaryProps {
  onFail: () => void
  children: ReactNode
}
interface SceneBoundaryState {
  failed: boolean
}

class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(
      '[HeroBackdrop] WebGL 背景初始化失败，已回退到 CSS 兜底层：',
      error,
      info.componentStack,
    )
    this.props.onFail()
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Hero 背景总装。
 *
 * 图层顺序（自下而上），顺序不能调换：
 *   1. GhostFibers WebGL 纤维场  —— 背景主视觉
 *   2. CSS 兜底层（FluidBackdrop）—— 仅在场景就绪前 / 失败后存在
 *   3. 暗色遮罩                    —— 始终在最上层，保证前景文字对比度
 *
 * 与上一版（Unicorn Studio）的关键差异 —— 上游组件没有 onLoad / onError 回调，
 * 所以「就绪」和「失败」两条路径都得自己接：
 *
 * - **就绪**：React 的 effect 是自下而上执行的，子组件的 effect 先于父组件跑完，
 *   而 GhostFibers 在它自己的 effect 里就同步 append 了 canvas。
 *   所以父组件挂载后查一次 `container.querySelector('canvas')` 就能确定它已经起来了，
 *   不需要 MutationObserver 或定时轮询。
 * - **失败**：交给上面的错误边界。
 *
 * 另外，GhostFibers 自己就处理了这些事，本站**不需要**再包一层：
 * prefers-reduced-motion（命中时只渲染一帧静态画面）、离屏暂停、标签页隐藏暂停、
 * 容器尺寸跟随、卸载时释放 WebGL 上下文。
 */
export function HeroBackdrop() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<ScenePhase>('loading')
  const [fallbackMounted, setFallbackMounted] = useState(true)

  // 子组件 effect 先于本 effect 执行，因此这里 canvas 已经挂上了
  useEffect(() => {
    const canvas = containerRef.current?.querySelector('canvas')
    if (canvas) setPhase('ready')
    // 查不到就保持 loading，兜底层继续显示 —— 宁可多显示兜底，也不要露出空白
  }, [])

  // 场景就绪后先让兜底层淡出（700ms 过渡），过渡结束再卸载
  useEffect(() => {
    if (phase !== 'ready') return
    const timer = window.setTimeout(() => setFallbackMounted(false), 900)
    return () => window.clearTimeout(timer)
  }, [phase])

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* 1. WebGL 纤维场 */}
      <div ref={containerRef} className="absolute inset-0">
        <SceneBoundary onFail={() => setPhase('error')}>
          <GhostFibers
            lineColor={FIBER_LINE_COLOR}
            glowColor={FIBER_GLOW_COLOR}
            backdrop={FIBER_BACKDROP}
            /* 其余参数沿用 React Bits 官方示例，只把 dpr 保持在 1：
               上游 dpr 默认就是 1，在 2K/4K 屏上等于少渲染两三倍像素量，
               而这个场景本身是柔和的光带与噪点，肉眼几乎无差。 */
            speed={0.2}
            scale={2}
            rotation={0}
            rotationSpeed={0.25}
            layers={4}
            waveAmplitude={0.015}
            waveFrequency={3}
            waveSpeed={0.15}
            layerSpeed={0.08}
            twist={0.1}
            twistFrequency={5}
            twistSpeed={1.2}
            lineFrequency={5}
            lineSpacing={2}
            lineSharpness={16}
            glowFalloff={10}
            glowIntensity={1.6}
            brightness={2}
            blueBoost={1.25}
            vignette={0.8}
            grain={0.05}
            dpr={1}
          />
        </SceneBoundary>
      </div>

      {/* 2. CSS 兜底层 */}
      {fallbackMounted && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            phase === 'ready' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <FluidBackdrop />
        </div>
      )}

      {/* 3. 暗色遮罩：左重右轻（文字在两侧，中间留出场景）。
             颜色取自 --scrim-rgb，与 --color-void 同源 —— 底色改了这里会自动跟上，
             不会留下「Hero 还是黑的、下面已经亮了」的脱节。 */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgb(var(--scrim-rgb)/0.82)_0%,rgb(var(--scrim-rgb)/0.5)_36%,rgb(var(--scrim-rgb)/0.18)_60%,rgb(var(--scrim-rgb)/0.6)_100%)]" />

      {/* 四周向页面底色收拢，让 Hero 与下方分区自然衔接 */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,transparent_30%,rgb(var(--scrim-rgb)/0.42)_68%,var(--color-void)_100%)]" />

      {/* 顶部单独压一道，保证未滚动状态下透明导航栏的文字可读 */}
      <div className="absolute inset-x-0 top-0 h-[120px] bg-[linear-gradient(to_bottom,rgb(var(--scrim-rgb)/0.72),transparent)]" />
    </div>
  )
}
