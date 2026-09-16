import { ArrowUpRight } from 'lucide-react'
import { Container } from '../layout/Container'
import { CursorGlow } from '../layout/CursorGlow'
import { Button } from '../ui/Button'
import { Reveal } from '../ui/Reveal'
import { HeroBackdrop } from './HeroBackdrop'
import { IssuePanel } from './IssuePanel'
import { issueNumber, todayLabel } from '../../data/digest'

/**
 * 全屏 Hero。
 *
 * 背景由 HeroBackdrop 统一负责：GhostFibers 的 WebGL 纤维场主视觉 +
 * CSS 兜底层 + 暗色遮罩，三者叠放顺序写在那边的注释里。
 *
 * 排版规则遵守情况：
 * - 高度用 min-h-[100dvh]，不用 h-screen（避免移动端地址栏引起的跳动）
 * - 文字栈恰好 4 项：眉标（期号与日期）/ 标题 / 副文案 / 两个 CTA
 * - 标题单行，副文案 42 字（约合 20 词），CTA 首屏可见不需滚动
 * - 垂直内边距上限 py-24（96px），不让内容浮到视口正中偏下
 * - 刻意不做居中 Hero：左侧标题、右侧刊头面板的非对称分栏
 */
export function Hero() {
  return (
    <section id="top" className="relative isolate min-h-[100dvh] overflow-hidden pt-[68px]">
      <HeroBackdrop />

      {/* 指针光轨包在 Container 外面、HeroBackdrop 里面。
          位置是必须的：GlowCursor 的 canvas 是**在 children 之下**的，
          所以如果包整个 section，canvas 会被 HeroBackdrop 里那块不透明的纤维场盖掉、完全看不见。
          包在 HeroBackdrop 之后（DOM 顺序靠后）才能让光轨浮在纤维场之上。
          canvas 面积因此等于这个 Content 的盒子（约一个视口），而不是整页 —— 这是刻意的开销控制。 */}
      <CursorGlow>
        <Container className="relative">
          <div className="flex min-h-[calc(100dvh-68px)] items-center py-16 lg:py-24">
            <div className="grid w-full items-center gap-14 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-6">
                <Reveal duration={0.5}>
                  {/* 用 fg-muted 而不是 fg-dim：纤维场会在这一带产生较亮的发光带，
                      实测最坏情况下 fg-dim 只有 3.60:1，低于 AA 的 4.5；换成 fg-muted 是 5.16:1 */}
                  <p className="font-mono text-sm text-fg-muted">
                    第 {issueNumber} 期 · {todayLabel}
                  </p>
                </Reveal>

                <Reveal delay={0.08}>
                  <h1 className="mt-6 text-6xl font-semibold tracking-tight text-fg lg:text-[5.5rem] lg:leading-[1.02]">
                    AI 日报
                  </h1>
                </Reveal>

                <Reveal delay={0.16}>
                  <p className="mt-7 max-w-[46ch] text-base leading-relaxed text-fg-muted lg:text-lg">
                    汇总 AI 行业新闻、技术进展、论文速递与开源项目动态，一页读完当天真正重要的变化。
                  </p>
                </Reveal>

                <Reveal delay={0.24}>
                  <div className="mt-10 flex flex-wrap items-center gap-4">
                    <Button
                      href="#subscribe"
                      size="lg"
                      iconRight={
                        <ArrowUpRight size={15} strokeWidth={1.7} aria-hidden="true" />
                      }
                    >
                      订阅今日日报
                    </Button>
                    <Button href="#today" variant="ghost" size="lg">
                      查看今日内容
                    </Button>
                  </div>
                </Reveal>
              </div>

              <Reveal delay={0.2} className="lg:col-span-5 lg:col-start-8">
                <IssuePanel />
              </Reveal>
            </div>
          </div>
        </Container>
      </CursorGlow>
    </section>
  )
}
