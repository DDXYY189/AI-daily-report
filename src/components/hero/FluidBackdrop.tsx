/**
 * CSS 兜底背景层：流体渐变 + CSS 粒子 + 细网格纹理。
 *
 * 定位说明：Hero 背景的主视觉是 GhostFibers 的 WebGL 纤维场（见 HeroBackdrop）。
 * 这一层保留下来专门做**降级兜底**：
 *   - WebGL 场景加载完成之前显示，避免首屏背景是一片纯黑
 *   - 场景初始化失败时顶上（WebGL2 不可用、shader 编译失败、显卡驱动被禁）
 * 场景 ready 之后这一层会被淡出并卸载，不参与合成，避免和 WebGL 抢帧。
 *
 * 两层结构（全部 aria-hidden，纯装饰）：
 *   1. 流体渐变  三个大半径径向渐变斑块，用 CSS keyframes 缓慢漂移，filter: blur 制造流体感
 *   2. CSS 粒子  34 个确定性生成的光点，各自独立的时长与延迟；不使用 canvas
 *
 * 性能取舍：粒子数量刻意控制在低位，只动画 transform/opacity，
 * 全部在合成层完成，不触发布局与重绘。prefers-reduced-motion 下动画整体关闭
 * （见 index.css 的 media query）。
 *
 * 暗色遮罩不在这里 —— 它必须压在 WebGL 场景之上，所以由 HeroBackdrop 统一负责。
 */

import type { CSSProperties } from 'react'

const PARTICLE_COUNT = 34

/** 确定性伪随机，保证每次渲染粒子分布一致，不出现跳动 */
function createParticles(count: number) {
  let seed = 20260214
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  return Array.from({ length: count }, (_, index) => {
    const size = 1 + rand() * 2.4
    return {
      id: index,
      left: rand() * 100,
      top: 12 + rand() * 88,
      size,
      duration: 14 + rand() * 16,
      delay: -rand() * 22,
      opacity: 0.18 + rand() * 0.42,
      drift: (rand() - 0.5) * 90,
    }
  })
}

const PARTICLES = createParticles(PARTICLE_COUNT)

export function FluidBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* 1. 流体渐变斑块 */}
      <div className="absolute inset-0">
        <div className="animate-drift-a absolute -top-[22%] -left-[12%] h-[62vw] w-[62vw] rounded-full bg-[radial-gradient(circle_at_center,rgb(91_200_232/0.2),transparent_66%)] blur-[90px]" />
        <div className="animate-drift-b absolute top-[8%] right-[-16%] h-[54vw] w-[54vw] rounded-full bg-[radial-gradient(circle_at_center,rgb(46_125_147/0.26),transparent_68%)] blur-[110px]" />
        <div className="animate-drift-c absolute bottom-[-28%] left-[24%] h-[48vw] w-[48vw] rounded-full bg-[radial-gradient(circle_at_center,rgb(126_168_196/0.14),transparent_70%)] blur-[100px]" />
      </div>

      {/* 2. CSS 粒子场 */}
      <div className="absolute inset-0">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="animate-rise absolute rounded-full bg-accent [will-change:transform,opacity]"
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                '--particle-opacity': p.opacity,
                '--particle-drift': `${p.drift}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* 细网格纹理，给流体背景一个结构参照 */}
      <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgb(255_255_255/0.028)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.028)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(100%_80%_at_50%_20%,black,transparent_76%)]" />
    </div>
  )
}
