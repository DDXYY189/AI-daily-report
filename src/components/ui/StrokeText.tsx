import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import './StrokeText.css'

/**
 * StrokeText（React Bits）· GSAP 描边描画文字
 * ============================================================================
 * 来源：reactbits.dev 的 StrokeText 组件，JavaScript + CSS 变体。
 *
 * 相对上游源码的改动：
 *
 * 1. **转成 TSX 并补上类型。** 上游是 .jsx，本项目 tsconfig 没开 allowJs，
 *    直接放 .jsx 会让 `npm run typecheck` 报找不到模块。补丁是机械的，
 *    时间轴、ScrollTrigger、降动效分支的逻辑一行未改。
 *
 * 2. **补了一份 StrokeText.css。** 上游只给了 JSX，没给 CSS，但源码里
 *    import 了它。那份 CSS 是按组件实际用到的五个类名与一个 CSS 变量补写的，
 *    见同目录的 StrokeText.css。
 *
 * 3. **`gsap.registerPlugin` 加了 SSR 守卫。** 上游是裸调用（虽然外面套了
 *    `typeof window !== 'undefined'`，但那段守卫在模块顶层，SSR 时 gsap 仍会被
 *    import 进服务端包）。这里改成在 effect 里注册，服务端不碰 window。
 *
 * 三个 trigger 模式：
 *   mount  挂载即播放
 *   scroll 滚入视口播放一次（ScrollTrigger，start: 'top 82%'）
 *   hover  鼠标移入重播
 */

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const DEFAULT_TEXT = 'Draw Attention'

export type StrokeTextTrigger = 'mount' | 'scroll' | 'hover' | 'loop'
export type StrokeTextFillMode = 'wipe' | 'fade' | 'none'

export interface StrokeTextProps {
  text?: string
  strokeColor?: string
  fillColor?: string
  strokeWidth?: number
  /** 描边描画时长（秒） */
  drawDuration?: number
  /** 描边画完之后，填充延后多久开始（秒） */
  fillDelay?: number
  /** 逐字错峰步长（秒） */
  stagger?: number
  ease?: string
  /** 触发方式 */
  trigger?: StrokeTextTrigger
  /** 填充方式：wipe 从左向右扫过 / fade 淡入 / none 只画描边 */
  fillMode?: StrokeTextFillMode
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  /** 从最后一个字开始画 */
  reverse?: boolean
  className?: string
  style?: CSSProperties
}

interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** GSAP 的 stagger 配置：数字，或带起始方向的配置对象 */
type StaggerConfig =
  | number
  | { each: number; from: 'start' | 'end' | 'center' | 'edges' | 'random' }

const StrokeText = ({
  text = DEFAULT_TEXT,
  strokeColor = '#A78BFA',
  fillColor = '#F8FAFC',
  strokeWidth = 1.4,
  drawDuration = 1.6,
  fillDelay = 0.2,
  stagger = 0.05,
  ease = 'power2.out',
  trigger = 'mount',
  fillMode = 'wipe',
  fontSize = 128,
  fontWeight = 800,
  letterSpacing = -4,
  reverse = false,
  className = '',
  style = {},
}: StrokeTextProps) => {
  const rootRef = useRef<HTMLSpanElement>(null)
  const strokeTextRef = useRef<SVGTextElement>(null)
  const wipeRectRef = useRef<SVGRectElement>(null)

  const [box, setBox] = useState<Box | null>(null)

  const rawId = useId()
  const wipeId = `stroke-text-wipe-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const characters = useMemo(() => Array.from(String(text ?? '')), [text])

  const dash = Math.max(fontSize * 7, 200)

  const fontStyle = useMemo<CSSProperties>(
    () => ({
      fontSize: `${fontSize}px`,
      fontWeight,
      letterSpacing: `${letterSpacing}px`,
    }),
    [fontSize, fontWeight, letterSpacing],
  )

  // 字形包围盒要在布局阶段量，量出来才能算 viewBox 与扫过用的裁剪矩形
  useLayoutEffect(() => {
    const node = strokeTextRef.current
    if (!node) return undefined

    let cancelled = false

    const measure = () => {
      if (cancelled || !strokeTextRef.current) return
      let bbox: DOMRect
      try {
        bbox = strokeTextRef.current.getBBox()
      } catch {
        // 元素尚未渲染时 getBBox 会抛错，直接跳过
        return
      }
      if (!bbox || !bbox.width) return

      const pad = Math.max(Number(strokeWidth) || 1, fontSize * 0.1)
      const next: Box = {
        x: bbox.x - pad,
        y: bbox.y - pad,
        width: bbox.width + pad * 2,
        height: bbox.height + pad * 2,
      }

      setBox((prev) =>
        prev &&
        Math.abs(prev.x - next.x) < 0.5 &&
        Math.abs(prev.width - next.width) < 0.5 &&
        Math.abs(prev.y - next.y) < 0.5
          ? prev
          : next,
      )
    }

    measure()
    // Web 字体加载完成后字形宽度会变，必须重测一次，否则 viewBox 会算窄
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [characters, fontSize, fontWeight, letterSpacing, strokeWidth])

  useEffect(() => {
    const root = rootRef.current
    if (typeof window === 'undefined' || !root || !box) return undefined

    const strokes = gsap.utils.toArray<SVGElement>(
      root.querySelectorAll('[data-stroke-char]'),
    )
    const fills = gsap.utils.toArray<SVGElement>(root.querySelectorAll('[data-fill-char]'))
    const wipe = wipeRectRef.current
    if (!strokes.length) return undefined

    const fillEnabled = fillMode !== 'none'
    const useWipe = fillEnabled && fillMode === 'wipe'
    const fillDuration = Math.max(0.4, drawDuration * 0.5)
    const staggerConfig: StaggerConfig = reverse ? { each: stagger, from: 'end' } : stagger
    const targets: (SVGElement | SVGRectElement)[] = [...strokes, ...fills, wipe].filter(
      (node): node is SVGElement | SVGRectElement => Boolean(node),
    )

    const setStart = () => {
      gsap.killTweensOf(targets)
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash })
      gsap.set(fills, { opacity: useWipe ? 1 : 0 })
      if (wipe) gsap.set(wipe, { attr: { width: 0 } })
    }

    const setEnd = () => {
      gsap.killTweensOf(targets)
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 })
      gsap.set(fills, { opacity: fillEnabled ? 1 : 0 })
      if (wipe) gsap.set(wipe, { attr: { width: fillEnabled ? box.width : 0 } })
    }

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (prefersReducedMotion) {
      // 降低动效偏好：直接给终态，不做任何补间
      setEnd()
      return () => gsap.killTweensOf(targets)
    }

    const build = () => {
      setStart()
      const tl = gsap.timeline({
        paused: true,
        repeat: trigger === 'loop' ? -1 : 0,
        repeatDelay: trigger === 'loop' ? 0.9 : 0,
        defaults: { overwrite: 'auto' },
      })

      tl.to(
        strokes,
        { strokeDashoffset: 0, duration: drawDuration, ease, stagger: staggerConfig },
        0,
      )

      if (useWipe && wipe) {
        tl.to(
          wipe,
          { attr: { width: box.width }, duration: fillDuration, ease: 'power2.inOut' },
          drawDuration + fillDelay,
        )
      } else if (fillEnabled) {
        tl.to(
          fills,
          { opacity: 1, duration: fillDuration, ease: 'power2.out', stagger: staggerConfig },
          drawDuration + fillDelay,
        )
      }

      return tl
    }

    let timeline: gsap.core.Timeline | null = null
    let scrollTrigger: ReturnType<typeof ScrollTrigger.create> | null = null
    let removeHover: (() => void) | null = null

    if (trigger === 'hover') {
      setEnd()
      const play = () => {
        timeline?.kill()
        timeline = build()
        timeline.play(0)
      }
      root.addEventListener('pointerenter', play)
      removeHover = () => root.removeEventListener('pointerenter', play)
    } else {
      timeline = build()
      if (trigger === 'scroll') {
        scrollTrigger = ScrollTrigger.create({
          trigger: root,
          start: 'top 82%',
          once: true,
          onEnter: () => timeline?.play(0),
        })
      } else {
        timeline.play(0)
      }
    }

    return () => {
      removeHover?.()
      scrollTrigger?.kill()
      timeline?.kill()
      gsap.killTweensOf(targets)
    }
  }, [box, dash, drawDuration, fillDelay, stagger, ease, trigger, fillMode, reverse])

  const viewBox = box
    ? `${box.x} ${box.y} ${box.width} ${box.height}`
    : `0 ${-fontSize} 600 ${fontSize * 1.3}`

  const rootStyle = {
    ...style,
    '--stroke-text-height': `${Math.round(fontSize * 1.3)}px`,
  } as CSSProperties

  return (
    <span
      ref={rootRef}
      className={`stroke-text ${trigger === 'hover' ? 'stroke-text--hover' : ''} ${className}`.trim()}
      style={rootStyle}
      role="img"
      aria-label={String(text ?? '')}
    >
      <svg
        className="stroke-text__svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {fillMode === 'wipe' && box && (
          <defs>
            <clipPath id={wipeId} clipPathUnits="userSpaceOnUse">
              <rect ref={wipeRectRef} x={box.x} y={box.y} width="0" height={box.height} />
            </clipPath>
          </defs>
        )}

        <text
          ref={strokeTextRef}
          className="stroke-text__stroke"
          x="0"
          y="0"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={fontStyle}
        >
          {characters.map((char, index) => (
            <tspan data-stroke-char key={`s-${index}`}>
              {char}
            </tspan>
          ))}
        </text>

        <text
          className="stroke-text__fill"
          x="0"
          y="0"
          fill={fillColor}
          stroke="none"
          style={fontStyle}
          clipPath={fillMode === 'wipe' && box ? `url(#${wipeId})` : undefined}
        >
          {characters.map((char, index) => (
            <tspan data-fill-char key={`f-${index}`}>
              {char}
            </tspan>
          ))}
        </text>
      </svg>
    </span>
  )
}

export default StrokeText
