import { ArrowUpRight } from 'lucide-react'

/**
 * 分区标题。
 * 版式规则：分区标题一律**纵向堆叠**在内容之上，不使用
 * 「左侧大标题 + 右侧小解释段」的 Split-Header 写法；
 * 右侧只允许出现一个功能性动作链接（导航，不是解释文案）。
 * 顶部一条发丝线承担分节节奏，替代卡片容器。
 */
export function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6 lg:pt-8">
      <h2 className="text-2xl font-semibold text-fg lg:text-[2rem]">{title}</h2>

      {action && (
        <a
          href={action.href}
          className="group inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-fg-muted transition-colors duration-200 hover:text-accent"
          {...(action.href.startsWith('http')
            ? { target: '_blank', rel: 'noreferrer noopener' }
            : {})}
        >
          {action.label}
          <ArrowUpRight
            size={14}
            strokeWidth={1.6}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </a>
      )}
    </div>
  )
}
