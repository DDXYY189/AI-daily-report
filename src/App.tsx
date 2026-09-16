import { Nav } from './components/layout/Nav'
import { Hero } from './components/hero/Hero'
import { TodayDigest } from './components/sections/TodayDigest'
import { Papers } from './components/sections/Papers'
import { OpenSource } from './components/sections/OpenSource'
import { Archive } from './components/sections/Archive'
import { SiteFooter } from './components/footer/SiteFooter'

/**
 * 页面结构。六个区块用的是六种不同的版式家族，避免整页读起来是同一种版式重复：
 *   Hero        非对称分栏 + 全屏流体背景
 *   今日速递    非对称 bento 网格（图片主导）
 *   论文速递    整幅账簿式行列表（无卡片容器）
 *   开源项目    等宽数据卡片网格（无图片）
 *   归档历史    纵向时间线
 *   底部        整屏收尾 + 页脚分栏
 *
 * 底色节奏：分区**交替使用两档底色**，而不是整页一块平黑。
 *   Hero(自身场景) → 今日速递 void → 论文速递 abyss → 开源 void → 归档 abyss → 页脚 void
 * 两档相差约 2.4 个 CIE L*（9.25 与 11.69），是很轻的一步，
 * 目的是让长页面向下有层次，而不是靠提亮正文区域去解决「显得太黑」。
 * 注意每个改过底色的分区都必须显式声明，否则会露出上一分区的颜色。
 */
export default function App() {
  return (
    <div className="min-h-[100dvh] bg-void">
      <a
        href="#today"
        className="sr-only rounded-control bg-accent px-4 py-2 text-sm font-medium text-void focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60]"
      >
        跳到主要内容
      </a>

      <Nav />

      <main>
        <Hero />
        <TodayDigest />
        <Papers />
        <OpenSource />
        <Archive />
      </main>

      <SiteFooter />
    </div>
  )
}
