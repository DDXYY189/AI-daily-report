import { ExternalLink } from 'lucide-react'
import { Container } from '../layout/Container'
import { SectionHeader } from '../layout/SectionHeader'
import { Tag } from '../ui/Tag'
import { Reveal } from '../ui/Reveal'
import { papers } from '../../data/digest'

/**
 * 论文速递：整幅「账簿式」行列表。
 * 刻意不用卡片容器：摘要本身信息密度高，卡片边框只会增加视觉噪音，
 * 因此改用发丝线分隔 + 12 列栅格（序号 / 正文 / 元信息）。
 * 这一版式家族全站只用这一次。
 */
export function Papers() {
  return (
    <section id="papers" className="scroll-mt-24 bg-abyss py-24 lg:py-32">
      <Container>
        <SectionHeader
          title="论文速递"
          action={{ label: 'arXiv 最新列表', href: 'https://arxiv.org/list/cs.AI/recent' }}
        />

        <ol className="mt-10 divide-y divide-line">
          {papers.map((paper) => (
            <li key={paper.id}>
              <Reveal>
                <article className="group grid gap-5 py-8 lg:grid-cols-12 lg:gap-8 lg:py-10">
                  <div className="lg:col-span-1">
                    <span className="font-mono text-sm text-fg-dim transition-colors duration-200 group-hover:text-accent">
                      {paper.index}
                    </span>
                  </div>

                  <div className="lg:col-span-8">
                    <h3 className="max-w-[52ch] text-lg leading-snug font-semibold text-fg lg:text-xl">
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="transition-colors duration-200 group-hover:text-accent"
                      >
                        {paper.title}
                      </a>
                    </h3>

                    {paper.authorsLabel && (
                      <p className="mt-2 font-mono text-xs text-fg-dim">{paper.authorsLabel}</p>
                    )}

                    <p className="mt-3 max-w-[78ch] text-sm leading-relaxed text-fg-muted">
                      {paper.abstract}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {paper.topics.map((topic) => (
                        <Tag key={topic}>{topic}</Tag>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-3 lg:text-right">
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 rounded-control border border-line-2 px-3 py-2 font-mono text-xs text-fg-muted transition-colors duration-200 hover:border-accent-dim hover:text-accent active:scale-[0.98]"
                    >
                      arXiv:{paper.arxivId}
                      <ExternalLink size={13} strokeWidth={1.6} aria-hidden="true" />
                    </a>
                    <p className="mt-3 font-mono text-xs text-fg-dim">{paper.submittedAt}</p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
