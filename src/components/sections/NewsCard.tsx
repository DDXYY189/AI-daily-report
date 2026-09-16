import { motion, useReducedMotion } from 'motion/react'
import { ArrowUp, MessageSquare } from 'lucide-react'
import { SmartImage } from '../ui/SmartImage'
import { Tag } from '../ui/Tag'
import { EASE_OUT } from '../../lib/motion'
import type { NewsItem } from '../../data/digest'

/**
 * 今日速递卡片。真实数据接入后的三个处理：
 *
 * 1. **主链接指向原文**，Hacker News 讨论页作为次要链接单独给出。
 *    整卡可点是用「拉伸伪元素」实现的（标题 <a> 上的 after:inset-0），
 *    而不是把整张卡片包成 <a>，否则讨论链接就会变成非法的嵌套 <a>。
 *    讨论链接靠 z-10 压在拉伸层之上，仍然可独立点击。
 *
 * 2. **没有摘要就不渲染摘要行**，不拿「N 赞 M 评论」之类去填位。
 *
 * 3. **没有配图就不渲染图片块**，而不是塞一个灰占位框：
 *    抓取失败是常态，混排的 bento 反而更有节奏，也比一排占位框体面。
 */
export function NewsCard({
  item,
  featured = false,
  className = '',
}: {
  item: NewsItem
  featured?: boolean
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-panel border border-line bg-surface transition-colors duration-300 hover:border-line-2 ${className}`}
    >
      {item.image && (
        <SmartImage
          src={item.image}
          alt={item.title}
          eager={featured}
          className={featured ? 'h-[240px] lg:h-[340px]' : 'h-[168px]'}
        />
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3">
          <Tag tone="accent">{item.category}</Tag>
          <span className="font-mono text-xs text-fg-dim">{item.time}</span>
        </div>

        <h3
          className={`mt-4 font-semibold text-fg ${
            featured ? 'text-xl leading-snug lg:text-2xl' : 'text-base leading-snug'
          }`}
        >
          <a
            href={item.articleUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors duration-200 after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
          >
            {item.title}
          </a>
        </h3>

        {item.summary && (
          <p
            className={`mt-3 text-sm leading-relaxed text-fg-muted ${
              featured ? 'line-clamp-3' : 'line-clamp-2'
            }`}
          >
            {item.summary}
          </p>
        )}

        <div className="mt-auto flex items-center gap-4 pt-5 text-xs text-fg-dim">
          <span className="truncate">{item.source}</span>

          <span className="inline-flex shrink-0 items-center gap-1">
            <ArrowUp size={12} strokeWidth={1.8} aria-hidden="true" />
            <span className="font-mono">{item.points}</span>
            <span className="sr-only">赞同</span>
          </span>

          <span className="inline-flex shrink-0 items-center gap-1">
            <MessageSquare size={12} strokeWidth={1.8} aria-hidden="true" />
            <span className="font-mono">{item.comments}</span>
            <span className="sr-only">条评论</span>
          </span>

          <a
            href={item.discussionUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="relative z-10 ml-auto shrink-0 transition-colors duration-200 hover:text-accent"
          >
            讨论
          </a>
        </div>
      </div>
    </motion.article>
  )
}
