import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Search, ArrowUpRight } from 'lucide-react'
import { Container } from '../layout/Container'
import { SectionHeader } from '../layout/SectionHeader'
import { Button } from '../ui/Button'
import { Reveal } from '../ui/Reveal'
import { NewsCard } from './NewsCard'
import { activeCategories, news, todayKeywords } from '../../data/digest'
import type { NewsCategory } from '../../data/digest'

type Filter = '全部' | NewsCategory

const FILTERS: readonly Filter[] = ['全部', ...activeCategories]

/**
 * 今日速递：非对称 bento 网格。
 *
 * 版式：12 列栅格下「7 列大格跨两行 + 右侧两格 + 底部三格」，
 * 格子数与内容数严格相等（5 条新闻 + 1 个关键词格 = 6 格），中间和末尾都不留空格子。
 *
 * 真实数据接入后的两个必要处理：
 *   - 分类筛选项从数据派生，只列当天确实出现过的分类，
 *     否则会出现「点了必然是空结果」的筛选项。
 *   - 大格优先选有配图的条目，保证首屏最大那块不是纯文字；
 *     其余格子仍按热度（赞同数）顺序取，不为了好看打乱编辑排序。
 *
 * 状态处理：默认 bento 网格 / 筛选无结果的组合式空态。
 * 这里**不做骨架屏**：数据是构建期快照，进页面时就已经在包里，
 * 人为延迟再显示骨架只是表演，还会推后 LCP。真正的异步等待在图片上，
 * 由 SmartImage 负责骨架与失败占位。
 */
export function TodayDigest() {
  const [category, setCategory] = useState<Filter>('全部')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return news.filter((item) => {
      const matchCategory = category === '全部' || item.category === category
      const matchKeyword =
        keyword === '' ||
        item.title.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword) ||
        item.source.toLowerCase().includes(keyword)
      return matchCategory && matchKeyword
    })
  }, [category, query])

  const isDefaultView = category === '全部' && query.trim() === ''

  /**
   * 先构造出 6 个格子，再按固定版位渲染。
   * 关键词为空时用第 6 条新闻补位，保证 bento 永远不会缺格。
   */
  const cells = useMemo<ReactNode[]>(() => {
    if (news.length === 0) return []

    const featured = news.find((item) => item.image) ?? news[0]!
    const ordered = [featured, ...news.filter((item) => item.id !== featured.id)]

    const wantKeywords = todayKeywords.length > 0
    const newsCells = ordered.slice(0, wantKeywords ? 5 : 6)
    const lastCard = wantKeywords ? newsCells[4] : newsCells[5]

    return [
      newsCells[0] ? <NewsCard key="c0" item={newsCells[0]} featured /> : null,
      newsCells[1] ? (
        <NewsCard key="c1" item={newsCells[1]} className="lg:min-h-[280px]" />
      ) : null,
      newsCells[2] ? (
        <NewsCard key="c2" item={newsCells[2]} className="lg:min-h-[280px]" />
      ) : null,
      newsCells[3] ? (
        <NewsCard key="c3" item={newsCells[3]} className="lg:min-h-[320px]" />
      ) : null,
      wantKeywords ? (
        <KeywordCell key="kw" onSelect={setQuery} />
      ) : lastCard ? (
        <NewsCard key="c4" item={lastCard} className="lg:min-h-[320px]" />
      ) : null,
      wantKeywords && lastCard ? (
        <NewsCard key="c5" item={lastCard} className="lg:min-h-[320px]" />
      ) : null,
    ]
  }, [setQuery])

  const reset = () => {
    setCategory('全部')
    setQuery('')
  }

  return (
    <section id="today" className="scroll-mt-24 py-24 lg:py-32">
      <Container>
        <SectionHeader title="今日速递" />

        {/* 筛选与检索。表单控件带可见 label，不使用 placeholder 充当标签 */}
        <Reveal>
          <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="按分类筛选">
              {FILTERS.map((item) => {
                const active = category === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    aria-pressed={active}
                    className={`h-9 rounded-control border px-3.5 text-sm transition-colors duration-200 active:scale-[0.98] ${
                      active
                        ? 'border-accent-dim bg-accent-wash text-accent'
                        : 'border-line-2 text-fg-muted hover:border-line-3 hover:text-fg'
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>

            <div className="w-full lg:w-[280px]">
              <label htmlFor="news-search" className="mb-2 block text-xs text-fg-dim">
                检索今日速递
              </label>
              <div className="relative">
                <Search
                  size={15}
                  strokeWidth={1.6}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-dim"
                />
                <input
                  id="news-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="标题、摘要或来源"
                  className="h-10 w-full rounded-control border border-line-2 bg-surface pr-3 pl-9 text-sm text-fg transition-colors duration-200 placeholder:text-fg-dim focus:border-accent-dim"
                />
              </div>
            </div>
          </div>
        </Reveal>

        {isDefaultView ? (
          <div className="mt-10 grid gap-4 lg:grid-cols-12">
            <Reveal className="lg:col-span-7 lg:row-span-2">{cells[0]}</Reveal>
            <Reveal delay={0.05} className="lg:col-span-5">
              {cells[1]}
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-5">
              {cells[2]}
            </Reveal>
            <Reveal delay={0.15} className="lg:col-span-4">
              {cells[3]}
            </Reveal>
            <Reveal delay={0.2} className="lg:col-span-4">
              {cells[4]}
            </Reveal>
            <Reveal delay={0.25} className="lg:col-span-4">
              {cells[5]}
            </Reveal>
          </div>
        ) : filtered.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, index) => (
              <Reveal key={item.id} delay={Math.min(index, 5) * 0.05}>
                <NewsCard item={item} className="min-h-[300px]" />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mt-10 flex flex-col items-center justify-center rounded-panel border border-line bg-surface px-6 py-20 text-center">
              <Search size={22} strokeWidth={1.4} aria-hidden="true" className="text-fg-dim" />
              <p className="mt-5 text-base font-medium text-fg">没有匹配的内容</p>
              <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-fg-muted">
                换一个关键词，或者清除筛选，看看本期全部 {news.length} 条速递。
              </p>
              <Button variant="ghost" className="mt-7" onClick={reset}>
                清除筛选
              </Button>
            </div>
          </Reveal>
        )}
      </Container>
    </section>
  )
}

/**
 * bento 的第 6 格：今日关键词。
 * 关键词由数据脚本从当日标题提取（已知实体 + 受控主题词表），
 * 点击任意关键词会直接驱动上方检索。
 */
function KeywordCell({ onSelect }: { onSelect: (keyword: string) => void }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-panel border border-line bg-surface p-6 lg:min-h-[320px]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgb(91_200_232/0.1),transparent_62%)]"
      />

      <div className="relative">
        <h3 className="text-sm text-fg-muted">今日关键词</h3>
        <div className="mt-5 flex flex-wrap gap-2">
          {todayKeywords.map((keyword) => (
            <button
              key={keyword}
              type="button"
              onClick={() => onSelect(keyword)}
              className="group/tag inline-flex items-center gap-1.5 rounded-control border border-line-2 px-2.5 py-1 text-xs text-fg-muted transition-colors duration-200 hover:border-accent-dim hover:text-accent active:scale-[0.98]"
            >
              {keyword}
              <ArrowUpRight
                size={12}
                strokeWidth={1.7}
                aria-hidden="true"
                className="opacity-0 transition-opacity duration-200 group-hover/tag:opacity-100"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
