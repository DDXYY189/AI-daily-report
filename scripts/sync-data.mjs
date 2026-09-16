#!/usr/bin/env node
/**
 * AI 日报 · 数据同步脚本
 * ============================================================================
 * 从公开、免费、无需 API Key 的数据源拉取真实内容，生成本地快照。
 *
 * 为什么是「构建期快照」而不是前端实时请求：
 *   1. arXiv 官方 API 不返回 CORS 响应头，浏览器端根本无法直连；
 *   2. GitHub 匿名调用限流 60 次/小时，若由访客浏览器发起，站点很快会被限流打死；
 *   3. 日报本身就是「每天生成一次」的产品形态，内容应当固化，而不是每个访客各拉一遍。
 *
 * 数据源：
 *   - 行业新闻：Hacker News（Algolia 检索 API）
 *   - 论文速递：arXiv 官方 API（cs.AI / cs.LG / cs.CL）
 *   - 开源项目：GitHub Search API（可选 GITHUB_TOKEN 提高限流额度）
 *   - 文章配图与摘要：目标页面的 Open Graph 元信息（抓不到就落到设计好的占位槽）
 *
 * 用法：
 *   node scripts/sync-data.mjs              正常同步（约 30 到 60 秒）
 *   node scripts/sync-data.mjs --skip-images 跳过配图抓取（更快）
 *   node scripts/sync-data.mjs --days 7     归档窗口天数，默认 7
 *
 * 失败策略：任一必需数据源失败时**不覆盖**已有快照，并以非零码退出。
 * 宁可站点显示上一次的真实数据，也不要写入半截的空数据。
 */

import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { XMLParser } from 'fast-xml-parser'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SNAPSHOT_PATH = join(ROOT, 'src/data/snapshot.json')
const HISTORY_DIR = join(ROOT, 'src/data/snapshots')

const argv = process.argv.slice(2)
const SKIP_IMAGES = argv.includes('--skip-images')
const DAYS = Number(argv[argv.indexOf('--days') + 1]) || 7

const UA = 'ai-daily/0.1 (+https://github.com/; static daily digest builder)'

/**
 * 抓取普通网页时用浏览器 UA。
 * arXiv 官方要求带可识别的描述性 UA，所以 API 请求仍用上面的 UA；
 * 但很多新闻站点的 CDN 会对陌生 UA 直接返回 403 或空 head，
 * 用浏览器 UA 才能正确读到 og 元信息，这是抓取公开页面元数据的通行做法。
 */
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/* ------------------------------------------------------------------ 工具函数 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function request(url, { timeout = 20000, accept = '*/*', headers = {} } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: accept, ...headers },
    })
    return response
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJson(url, options) {
  const response = await request(url, { ...options, accept: 'application/json' })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

/**
 * 带退避的重试。arXiv 官方 API 是出了名的抖动，
 * 单个请求偶发超时属于常态，不该让整次同步失败。
 */
async function withRetry(label, attempts, task) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task()
    } catch (error) {
      lastError = error
      console.warn(`[sync] ${label} 第 ${attempt}/${attempts} 次失败：${error.message}`)
      if (attempt < attempts) await sleep(2000 * attempt)
    }
  }
  throw lastError
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  '#x27': "'",
}

function decodeEntities(input) {
  return String(input).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    if (ENTITIES[code]) return ENTITIES[code]
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16))
    }
    if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)))
    return match
  })
}

/** 逐字节解码为可用的纯文本：去换行、折叠空白、解码实体 */
function clean(input) {
  return decodeEntities(String(input ?? ''))
    .replace(/\s+/g, ' ')
    .trim()
}

const LOCAL_DAY = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

const LOCAL_TIME = (date) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

/* ------------------------------------------------------------ 期号与日期标签 */

/** 期号起点。期号 = 距起点的天数 + 1，Hero 与归档共用同一套算法，不会对不上。 */
const ISSUE_EPOCH = new Date('2025-01-01T00:00:00+08:00')

function issueOf(day) {
  const start = new Date(`${day}T00:00:00+08:00`).getTime()
  return String(Math.floor((start - ISSUE_EPOCH.getTime()) / 86_400_000) + 1).padStart(3, '0')
}

/** 手写月日标签，避免 Intl 在不同 ICU 数据下产出不一致的格式 */
function formatArchiveDate(day) {
  const [, month, date] = day.split('-')
  return `${month} 月 ${date} 日`
}

/** 读取已有历史快照，供归档复用；单份文件损坏不影响整次同步 */
async function readHistoryRecords() {
  const records = new Map()
  if (!existsSync(HISTORY_DIR)) return records
  const files = (await readdir(HISTORY_DIR)).filter((file) => file.endsWith('.json'))
  for (const file of files) {
    try {
      const record = JSON.parse(await readFile(join(HISTORY_DIR, file), 'utf8'))
      if (record?.targetDate) records.set(record.targetDate, record)
    } catch {
      console.warn(`[sync] 历史快照 ${file} 解析失败，已跳过`)
    }
  }
  return records
}

/* ------------------------------------------------------------ AI 相关性判定 */

const AI_PATTERN = new RegExp(
  [
    '\\bai\\b',
    '\\ba\\.i\\.',
    '\\bllms?\\b',
    '\\bgpt[- ]?[0-9o]',
    '\\bchatgpt\\b',
    '\\bclaude\\b',
    '\\bgemini\\b',
    '\\bopenai\\b',
    '\\banthropic\\b',
    '\\bdeepmind\\b',
    '\\bmistral\\b',
    '\\bllama\\b',
    '\\bqwen\\b',
    '\\bdeepseek\\b',
    '\\bgrok\\b',
    '\\bcopilot\\b',
    '\\btransformer(s)?\\b',
    '\\bneural\\b',
    '\\bmachine learning\\b',
    '\\bdeep learning\\b',
    '\\bdiffusion\\b',
    '\\bmidjourney\\b',
    '\\bstable diffusion\\b',
    '\\bembeddings?\\b',
    '\\bfine.?tun',
    '\\binference\\b',
    '\\bmultimodal\\b',
    '\\bquantiz',
    '\\bdistill',
    '\\brlhf\\b',
    '\\bai agent',
    '\\bagentic\\b',
    '\\bmodel context protocol\\b',
    '\\bmcp server',
    '\\bhugging ?face\\b',
    '\\bpytorch\\b',
    '\\btensorflow\\b',
    '\\bvllm\\b',
    '\\bollama\\b',
    '\\blangchain\\b',
    '\\bwhisper\\b',
    '\\bsora\\b',
    '\\b hallucinat',
    '\\btokenizer\\b',
    '\\bai (model|models|research|startup|company|chip|safety|news|tool|tools|assistant|video|image|voice|music|code)\\b',
    '\\b(gpu|cuda|tpu|nvidia)\\b',
  ].join('|'),
  'i',
)

const isAiRelated = (text) => AI_PATTERN.test(text)

/* -------------------------------------------------------------- 分类启发式 */

/**
 * 分类是按标题关键词做的**启发式判断**，不是人工标注。
 * 命中不到任何规则时归入「业界」，绝不硬塞进某个具体分类。
 * 规则顺序即优先级：安全 > 算力 > 开源 > 模型 > 应用 > 业界。
 */
/**
 * 分类是按标题关键词做的**启发式判断**，不是人工标注。
 * 命中不到任何规则时归入「业界」，绝不硬塞进某个具体分类。
 * 规则顺序即优先级：安全 > 算力 > 开源 > 模型 > 应用 > 业界。
 *
 * 词干后面统一带 \w* 做后缀通配：只写 \bhack\b 是匹配不到 hacking 的，
 * 早期版本就因为这个漏掉了「Hugging Face ... for hacking it」的安全属性。
 * 少数会误伤的词（如 ban 会匹配到 bandwidth）单独写全词形式。
 */
const CATEGORY_RULES = [
  ['安全', /\b(security|vulnerab\w*|jailbreak\w*|red.?team\w*|ai safety|misuse|watermark\w*|deepfake\w*|privacy|prompt injection|malware|fraud\w*|scam\w*|exploit\w*|leak\w*|hack\w*|kill switch|mandatory|regulat\w*|governance|complian\w*|bans?\b|banned|banning)/i],
  ['算力', /\b(gpu|cuda|tpu|nvidia|amd|silicon|chips?\b|data ?cent\w*|inference|cluster\w*|comput\w*|h100|b200|gb200|memory bandwidth|power\w*|energy|latenc\w*|throughput|hardware|fpga|asic|wafer\w*)/i],
  ['开源', /\b(open.?sourc\w*|open.?weight\w*|github|hugging ?face|apache|llama|qwen|mistral|deepseek|gemma|self.?host\w*|f-?droid|weights?\b)/i],
  ['模型', /\b(models?|modeling|llms?|gpt|claude|gemini|grok|transformer\w*|diffusion|multimodal|fine.?tun\w*|training|benchmark\w*|reasoning|embedding\w*|tokenizer|architectur\w*|quantiz\w*|distill\w*|context window|agents?\b|neural)/i],
  ['应用', /\b(apps?\b|product\w*|launch\w*|featur\w*|tools?\b|api\b|copilot|assistant\w*|chatbot\w*|enterprise|customer\w*|startup\w*|revenue|pricing|integrat\w*|workflow\w*|plugin\w*|design\w*|3d)/i],
]

function classify(text) {
  for (const [label, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) return label
  }
  return '业界'
}

/* ------------------------------------------------------------ 关键词提取 */

const STOPWORDS = new Set(
  (
    'a an the and or but if so no yes not for with from into out up down off on in at to of by as ' +
    'is are was were be been being am do does did done have has had having will would can could should ' +
    'may might must shall i me my we us our you your he him his she her it its they them their this that ' +
    'these those there here who whom which what when where why how all any both each few more most other ' +
    'some such than then too very just only also even still yet again once ever never always often ' +
    'about after before during under over above below between through against because while until ' +
    'one two three four five first last next per via vs etc de la le ' +
    'new now get got make made made use used using way ways day days week weeks year years today ' +
    'show ask tell launch launches launched release releases released update updates updated version ' +
    'announcing introducing need needs needed live live control controls still much many little less least ' +
    'says said tells told wants want wanted plans plan planned amid gets getting behind another others news ' +
    'back good great best better worse bad big small large long short high low ' +
    'ai a.i llm llms agent agents ' +
    'https http www com org net io html pdf hn '
  ).split(/\s+/).filter(Boolean),
)

/**
 * 关键词提取：已知实体 + 受控主题词表，而不是词频。
 *
 * 为什么不用词频：一天的 AI 头条在话题上高度分散，十几条标题之间几乎不会复用
 * 同一批实词。实测「跨文档重复」这个判据会一路退化到兜底分支，产出就在
 * 「bearish / billing / buys」和「Extended / Thinking / Chance」之间反复横跳，
 * 两种都是噪音。日报的关键词靠的是**显著性**，不是复现次数。
 *
 * 两个来源：
 *   1. 已知 AI 实体表，按文档权重计分；表外的大写词只有在跨两篇以上文档出现时
 *      才当作实体，用来捕捉表里的新名字。
 *   2. 受控主题词表，命中即计分，输出中文标签（面向中文读者）。
 *
 * 已知限制：主题词表是人工维护的，表外的新话题识别不到。
 * 要扩大覆盖面就改这两个表，而不是去调阈值。
 */
const KNOWN_ENTITIES = [
  'OpenAI', 'Anthropic', 'Google DeepMind', 'DeepMind', 'Google', 'Meta',
  'Microsoft', 'Nvidia', 'AMD', 'Intel', 'Apple', 'Amazon', 'Hugging Face',
  'GitHub', 'DeepSeek', 'Mistral', 'Qwen', 'Llama', 'Gemini', 'Claude',
  'ChatGPT', 'Sora', 'PyTorch', 'TensorFlow', 'LangChain', 'Ollama', 'vLLM',
  'arXiv',
]

const AI_TOPIC_TERMS = [
  ['智能体', /\bagents?\b|\bagentic\b/i],
  ['推理', /\breasoning\b|chain[- ]of[- ]thought/i],
  ['推理成本', /\binference\b|\blatency\b|\bthroughput\b/i],
  ['开源权重', /\bopen[- ]?weights?\b|\bopen[- ]?sourc\w*/i],
  ['微调', /\bfine[- ]?tun\w*/i],
  ['多模态', /\bmultimodal\b|\bvision[- ]language\b/i],
  ['扩散模型', /\bdiffusion\b/i],
  ['算力', /\bgpu\b|\bcuda\b|\btpu\b|\bchips?\b|\bhardware\b|\bdatacent\w*/i],
  ['评测基准', /\bbenchmark\w*|\bevals?\b|\bleaderboard\b/i],
  ['长上下文', /\bcontext window\b|\blong[- ]context\b/i],
  ['量化', /\bquantiz\w*/i],
  ['蒸馏', /\bdistill\w*/i],
  ['对齐', /\balign\w*|\brlhf\b|\bmisalign\w*/i],
  ['安全', /\bsafety\b|\bjailbreak\w*|\bwatermark\w*|\bred[- ]?team\w*|\bdeepfake\w*/i],
  ['监管', /\bregulat\w*|\bgovernance\b|\bcomplian\w*|\bpolicy\b|kill switch/i],
  ['检索增强', /\brag\b|\bretrieval\b|\bembedding\w*|\bvector (db|database)\b/i],
  ['训练', /\bpretrain\w*|\btraining\b/i],
  ['语音', /\bspeech\b|\bvoice\b|\btts\b/i],
  ['视频生成', /\bvideo generation\b|\btext[- ]to[- ]video\b/i],
  ['代码生成', /\bcopilot\b|\bcode (gen|assistant)\w*/i],
]

function extractKeywords(documents, limit = 7) {
  const entityScores = new Map()
  const topicScores = new Map()
  const looseEntities = new Map()

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  for (const doc of documents) {
    const weight = doc.weight ?? 1
    const text = String(doc.text ?? '')

    for (const [label, pattern] of AI_TOPIC_TERMS) {
      if (pattern.test(text)) topicScores.set(label, (topicScores.get(label) ?? 0) + weight)
    }

    for (const entity of KNOWN_ENTITIES) {
      if (!new RegExp(`\\b${escapeRegExp(entity)}\\b`, 'i').test(text)) continue
      entityScores.set(entity, (entityScores.get(entity) ?? 0) + weight)
    }

    // 表外实体：非句首的大写词。句首词的大写不算信号，标题首词永远是大写。
    const seenInDoc = new Set()
    ;(text.match(/[A-Za-z][A-Za-z0-9+.#'-]{2,}/g) ?? []).forEach((token, index) => {
      if (index === 0 || !/^[A-Z]/.test(token)) return
      const key = token.toLowerCase()
      if (key.length < 3 || STOPWORDS.has(key) || seenInDoc.has(key)) return
      seenInDoc.add(key)
      const entry = looseEntities.get(token) ?? { score: 0, docs: 0 }
      entry.score += weight
      entry.docs += 1
      looseEntities.set(token, entry)
    })
  }

  const entityQueue = [...entityScores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name)

  // 表外实体只保留跨两篇以上文档出现的，避免把论文标题里的
  // Social / Harness 这类普通大写词当成机构名
  for (const [form, entry] of [...looseEntities.entries()].sort(
    (a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]),
  )) {
    if (entry.docs >= 2) entityQueue.push(form)
  }

  const topicQueue = [...topicScores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label)

  // 实体优先（信号最强），主题补足，两者交替取样，避免某一类占满整个标签簇
  const result = []
  while (result.length < limit && (entityQueue.length > 0 || topicQueue.length > 0)) {
    if (entityQueue.length > 0) result.push(entityQueue.shift())
    if (result.length < limit && topicQueue.length > 0) result.push(topicQueue.shift())
  }

  return result
}

/* ------------------------------------------------------------ Hacker News */

/**
 * 拉取指定时间窗内的高分故事。
 * Algolia 的 query 是前缀匹配，用 "AI" 当关键词会匹配到 AirPods / aim 这类噪音，
 * 因此刻意**不带 query**，改为拉全量再在本地用 AI_PATTERN 过滤，准确率更高。
 */
async function fetchHackerNews({ since, until, minPoints, hitsPerPage = 400 }) {
  const filters = [`created_at_i>${since}`, `points>${minPoints}`]
  if (until) filters.push(`created_at_i<${until}`)

  const url =
    'https://hn.algolia.com/api/v1/search_by_date' +
    `?tags=story&numericFilters=${encodeURIComponent(filters.join(','))}` +
    `&hitsPerPage=${hitsPerPage}`

  const data = await fetchJson(url)
  return (data.hits ?? []).map((hit) => ({
    id: hit.objectID,
    title: clean(hit.title),
    url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
    discussionUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    points: hit.points ?? 0,
    comments: hit.num_comments ?? 0,
    author: hit.author ?? '',
    createdAt: new Date(hit.created_at_i * 1000),
    source: hit.url ? safeHostname(hit.url) : 'news.ycombinator.com',
  }))
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'news.ycombinator.com'
  }
}

/* ----------------------------------------------------------------- arXiv */

const ARXIV_CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL']
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  trimValues: true,
})

function arxivQueryUrl(maxResults, day = null) {
  const categories = `(${ARXIV_CATEGORIES.map((c) => `cat:${c}`).join(' OR ')})`
  const query = day
    ? `${categories} AND submittedDate:[${arxivStamp(day)} TO ${arxivStamp(day, true)}]`
    : categories
  const encoded = encodeURIComponent(query).replace(/%20/g, '+')
  return (
    'http://export.arxiv.org/api/query' +
    `?search_query=${encoded}` +
    `&start=0&max_results=${maxResults}` +
    '&sortBy=submittedDate&sortOrder=descending'
  )
}

/** 把 YYYY-MM-DD 变成 arXiv 需要的 YYYYMMDDHHMM 边界 */
const arxivStamp = (day, end = false) => `${day.replace(/-/g, '')}${end ? '2359' : '0000'}`

/**
 * 拉取 arXiv。day 传 null 表示「不限日期，直接取最新一批提交」，
 * 这是当日论文列表要用的模式：arXiv 的发布有固定节奏，
 * 若按「本地当天」过滤，早上生成的日报会几乎抓不到论文。
 */
async function fetchArxiv({ maxResults, day = null }) {
  const url = arxivQueryUrl(maxResults, day)
  const response = await request(url, { accept: 'application/atom+xml', timeout: 45000 })
  if (!response.ok) throw new Error(`arXiv HTTP ${response.status}`)

  const xml = await response.text()
  const feed = parser.parse(xml)?.feed ?? {}
  const totalRaw = feed['opensearch:totalResults']
  const totalValue =
    totalRaw && typeof totalRaw === 'object' ? totalRaw['#text'] : totalRaw
  const total = Number(totalValue ?? 0)
  const rawEntries = feed.entry ? (Array.isArray(feed.entry) ? feed.entry : [feed.entry]) : []

  const entries = rawEntries.map((entry) => {
    const absUrl = String(entry.id ?? '')
    const arxivId = absUrl.split('/abs/')[1] ?? ''
    const categories = entry.category
      ? (Array.isArray(entry.category) ? entry.category : [entry.category])
          .map((c) => c?.['@term'])
          .filter(Boolean)
      : []
    const authors = entry.author
      ? (Array.isArray(entry.author) ? entry.author : [entry.author])
          .map((a) => clean(a?.name))
          .filter(Boolean)
      : []

    return {
      id: arxivId || clean(entry.title),
      arxivId: arxivId.replace(/v\d+$/, ''),
      title: clean(entry.title),
      abstract: clean(entry.summary),
      url: absUrl || `https://arxiv.org/abs/${arxivId}`,
      published: entry.published ? new Date(entry.published) : new Date(),
      categories,
      authors,
    }
  })

  return { total: Number.isFinite(total) ? total : entries.length, entries }
}

/* ---------------------------------------------------------------- GitHub */

/**
 * 拉取热门 AI 开源仓库。
 *
 * 查询语法上的两个坑（实测）：
 *   - GitHub 搜索**不支持**裸 `OR`，会直接返回 422；
 *   - 带括号的 OR 虽然返回 200，但会静默匹配到 0 条结果。
 * 多个 topic 的正确写法是**逗号分隔**，语义是「或」。
 *
 * 加上 pushed 时间窗，保证列出来的是当前仍在维护的项目，
 * 而不是一堆早已停更的历史仓库。
 */
async function fetchGitHubRepos(limit = 6) {
  const headers = {}
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const pushedSince = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  const query =
    'topic:llm,artificial-intelligence,generative-ai,machine-learning ' +
    `stars:>1500 pushed:>${pushedSince}`

  const url =
    'https://api.github.com/search/repositories' +
    `?q=${encodeURIComponent(query)}` +
    '&sort=stars&order=desc' +
    `&per_page=${limit}`

  const data = await fetchJson(url, { headers, accept: 'application/vnd.github+json' })
  return (data.items ?? []).map((item) => ({
    id: item.full_name,
    owner: item.owner?.login ?? item.full_name.split('/')[0],
    name: item.name,
    description: clean(item.description ?? ''),
    stars: item.stargazers_count ?? 0,
    forks: item.forks_count ?? 0,
    language: item.language ?? 'Other',
    url: item.html_url,
    pushedAt: item.pushed_at ? new Date(item.pushed_at) : null,
  }))
}

/* ------------------------------------------------ 文章配图与摘要（Open Graph） */

function metaTagContent(html, names) {
  for (const name of names) {
    const tagPattern = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${name}["'][^>]*>`,
      'i',
    )
    const tag = html.match(tagPattern)?.[0]
    if (!tag) continue
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]
    const value = content ? clean(content) : ''
    if (value) return value
  }
  return ''
}

function linkRelHref(html, rel) {
  const tagPattern = new RegExp(`<link[^>]+rel\\s*=\\s*["']${rel}["'][^>]*>`, 'i')
  const tag = html.match(tagPattern)?.[0]
  const href = tag?.match(/href\s*=\s*["']([^"']*)["']/i)?.[1]
  return href ? clean(href) : ''
}

/**
 * 抓取目标页面的 og:image 与 og:description。
 * 只读前 320KB（meta 一定在 head 里），超时就放弃。
 * 抓不到就返回空，由前端落到设计好的占位槽，绝不伪造配图。
 */
async function fetchPageMeta(url) {
  try {
    const response = await request(url, {
      timeout: 9000,
      accept: 'text/html,application/xhtml+xml',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
      },
    })
    if (!response.ok) return { image: '', description: '' }
    if (!(response.headers.get('content-type') ?? '').includes('html')) {
      return { image: '', description: '' }
    }

    const reader = response.body?.getReader()
    let html = ''
    if (reader) {
      const decoder = new TextDecoder('utf-8')
      let received = 0
      while (received < 320_000) {
        const { done, value } = await reader.read()
        if (done) break
        received += value.byteLength
        html += decoder.decode(value, { stream: true })
        if (html.includes('</head>')) break
      }
      await reader.cancel().catch(() => {})
    } else {
      html = (await response.text()).slice(0, 320_000)
    }

    let image = metaTagContent(html, [
      'og:image:secure_url',
      'og:image:url',
      'og:image',
      'twitter:image',
      'twitter:image:src',
      'image',
    ])

    if (!image) image = linkRelHref(html, 'image_src')

    if (image && !image.startsWith('data:')) {
      try {
        image = new URL(image, url).href
      } catch {
        image = ''
      }
      if (!image.startsWith('https://') && !image.startsWith('http://')) image = ''
    } else {
      image = ''
    }

    const description = metaTagContent(html, [
      'og:description',
      'twitter:description',
      'description',
    ])

    return { image, description: description.slice(0, 400) }
  } catch {
    return { image: '', description: '' }
  }
}

/** 限定并发地跑异步任务，避免一次性打出去几十个请求 */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

/* ---------------------------------------------------------------- 主流程 */

const HISTORY_LIMIT = 14

async function readPreviousSnapshot() {
  if (!existsSync(SNAPSHOT_PATH)) return null
  try {
    return JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  const now = new Date()
  const today = LOCAL_DAY(now)
  console.log(`[sync] 开始同步 目标日期 ${today}（归档窗口 ${DAYS} 天）`)

  await mkdir(dirname(SNAPSHOT_PATH), { recursive: true })
  await mkdir(HISTORY_DIR, { recursive: true })

  const previous = await readPreviousSnapshot()

  /**
   * 按数据源降级。
   *
   * 为什么需要它：GitHub 匿名限流是 60 次/小时（搜索接口 10 次/分钟），
   * arXiv 也会偶发 429。如果任一上游抖动就让整个同步失败，日报就停更了。
   * 这里改为「单个源失败则沿用上一次成功的数据」，并把降级状态写进快照，
   * 让页面能如实说明哪一块是旧数据。
   *
   * 只有三个源**全部**失败、且没有任何历史数据可沿用，才会真正失败退出。
   */
  const degraded = []
  async function source(label, loader, fallback) {
    try {
      const value = await loader()
      if (value === null || value === undefined) throw new Error('返回空结果')
      return value
    } catch (error) {
      console.warn(`[sync] ${label} 拉取失败，改用上次成功的数据：${error.message}`)
      degraded.push(label)
      return fallback
    }
  }

  /* --- 1. 当日新闻 --- */
  // 刻意用「滚动 24 小时」而不是「本地自然日」：日报通常在早上生成，
  // 若按自然日过滤，早上跑出来只有几条，日报的清晨版本会瘦得没法看。
  const NEWS_WINDOW_HOURS = 24
  const newsSince = Math.floor((now.getTime() - NEWS_WINDOW_HOURS * 3_600_000) / 1000)
  const TOP_NEWS = 11
  const PAPER_COUNT = 4
  const REPO_COUNT = 6
  let candidatesToday = 0

  console.log('[sync] 拉取 Hacker News 过去 24 小时高分故事 ...')
  const news = await source(
    'news',
    async () => {
      const recent = await withRetry('HN 当日', 3, () =>
        fetchHackerNews({ since: newsSince, minPoints: 20, hitsPerPage: 600 }),
      )
      const aiStories = recent
        .filter((story) => story.title && isAiRelated(story.title))
        .sort((a, b) => b.points - a.points)
      console.log(
        `[sync] HN 窗口内故事 ${recent.length} 条，其中 AI 相关 ${aiStories.length} 条`,
      )
      if (aiStories.length === 0) throw new Error('窗口内没有 AI 相关故事')
      candidatesToday = aiStories.length

      const chosen = aiStories.slice(0, TOP_NEWS)

      if (SKIP_IMAGES) {
        console.log('[sync] 已跳过配图抓取')
      } else {
        console.log(`[sync] 抓取 ${chosen.length} 条新闻的 Open Graph 元信息 ...`)
      }
      const metas = SKIP_IMAGES
        ? chosen.map(() => ({ image: '', description: '' }))
        : await mapWithConcurrency(chosen, 5, (story) => fetchPageMeta(story.url))
      console.log(
        `[sync] 配图命中 ${metas.filter((m) => m.image).length}/${chosen.length}，未命中的将落到占位槽`,
      )

      return chosen.map((story, index) => ({
        id: `hn-${story.id}`,
        category: classify(story.title),
        title: story.title,
        // 抓不到真实摘要时留空，由前端隐藏摘要行，不编造内容
        summary: metas[index]?.description ?? '',
        source: story.source,
        url: story.discussionUrl,
        articleUrl: story.url,
        image: metas[index]?.image ?? '',
        publishedAt: story.createdAt.toISOString(),
        time: LOCAL_TIME(story.createdAt),
        points: story.points,
        comments: story.comments,
      }))
    },
    previous?.today?.news ?? [],
  )

  /* --- 2. 最新论文 --- */
  console.log('[sync] 拉取 arXiv 最新提交 ...')
  const papers = await source(
    'papers',
    async () => {
      const latest = await withRetry('arXiv latest', 3, () => fetchArxiv({ maxResults: 12 }))
      if (latest.entries.length === 0) throw new Error('arXiv 返回 0 篇')
      console.log(
        `[sync] arXiv 取回 ${latest.entries.length} 篇，采用前 ${Math.min(PAPER_COUNT, latest.entries.length)} 篇`,
      )

      return latest.entries.slice(0, PAPER_COUNT).map((entry, index) => ({
        id: `arxiv-${entry.arxivId}`,
        index: String(index + 1).padStart(2, '0'),
        title: entry.title,
        abstract: entry.abstract,
        arxivId: entry.arxivId,
        url: entry.url,
        topics: entry.categories
          .filter((category) => category.startsWith('cs.'))
          .slice(0, 3)
          .map((category) => category.replace('cs.', '')),
        authors: entry.authors.slice(0, 3),
        authorCount: entry.authors.length,
        submittedAt: `${LOCAL_TIME(entry.published)} 提交`,
      }))
    },
    previous?.today?.papers ?? [],
  )

  /* --- 3. 开源项目 --- */
  console.log('[sync] 拉取 GitHub 热门 AI 仓库 ...')
  const previousStars = new Map(
    (previous?.today?.repos ?? []).map((repo) => [repo.id, repo.stars]),
  )

  const repos = await source(
    'repos',
    async () => {
      const fetched = await withRetry('GitHub', 2, () => fetchGitHubRepos(REPO_COUNT))
      if (fetched.length === 0) throw new Error('GitHub 返回 0 个仓库')
      return fetched.map((repo) => {
        const before = previousStars.get(repo.id)
        return {
          ...repo,
          // 只有和上一次真实快照对比过，才敢给出 star 增量；首次运行为 null
          deltaStars: typeof before === 'number' ? Math.max(0, repo.stars - before) : null,
        }
      })
    },
    previous?.today?.repos ?? [],
  )

  // 三个源同时不可用，且没有历史数据可沿用：宁可不发布，也不写空快照
  if (news.length === 0 && papers.length === 0 && repos.length === 0) {
    throw new Error('全部数据源均失败且没有可沿用的历史数据')
  }

  /* --- 5. 归档：往期日报 ---
     归档按**已完整的本地自然日**排列，锚点是上海时区的当天零点，
     而不是当日新闻用的滚动 24 小时窗口。

     数据来源优先级：
       1. 真实历史快照（src/data/snapshots/*.json），即当天真正发过的那期日报；
       2. 没有快照的日期才用 HN 回填，且只回填确实拿得到的字段。
     拿不到的值一律写 null，由前端整项隐藏。
     早期版本在这里对 arXiv 逐日发请求：会被 429 限流，而且我把失败写成了
     papers: 0，等于对外宣称「那天没有论文」，那是在产出假数据。已彻底移除。 */
  const archiveAnchor = new Date(`${today}T00:00:00+08:00`)
  const archiveDays = []
  for (let offset = 1; offset < DAYS; offset += 1) {
    archiveDays.push(LOCAL_DAY(new Date(archiveAnchor.getTime() - offset * 86_400_000)))
  }

  const historyRecords = await readHistoryRecords()
  const missingDays = archiveDays.filter((day) => !historyRecords.has(day))
  console.log(
    `[sync] 构建 ${archiveDays.length} 天归档（命中历史快照 ${archiveDays.length - missingDays.length} 天，需 HN 回填 ${missingDays.length} 天）`,
  )

  const backfillByDay = new Map()
  if (missingDays.length > 0) {
    const results = await mapWithConcurrency(missingDays, 4, async (day) => {
      const start = new Date(`${day}T00:00:00+08:00`)
      const end = new Date(start.getTime() + 86_400_000)
      try {
        const stories = await withRetry(`HN ${day}`, 2, () =>
          fetchHackerNews({
            since: Math.floor(start.getTime() / 1000),
            until: Math.floor(end.getTime() / 1000),
            minPoints: 40,
            hitsPerPage: 400,
          }),
        )
        const ai = stories.filter((s) => s.title && isAiRelated(s.title))
        return { day, stories: ai, ok: true }
      } catch (error) {
        console.warn(`[sync] HN ${day} 回填失败：${error.message}`)
        return { day, stories: [], ok: false }
      }
    })
    for (const result of results) backfillByDay.set(result.day, result)
  }

  const archive = archiveDays.map((day) => {
    const record = historyRecords.get(day)
    if (record) {
      return { ...record, id: `archive-${day}`, date: day, url: '#archive', kind: 'issue' }
    }

    const backfill = backfillByDay.get(day)
    const stories = backfill?.stories ?? []
    return {
      id: `archive-${day}`,
      date: day,
      issue: issueOf(day),
      dateLabel: formatArchiveDate(day),
      headline: stories[0]
        ? stories[0].title
        : backfill?.ok
          ? '当日没有达到阈值的高分 AI 讨论'
          : '该日数据未能取回',
      highlights: extractKeywords(
        stories.map((story) => ({ text: story.title, weight: 1 })),
        3,
      ),
      // news 拿不到时同样写 null，不写 0
      counts: {
        news: backfill?.ok ? stories.length : null,
        papers: null,
        repos: null,
      },
      url: '#archive',
      kind: 'backfill',
    }
  })

  /* --- 6. 关键词与计数 ---
     新闻标题权重 3、新闻摘要权重 1、论文标题权重 2。
     论文摘要刻意排除：它们又长又共享大量学术泛词，会把泛词推上关键词榜。 */
  const keywords = extractKeywords(
    [
      ...news.map((item) => ({ text: item.title, weight: 3 })),
      ...news.map((item) => ({ text: item.summary, weight: 1 })),
      ...papers.map((item) => ({ text: item.title, weight: 2 })),
    ],
    7,
  )

  const snapshot = {
    generatedAt: now.toISOString(),
    generatedAtLabel: `${today} ${LOCAL_TIME(now)}`,
    targetDate: today,
    issue: issueOf(today),
    dateLabel: formatArchiveDate(today),
    timezone: 'Asia/Shanghai',
    window: {
      newsHours: NEWS_WINDOW_HOURS,
      newsLabel: `过去 ${NEWS_WINDOW_HOURS} 小时`,
      archiveDays: archive.length,
    },
    sources: {
      news: 'Hacker News（Algolia 检索 API）',
      papers: `arXiv 官方 API（${ARXIV_CATEGORIES.join(' / ')}）`,
      repos: 'GitHub Search API',
    },
    today: {
      news,
      papers,
      repos,
      keywords,
    },
    archive,
    // 降级状态如实写进快照，页面可以据此说明哪一块沿用了旧数据
    degraded: {
      sources: degraded,
      isPartial: degraded.length > 0,
      previousGeneratedAt: degraded.length > 0 ? (previous?.generatedAt ?? null) : null,
    },
    counts: {
      news: news.length,
      papers: papers.length,
      repos: repos.length,
      keywords: keywords.length,
      candidatesToday,
    },
  }

  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')

  // 历史记录只保留归档需要的字段，作为「这一期日报确实发过什么」的凭据
  await writeFile(
    join(HISTORY_DIR, `${today}.json`),
    `${JSON.stringify(
      {
        targetDate: today,
        issue: snapshot.issue,
        dateLabel: snapshot.dateLabel,
        headline: news[0]?.title ?? '今日暂无达到阈值的高分 AI 讨论',
        highlights: keywords.slice(0, 3),
        counts: {
          news: news.length,
          papers: papers.length,
          repos: repos.length,
        },
        generatedAt: snapshot.generatedAt,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  // 只保留最近若干份历史文件
  const historyFiles = (await readdir(HISTORY_DIR)).filter((f) => f.endsWith('.json')).sort()
  for (const stale of historyFiles.slice(0, Math.max(0, historyFiles.length - HISTORY_LIMIT))) {
    const { rm } = await import('node:fs/promises')
    await rm(join(HISTORY_DIR, stale), { force: true })
  }

  console.log('\n[sync] 完成')
  console.log(`  快照    ${SNAPSHOT_PATH}`)
  console.log(`  热点    ${news.length} 条`)
  console.log(`  论文    ${papers.length} 篇（arXiv 最新提交）`)
  console.log(`  开源    ${repos.length} 个`)
  console.log(`  归档    ${archive.length} 天`)
  console.log(`  关键词  ${keywords.join(' / ') || '（无）'}`)
  console.log(`  配图    ${news.filter((n) => n.image).length}/${news.length}`)
  if (degraded.length > 0) {
    console.log(`  ⚠ 降级   ${degraded.join(', ')} 沿用了上次成功的数据`)
  }
}

main().catch((error) => {
  console.error(`\n[sync] 同步失败，已保留原有快照：${error.message}`)
  console.error(error.stack)
  process.exit(1)
})
