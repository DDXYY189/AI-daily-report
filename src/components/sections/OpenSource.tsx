import { motion, useReducedMotion } from 'motion/react'
import { Star, GitFork, TrendingUp, ArrowUpRight } from 'lucide-react'
import { Container } from '../layout/Container'
import { SectionHeader } from '../layout/SectionHeader'
import { Reveal } from '../ui/Reveal'
import { repos } from '../../data/digest'
import { formatCompact } from '../../lib/format'
import { EASE_OUT } from '../../lib/motion'

/**
 * 开源项目：等宽数据卡片网格。
 * 与今日速递的差异是刻意的：那边是图片主导的非对称 bento，
 * 这边是「无图片 + 数据行」的均匀网格，读起来像排行榜而不是宣传卡。
 * 语言用文字而非彩色圆点表示，避免在全站唯一强调色之外引入杂色。
 */
export function OpenSource() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="repos" className="scroll-mt-24 py-24 lg:py-32">
      <Container>
        <SectionHeader
          title="开源项目"
          action={{ label: 'GitHub 趋势榜', href: 'https://github.com/trending' }}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo, index) => (
            <Reveal key={repo.id} delay={Math.min(index, 5) * 0.05}>
              <motion.a
                href={repo.url}
                target="_blank"
                rel="noreferrer noopener"
                whileHover={reduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.24, ease: EASE_OUT }}
                className="group flex h-full flex-col rounded-panel border border-line bg-surface p-6 transition-colors duration-300 hover:border-line-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-xs text-fg-dim">{repo.owner}/</span>
                  <ArrowUpRight
                    size={15}
                    strokeWidth={1.6}
                    aria-hidden="true"
                    className="mt-0.5 text-fg-dim transition-colors duration-200 group-hover:text-accent"
                  />
                </div>

                <h3 className="mt-2 font-mono text-lg font-semibold text-fg transition-colors duration-200 group-hover:text-accent">
                  {repo.name}
                </h3>

                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-fg-muted">
                  {repo.description}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                    <Star
                      size={13}
                      strokeWidth={1.7}
                      aria-hidden="true"
                      className="text-accent"
                    />
                    <span className="font-mono">{formatCompact(repo.stars)}</span>
                    <span className="sr-only">个 star</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                    <GitFork size={13} strokeWidth={1.7} aria-hidden="true" />
                    <span className="font-mono">{formatCompact(repo.forks)}</span>
                    <span className="sr-only">个 fork</span>
                  </span>

                  {/* star 增量只在有上一期真实快照可比对时才显示，首次运行为 null */}
                  {typeof repo.deltaStars === 'number' && repo.deltaStars > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-accent">
                      <TrendingUp size={13} strokeWidth={1.7} aria-hidden="true" />
                      <span className="font-mono">+{repo.deltaStars}</span>
                      <span className="sr-only">较上期新增 star</span>
                    </span>
                  )}

                  <span className="ml-auto font-mono text-xs text-fg-dim">
                    {repo.language}
                  </span>
                </div>
              </motion.a>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
