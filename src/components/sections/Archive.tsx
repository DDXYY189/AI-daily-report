import { Container } from '../layout/Container'
import { SectionHeader } from '../layout/SectionHeader'
import { Tag } from '../ui/Tag'
import { Reveal } from '../ui/Reveal'
import { archive } from '../../data/digest'

const COUNT_LABELS = [
  { key: 'news', label: '热点' },
  { key: 'papers', label: '论文' },
  { key: 'repos', label: '开源' },
] as const

/**
 * 归档历史：纵向时间线。
 * 竖线与节点由每一项自己绘制（最后一项不画竖线），
 * 节点是全站唯一允许出现的圆点，因为它表达真实的时间线节点状态。
 */
export function Archive() {
  return (
    <section id="archive" className="scroll-mt-24 bg-abyss py-24 lg:py-32">
      <Container>
        <SectionHeader
          title="归档历史"
          action={{ label: '订阅更新提醒', href: '#subscribe' }}
        />

        <ol className="mt-12 max-w-[1100px]">
          {archive.map((entry, index) => {
            const isLast = index === archive.length - 1
            return (
              <li key={entry.id} className="group relative pl-10">
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute top-4 bottom-0 left-[3px] w-px bg-line"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="absolute top-[7px] left-0 h-[7px] w-[7px] rounded-full border border-line-3 bg-void transition-colors duration-300 group-hover:border-accent"
                />

                <Reveal className={isLast ? '' : 'pb-12'}>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="font-mono text-sm text-fg-muted">
                        第 {entry.issue} 期
                      </span>
                      <span className="font-mono text-xs text-fg-dim">{entry.dateLabel}</span>
                    </div>

                    {/* 往期详情页还没做，所以标题不做成链接，避免假的可点affordance */}
                    <p className="mt-2 max-w-[46ch] text-lg leading-snug font-semibold text-fg transition-colors duration-200 group-hover:text-accent">
                      {entry.headline}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.highlights.map((highlight) => (
                        <Tag key={highlight}>{highlight}</Tag>
                      ))}
                    </div>

                    {/* 只渲染确实取到的计数。为 null 的字段整项隐藏，不显示 0 */}
                    <div className="mt-4 flex flex-wrap gap-5 font-mono text-xs text-fg-dim">
                      {COUNT_LABELS.map(({ key, label }) => {
                        const value = entry.counts[key]
                        if (typeof value !== 'number') return null
                        return (
                          <span key={key}>
                            {label} {String(value).padStart(2, '0')}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </Reveal>
              </li>
            )
          })}
        </ol>
      </Container>
    </section>
  )
}
