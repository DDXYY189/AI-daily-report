import {
  issueNumber,
  news,
  newsWindowLabel,
  papers,
  repos,
  syncTimeLabel,
  todayKeywords,
  todayLabel,
} from '../../data/digest'

const ROWS = [
  { label: '行业热点', value: news.length },
  { label: '最新论文', value: papers.length },
  { label: '开源项目', value: repos.length },
  { label: '今日关键词', value: todayKeywords.length },
] as const

/**
 * Hero 右侧的「今日刊头」数据面板。
 *
 * 这是功能性内容，不是装饰文案：期号、日期、统计窗口、快照生成时刻、当天条目量
 * 全部来自真实快照。窗口与更新时刻必须写出来，
 * 否则「今日速递」到底是自然日还是滚动 24 小时、数据有多新，读者无从判断。
 *
 * 面板里的文字一律用 fg-muted 或更亮，**不要用 fg-dim**：
 * 面板是半透明的玻璃，下方就是纤维场，发光带最亮时 fg-dim 压在面板上只有 3.17:1，
 * 低于 WCAG AA。fg-muted 在同一位置是 5.58:1（玻璃 alpha 提到 0.72 之后）。
 */
export function IssuePanel() {
  return (
    <div className="glass-panel w-full rounded-panel border border-line p-6 lg:p-7">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-fg-muted">期号</span>
        <span className="font-mono text-[2.25rem] leading-none text-fg">
          {issueNumber}
        </span>
      </div>

      <p className="mt-3 text-sm text-fg-muted">{todayLabel}</p>
      <p className="mt-1.5 font-mono text-xs text-fg-muted">
        {newsWindowLabel} · 快照 {syncTimeLabel}
      </p>

      <dl className="mt-7 divide-y divide-line border-t border-line">
        {ROWS.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-3">
            <dt className="text-sm text-fg-muted">{row.label}</dt>
            <dd className="font-mono text-sm text-fg">
              {String(row.value).padStart(2, '0')}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
