/**
 * 骨架微光。
 *
 * 用在真正存在异步等待的地方：图片加载（见 SmartImage）。
 * 这里刻意**不再**提供「今日速递卡片骨架 + 模拟请求延迟」那套东西：
 * 数据是构建期快照，进页面时就已经在包里了，人为延迟 420ms 再显示骨架
 * 只是表演，还会把 LCP 推后。没有真实等待就不做加载态。
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-shimmer bg-line-2 ${className}`}
    />
  )
}
