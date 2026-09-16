import { CircleAlert } from 'lucide-react'
import { Container } from '../layout/Container'
import { Reveal } from '../ui/Reveal'
import StrokeText from '../ui/StrokeText'
import { SubscribeForm } from './SubscribeForm'
import {
  degraded,
  issueNumber,
  shortSourceLabels,
  syncLabel,
  todayLabel,
} from '../../data/digest'

const CONTENT_LINKS = [
  { label: '今日速递', href: '#today' },
  { label: '论文速递', href: '#papers' },
  { label: '开源项目', href: '#repos' },
  { label: '归档历史', href: '#archive' },
] as const

const SOURCE_LABELS: Record<string, string> = {
  news: '行业新闻',
  papers: '论文速递',
  repos: '开源项目',
}

/**
 * 整屏收尾。
 * 首屏是 min-h-[100dvh] 的全屏 Hero，收尾也做成整屏：
 * 上半部分垂直居中放订阅入口，下半部分是页脚导航与版权。
 * 页脚链接全部是有效的页内锚点，没有占位的死链。
 */
export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer
      id="subscribe"
      className="relative scroll-mt-24 overflow-hidden border-t border-line bg-void"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[30%] left-1/2 h-[70vw] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgb(91_200_232/0.09),transparent_66%)] blur-[100px]"
      />

      <div className="relative flex min-h-[100dvh] flex-col">
        <Container className="flex flex-1 flex-col justify-center py-24 lg:py-28">
          {/* 描边描画字标：滚入视口时先画出描边，再由左向右扫过填充。
              两个刻意的选择：
              1) 放在页脚而不是 Hero —— StrokeText 源码里写死了
                 preserveAspectRatio="xMidYMid meet"，内容**永远在容器里居中**，
                 用它做左对齐的 Hero 大标题会和眉标、副文案错位。
              2) 不包在 <Reveal> 里 —— Reveal 会先把容器置为透明再淡入，
                 那会让 GSAP 的时间轴在看不见的状态下跑完。 */}
          <StrokeText
            text="AI 日报"
            strokeColor="#5bc8e8"
            fillColor="#e9ecf1"
            strokeWidth={1.6}
            drawDuration={1.8}
            fillDelay={0.2}
            stagger={0.12}
            ease="power2.out"
            trigger="scroll"
            fillMode="wipe"
            fontSize={132}
            fontWeight={700}
            letterSpacing={-2}
            className="mx-auto mb-14 w-full max-w-[820px] lg:mb-20"
          />

          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-6">
              <h2 className="text-3xl leading-[1.15] font-semibold text-fg lg:text-[3.25rem]">
                每天早上八点
                <br />
                一封 AI 日报送到你的邮箱
              </h2>
              <p className="mt-7 max-w-[46ch] text-base leading-relaxed text-fg-muted lg:text-lg">
                行业新闻、技术进展、论文速递与开源动态，只保留值得看的部分。
              </p>
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8">
              <SubscribeForm />
            </Reveal>
          </div>
        </Container>

        <div className="border-t border-line">
          <Container className="py-12">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-5">
                <p className="text-[1.0625rem] font-semibold tracking-tight text-fg">
                  AI 日报
                </p>
                <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-fg-dim">
                  每日汇总 AI 行业新闻、技术进展、论文速递与开源项目动态。
                </p>
                <p className="mt-5 font-mono text-xs text-fg-dim">
                  第 {issueNumber} 期 · {todayLabel}
                </p>
              </div>

              <nav aria-label="内容导航" className="lg:col-span-3">
                <h3 className="text-sm text-fg-muted">内容</h3>
                <ul className="mt-4 space-y-3">
                  {CONTENT_LINKS.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-sm text-fg-dim transition-colors duration-200 hover:text-accent"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="lg:col-span-4">
                <h3 className="text-sm text-fg-muted">订阅</h3>
                <ul className="mt-4 space-y-3">
                  <li>
                    <a
                      href="#subscribe"
                      className="text-sm text-fg-dim transition-colors duration-200 hover:text-accent"
                    >
                      订阅今日日报
                    </a>
                  </li>
                  <li>
                    <a
                      href="#top"
                      className="text-sm text-fg-dim transition-colors duration-200 hover:text-accent"
                    >
                      回到顶部
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 border-t border-line pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-mono text-xs text-fg-dim">© {year} AI 日报</p>
                <p className="font-mono text-xs text-fg-dim">
                  快照 {syncLabel} · 上海时间
                </p>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-fg-dim">
                数据来源 {shortSourceLabels.join(' · ')}。标题、摘要与链接均来自上述公开数据源，
                本站只做筛选、归类与排版。
              </p>

              {degraded.isPartial && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-danger">
                  <CircleAlert
                    size={13}
                    strokeWidth={1.7}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    本次同步有数据源不可用（
                    {degraded.sources.map((key) => SOURCE_LABELS[key] ?? key).join('、')}
                    ），相关板块沿用上一期数据。
                  </span>
                </p>
              )}
            </div>
          </Container>
        </div>
      </div>
    </footer>
  )
}
