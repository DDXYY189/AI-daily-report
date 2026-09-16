/**
 * AI 日报 · 数据层
 * ============================================================================
 * 这里不再存放任何内容，只做一件事：把 `snapshot.json` 适配成组件要用的形状。
 *
 * snapshot.json 由 `npm run sync-data` 从真实数据源生成：
 *   - 行业新闻：Hacker News（Algolia 检索 API），过去 24 小时高分 AI 故事
 *   - 论文速递：arXiv 官方 API（cs.AI / cs.LG / cs.CL）最新提交
 *   - 开源项目：GitHub Search API（近 7 天有推送、star 数最高）
 *   - 配图与摘要：原文页面的 Open Graph 元信息，抓不到就留空
 *
 * 快照是站点内容的一部分，**需要提交到版本库**；
 * 没有快照时构建会直接报错，而不是静默渲染出一个空站点。
 *
 * 数据里所有「拿不到」的字段一律是空字符串或 null，绝不填假值：
 * 摘要是空的卡片就不渲染摘要行，配图是空的就落到设计好的占位槽。
 */

import rawSnapshot from './snapshot.json'

/* ------------------------------------------------------------ 快照原始类型 */

export interface SnapshotNews {
  id: string
  category: string
  title: string
  summary: string
  source: string
  url: string
  articleUrl: string
  image: string
  publishedAt: string
  time: string
  points: number
  comments: number
}

export interface SnapshotPaper {
  id: string
  index: string
  title: string
  abstract: string
  arxivId: string
  url: string
  topics: string[]
  authors: string[]
  authorCount: number
  submittedAt: string
}

export interface SnapshotRepo {
  id: string
  owner: string
  name: string
  description: string
  stars: number
  forks: number
  language: string
  url: string
  pushedAt: string | null
  deltaStars: number | null
}

export interface SnapshotArchive {
  id: string
  date: string
  issue: string
  dateLabel: string
  headline: string
  highlights: string[]
  counts: {
    news: number | null
    papers: number | null
    repos: number | null
  }
  url: string
  kind: 'issue' | 'backfill'
}

export interface Snapshot {
  generatedAt: string
  generatedAtLabel: string
  targetDate: string
  issue: string
  dateLabel: string
  timezone: string
  window: { newsHours: number; newsLabel: string; archiveDays: number }
  sources: { news: string; papers: string; repos: string }
  today: {
    news: SnapshotNews[]
    papers: SnapshotPaper[]
    repos: SnapshotRepo[]
    keywords: string[]
  }
  archive: SnapshotArchive[]
  degraded: {
    sources: string[]
    isPartial: boolean
    previousGeneratedAt: string | null
  }
  counts: {
    news: number
    papers: number
    repos: number
    keywords: number
    candidatesToday: number
  }
}

/**
 * 用 unknown 中转再断言，避免 TypeScript 去推导那个巨大的 JSON 字面量类型
 * （推导会明显拖慢类型检查，而且报错信息完全不可读）。
 */
export const snapshot = rawSnapshot as unknown as Snapshot

/* ------------------------------------------------------------ 视图层类型 */

export type NewsCategory = '模型' | '算力' | '应用' | '开源' | '安全' | '业界'

export const CATEGORY_ORDER: readonly NewsCategory[] = [
  '模型',
  '算力',
  '应用',
  '开源',
  '安全',
  '业界',
]

export interface NewsItem {
  id: string
  category: NewsCategory
  title: string
  /** 空字符串表示原文没有提供可用的描述，前端隐藏摘要行 */
  summary: string
  source: string
  time: string
  /** 空字符串表示抓不到配图，前端落到占位槽 */
  image: string
  /** Hacker News 讨论页 */
  discussionUrl: string
  /** 原文链接，卡片主链接指向这里 */
  articleUrl: string
  points: number
  comments: number
}

export interface Paper {
  id: string
  index: string
  title: string
  abstract: string
  arxivId: string
  url: string
  topics: string[]
  authorsLabel: string
  submittedAt: string
}

export interface Repo {
  id: string
  owner: string
  name: string
  description: string
  stars: number
  forks: number
  language: string
  url: string
  /** null 表示还没有可对比的历史快照，前端不显示增量 */
  deltaStars: number | null
}

export interface ArchiveEntry {
  id: string
  issue: string
  dateLabel: string
  headline: string
  highlights: string[]
  /** 各项可能为 null（该字段没有取到），前端整项隐藏，不显示 0 */
  counts: { news: number | null; papers: number | null; repos: number | null }
}

/* ---------------------------------------------------------------- 派生值 */

export const issueNumber = snapshot.issue
export const dataSources = snapshot.sources
/** 页脚用的短标签，完整来源说明见 snapshot.sources */
export const shortSourceLabels = ['Hacker News', 'arXiv', 'GitHub'] as const
export const syncLabel = snapshot.generatedAtLabel
export const newsWindowLabel = snapshot.window.newsLabel
export const degraded = snapshot.degraded

/** 快照生成时刻，用于在页面上如实标注数据新鲜度 */
export const syncTimeLabel = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date(snapshot.generatedAt))

/** 中文长日期。固定用上海时区并取当天正午，避免跨时区把日期算错一天。 */
export const todayLabel = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
}).format(new Date(`${snapshot.targetDate}T12:00:00+08:00`))

export const todayKeywords = snapshot.today.keywords

const isCategory = (value: string): value is NewsCategory =>
  (CATEGORY_ORDER as readonly string[]).includes(value)

export const news: NewsItem[] = snapshot.today.news.map((item) => ({
  id: item.id,
  category: isCategory(item.category) ? item.category : '业界',
  title: item.title,
  summary: item.summary,
  source: item.source,
  time: item.time,
  image: item.image,
  discussionUrl: item.url,
  articleUrl: item.articleUrl || item.url,
  points: item.points,
  comments: item.comments,
}))

/** 只列出当天确实出现过的分类，避免出现点了必然是空结果的筛选项 */
export const activeCategories: NewsCategory[] = CATEGORY_ORDER.filter((category) =>
  news.some((item) => item.category === category),
)

export const papers: Paper[] = snapshot.today.papers.map((item) => ({
  id: item.id,
  index: item.index,
  title: item.title,
  abstract: item.abstract,
  arxivId: item.arxivId,
  url: item.url,
  topics: item.topics.map(arxivTopicLabel),
  authorsLabel:
    item.authors.length === 0
      ? ''
      : item.authorCount > item.authors.length
        ? `${item.authors[0]} 等 ${item.authorCount} 位作者`
        : item.authors.join('、'),
  submittedAt: item.submittedAt,
}))

/** arXiv 分类代码到中文标签，让中文读者不必先记住 cs.CL 是什么 */
function arxivTopicLabel(code: string): string {
  const labels: Record<string, string> = {
    AI: '人工智能',
    CL: '计算语言学',
    LG: '机器学习',
    CV: '计算机视觉',
    GR: '图形学',
    NE: '神经计算',
    NI: '神经与学习系统',
    MA: '多智能体',
    RO: '机器人',
    IR: '信息检索',
    SD: '声音与语音',
    HC: '人机交互',
    DC: '分布式计算',
    SE: '软件工程',
    CR: '密码与安全',
  }
  return labels[code] ?? code
}

export const repos: Repo[] = snapshot.today.repos.map((item) => ({
  id: item.id,
  owner: item.owner,
  name: item.name,
  description: item.description,
  stars: item.stars,
  forks: item.forks,
  language: item.language,
  url: item.url,
  deltaStars: item.deltaStars,
}))

export const archive: ArchiveEntry[] = snapshot.archive.map((item) => ({
  id: item.id,
  issue: item.issue,
  dateLabel: item.dateLabel,
  headline: item.headline,
  highlights: item.highlights,
  counts: item.counts,
}))
