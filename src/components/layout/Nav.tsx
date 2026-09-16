import { useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Menu, X, ArrowUpRight } from 'lucide-react'
import { Container } from '../layout/Container'
import { Button } from '../ui/Button'
import { EASE_OUT } from '../../lib/motion'

const LINKS = [
  { label: '今日速递', href: '#today' },
  { label: '论文速递', href: '#papers' },
  { label: '开源项目', href: '#repos' },
  { label: '归档历史', href: '#archive' },
] as const

/**
 * 顶部导航。
 * - 高度 68px，低于 80px 上限，桌面端始终单行（中文标签精简到 4 项）
 * - 滚动后切换为毛玻璃 + 发丝线，用状态反馈把导航与内容分层
 * - 滚动位置用 Motion 的 useScroll 读取，不挂 window scroll 监听
 */
export function Nav() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    // React 对相同 state 会跳过重渲染，这里无需额外比较
    setScrolled(latest > 24)
  })

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-[68px] transition-colors duration-300 ${
        scrolled ? 'glass-panel border-b border-line' : 'border-b border-transparent'
      }`}
    >
      <Container className="flex h-full items-center justify-between gap-8">
        <a
          href="#top"
          className="shrink-0 text-[1.0625rem] font-semibold tracking-tight text-fg"
        >
          AI 日报
        </a>

        <nav aria-label="主导航" className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-fg-muted transition-colors duration-200 hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            href="#subscribe"
            variant="ghost"
            className="hidden sm:inline-flex"
            iconRight={<ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />}
          >
            订阅今日日报
          </Button>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-line-2 text-fg-muted transition-colors duration-200 hover:text-fg lg:hidden"
          >
            {menuOpen ? (
              <X size={18} strokeWidth={1.6} aria-hidden="true" />
            ) : (
              <Menu size={18} strokeWidth={1.6} aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="glass-panel border-b border-line lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-control px-2 py-3 text-sm text-fg-muted transition-colors duration-200 hover:bg-surface-2 hover:text-fg"
                >
                  {link.label}
                </a>
              ))}
              <Button
                href="#subscribe"
                className="mt-2 w-full"
                iconRight={
                  <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />
                }
              >
                订阅今日日报
              </Button>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
