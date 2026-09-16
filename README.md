# AI 日报

每天汇总 AI 行业新闻、技术进展、论文速递与开源项目动态的单页站点。
暗色冷色调，PC 优先，版心 1700px。

内容来自真实数据源（Hacker News / arXiv / GitHub），由脚本在构建前拉取并固化为快照。

> **一句话理解这个项目：** 一个每天生成一次的静态站点。
> 页面内容**不是访客实时抓取**的，而是由 `scripts/sync-data.mjs` 提前拉取、筛选、
> 写进 `src/data/snapshot.json`。所以它没有后端、没有数据库、没有运行时 API 调用。

## 技术栈

| | |
|---|---|
| 框架 | React 19 + Vite 8（TypeScript，纯 CSR，无 SSR）|
| 样式 | Tailwind CSS v4（CSS-first，设计令牌集中在 `src/index.css`）|
| 动画 | Motion（UI 动效）· GSAP + ScrollTrigger（描边文字）· ogl（WebGL 背景）|
| 图标 | Lucide React |
| 字体 | Geist / Geist Mono（npm 自托管）＋ 系统 CJK 字体栈 |
| 内容 | 构建期快照 |

## 快速开始

环境要求：**Node.js `^20.19.0 || >=22.12.0`**（Vite 8 的要求，取自其 `engines` 字段）。
本项目在 Node 24 上开发。

```bash
npm install
npm run dev        # 开发服务器 http://127.0.0.1:5273
npm run build      # 生产构建到 dist/
npm run preview    # 预览构建产物
npm run typecheck  # 类型检查
```

| 数据相关命令 | 作用 |
|---|---|
| `npm run sync-data` | 拉取真实数据并重写快照（约 30 到 60 秒）|
| `npm run sync-data:fast` | 同上，跳过文章配图抓取 |
| `node scripts/sync-data.mjs --days 14` | 自定义归档窗口天数（默认 7）|

> **Windows PowerShell 用户：** 若 `npm` 被执行策略拦下（提示 `npm.ps1` 无法加载），
> 改用 `npm.cmd run dev`，或换用 cmd / Git Bash。

## 数据

### 来源

| 板块 | 来源 | 抓取内容 |
|---|---|---|
| 今日速递 | Hacker News（Algolia 检索 API）| 过去 24 小时的高分 AI 故事，按赞同数排序 |
| 论文速递 | arXiv 官方 API | `cs.AI` / `cs.LG` / `cs.CL` 的最新提交 |
| 开源项目 | GitHub Search API | 近 7 天有推送、star 最高的 AI 仓库 |
| 配图与摘要 | 原文页面的 Open Graph 元信息 | 抓不到就留空，由前端降级 |
| 归档历史 | 历史快照 + Hacker News 回填 | 往期真实发过的内容 |

`src/data/snapshot.json` 与 `src/data/snapshots/` 是**站点内容**，需要提交到版本库。
设置 `GITHUB_TOKEN` 环境变量可提高 GitHub 接口的限流额度。

### 为什么用构建期快照，而不是前端实时请求

1. arXiv 官方 API **不返回 CORS 响应头**，浏览器端根本无法直连；
2. GitHub 匿名调用限流 60 次/小时，若由访客浏览器发起，站点很快会被打死；
3. 日报本身就是「每天生成一次」的产品形态，内容应当固化，而不是每个访客各拉一遍。

### 数据质量的硬约定

- **拿不到就是空，绝不填假值。** 抓不到摘要就不渲染摘要行；抓不到配图就不渲染图片块；
  归档里没取到的计数写 `null` 并由 UI 整项隐藏，而不是写 `0` 冒充「当天没有论文」。
- **单个数据源失败不会停更。** 某源不可用时沿用上一次成功的数据，并在页脚如实标注降级
  状态；只有三个源全部失败且没有历史数据可沿用，同步才会失败退出。
- **分类是启发式的。** `category` 由脚本按标题关键词判定（规则见
  `scripts/sync-data.mjs` 的 `CATEGORY_RULES`），命中不到归入「业界」。它不是人工标注。
- **关键词来自受控词表**（`KNOWN_ENTITIES` / `AI_TOPIC_TERMS`），表外的新话题识别不到。
  要扩大覆盖面就改这两个表。
- **归档有两种来源。** 有历史快照的日期是当期实际发布的内容；没有快照的日期由
  Hacker News 回填，只包含确实取到的字段，所以显示的计数更少。
- **标题保留原文语言。** 数据源以英文为主，站点界面是中文，不做机器翻译。

## 项目结构

```
scripts/sync-data.mjs        数据同步脚本（唯一产出内容的入口）
src/data/snapshot.json       生成的内容快照
src/data/snapshots/          历史快照，归档板块的数据来源
src/data/digest.ts           适配层：把快照映射成组件要用的形状
src/index.css                设计令牌：颜色 / 圆角 / 字体 / 关键帧
src/components/
  layout/    Container(1700px) · Nav · SectionHeader · CursorGlow(指针光轨开关)
  hero/      Hero · HeroBackdrop(背景总装) · GhostFibers(纤维场) · FluidBackdrop(CSS 兜底) · IssuePanel
  sections/  TodayDigest(bento) · NewsCard · Papers · OpenSource · Archive
  footer/    SiteFooter(整屏收尾，内含描边字标) · SubscribeForm(四态)
  ui/        Button · Tag · Skeleton · SmartImage · Reveal · StrokeText · GlowCursor
```

## 架构

### 页面分区与版式

六个分区刻意使用六种不同的版式家族，避免整页读起来是同一套版式重复：

| 分区 | 版式 |
|---|---|
| Hero | 非对称分栏 + 全屏 WebGL 背景 |
| 今日速递 | 非对称 bento 网格（图片主导）|
| 论文速递 | 整幅账簿式行列表（无卡片容器）|
| 开源项目 | 等宽数据卡片网格（无图片）|
| 归档历史 | 纵向时间线 |
| 底部 | 整屏收尾 + 页脚分栏 |

底色在两档之间交替（`void` / `abyss`），避免整页一块平黑。

### Hero 背景的三层叠放（顺序不可调换）

| 层 | 内容 | 何时存在 |
|---|---|---|
| 1 | GhostFibers WebGL 纤维场 | 始终 |
| 2 | CSS 兜底层（`FluidBackdrop`）| 场景就绪前 / 失败后 |
| 3 | 渐变暗色遮罩 | 始终 |

两个必须知道的约束：

- **兜底层在场景就绪后淡出并卸载**，不是一直挂着 —— 否则 CSS 动画会继续和 WebGL 抢合成资源。
- **WebGL 初始化失败会让整页白屏**（ogl 抛错发生在 effect 里），所以外面包了 `SceneBoundary`
  错误边界，降级成「背景用 CSS 兜底层」。这个边界不是可选项。

### 三个动画系统并存

| 系统 | 负责什么 | 位置 |
|---|---|---|
| Motion | 滚动入场、卡片 hover、导航玻璃化、表单四态 | 全站 UI |
| GSAP + ScrollTrigger | 页脚描边字标 | 仅 `StrokeText` 一个叶子 |
| ogl（WebGL）| Hero 纤维场、首屏指针光轨 | 各一个 canvas |

设计规范通常建议不要把 GSAP 和 Motion 放在同一棵组件树里。这里能接受，是因为三者
只驱动**不相交的元素集合**（Motion 动容器与卡片、GSAP 只动字标内部的 SVG 属性、
WebGL 只画自己的 canvas）。

### 产物体积

```
dist/assets/index-*.js    588.47 kB  (gzip 196.76 kB)
dist/assets/index-*.css    34.03 kB  (gzip   7.62 kB)
```

| 累加 | 体积 |
|---|---|
| 基线（无装饰组件）| 410.90 kB (gzip 131.08) |
| + GhostFibers 与 ogl | 462.59 kB (gzip 147.00) |
| + GSAP 与 ScrollTrigger | 580.16 kB (gzip 193.75) |
| + GlowCursor（复用 ogl）| **588.47 kB (gzip 196.76)** |

GSAP 这一笔比整个 WebGL 背景还贵一倍多。若想省掉，把页脚字标换成纯 CSS 描边动画即可整块移除。

## 设计系统

### 色阶按感知亮度拉开台阶

| 令牌 | 值 | CIE L* | 用途 |
|---|---|---|---|
| `--color-void` | `#171a21` | 9.25 | 页面底、页脚 |
| `--color-abyss` | `#1b1f27` | 11.69 | 交替分区底 |
| `--color-surface` | `#1e222a` | 13.15 | 卡片面 |
| `--color-surface-2` | `#262b35` | 17.45 | 卡片 hover |

参照：纯黑是 0，GitHub Dark Dimmed 的底色 `#22272e` 是 15.43。
不使用更黑的底（如 L\* 2 附近）：人眼在那个区间分辨力最差，卡片和底色会糊成一片，
而且冷色调在过低亮度上根本感知不到。

### 对比度全部核算过

| 前景 | 对 `surface` | 对 `void` |
|---|---|---|
| `--color-fg` `#e9ecf1` | 13.5:1 | 14.7:1 |
| `--color-fg-muted` `#acb4bf` | 7.6:1 | 8.3:1 |
| `--color-fg-dim` `#8d96a1` | 5.3:1 | 5.8:1 |
| `--color-accent` `#5bc8e8` | 8.3:1 | |
| `--color-danger` `#e0837d` | 5.9:1 | |

全站最低 **4.74:1**（`fg-dim` 对 `surface-2`），高于 WCAG AA 的 4.5 线。

> **改底色时必须同步改 `--color-fg*` 并重新核算。** `fg-dim` 是最容易踩线的一档。
> 另外 Hero 里的文字实际压在「纤维场 + 遮罩」的合成结果上，**不能用令牌底色去算**，
> 那里一律使用 `--color-fg-muted` 或更亮，不用 `--color-fg-dim`。

## 深入细节在代码注释里

README 只留结论。推导过程、踩过的坑、以及「为什么不用看起来更简单的那个做法」，
都写在对应源文件的注释里 —— 改动前请先读它：

| 主题 | 读哪个文件 |
|---|---|
| 全部设计令牌、三把锁（单强调色 / 两档圆角 / 单主题）| `src/index.css` |
| 纤维场配色、遮罩分层、就绪与失败两条路径 | `src/components/hero/HeroBackdrop.tsx` |
| 遮罩为什么不用 `backdrop-filter` | 同上 |
| 指针光轨的 shader 开销与「为什么只包首屏」| `src/components/ui/GlowCursor.tsx`、`src/components/layout/CursorGlow.tsx` |
| 描边字标为什么放页脚（组件的居中约束）| `src/components/footer/SiteFooter.tsx` |
| 数据抓取的全部坑（CORS、查询语法、降级、关键词提取）| `scripts/sync-data.mjs` |
| bento 网格的格子数与选条逻辑 | `src/components/sections/TodayDigest.tsx` |
| React Bits 组件相对上游改了哪几处 | 各组件文件头部 |

## 常见问题

**怎么停掉开发服务器？**
在启动它的终端按 `Ctrl + C`；IDEA 里用停止按钮（`Ctrl + F2`）。
**关浏览器标签页不算停服务**，Vite 仍在后台占着端口。终端已经关了但端口还占着：

```powershell
$p = netstat -ano | Select-String ":5273\s+.*LISTENING" |
     ForEach-Object { ($_.Line -split '\s+')[-1] } | Select-Object -First 1
taskkill /PID $p /T /F
```

`/T` 不能省：`npm run dev` 是 `npm → node → vite` 三层，只杀最外层会留下 vite 继续占端口。
另外用 `netstat` 而不是 `Get-NetTCPConnection` —— 后者在受限环境下会**静默返回空**，
让人误判成「已经停了」。

**端口不是 5273？** 5273 被占用时 Vite 会自动顺延（5274、5275……），
以启动时打印的 `Local:` 那一行为准。

**为什么提交时会刷一屏 `LF will be replaced by CRLF`？** 仓库里有 `.gitattributes`
（`* text=auto eol=lf`），一般不会出现；若出现了，说明该文件是在 `.gitattributes`
生效前加入的，`git add --renormalize .` 统一一次即可。

## 已知限制

- **往期详情页未做。** 归档时间线的标题是纯文本而非链接 —— 不做一个点不开的假链接。
- **配图覆盖率不稳定。** 本次快照是 11 条中 6 条拿到配图；不同日期与不同站点差异很大
  （个人博客常常没有 Open Graph 图，部分站点会挡抓取）。抓不到的卡片退化为纯文字，
  不用随机图库凑数。
- **分类与关键词是启发式的**，见上文「数据质量的硬约定」。
- **指针光轨只在首屏。** 它的 shader 对每个像素固定循环 63 次，包整页会让 canvas
  面积（也就是开销）涨约 5 倍。想覆盖整页的改法见代码注释。
- **没有部署配置。** 仓库里没有 Dockerfile / CI / 托管平台配置，`dist/` 是纯静态产物，
  丢到任意静态托管即可。
- **每天更新需要一个触发器。** 现在没有任何定时任务或 CI，需要自己挂一个
  （Windows 任务计划、GitHub Actions cron、或托管平台的定时构建）。

## 许可

作者原创部分适用 [MIT](LICENSE)。

**第三方代码不由该 MIT 许可覆盖：**

- `src/components/hero/GhostFibers.tsx` / `.css`、
  `src/components/ui/GlowCursor.tsx` / `.css`、
  `src/components/ui/StrokeText.tsx` / `.css`
  来自 [React Bits](https://reactbits.dev)，
  适用 **MIT + Commons Clause License Condition v1.0**（Copyright (c) 2026 David Haz）：
  可自由使用（含商用）在自己的网站或产品里，但**不得把这些组件本身出售、再授权或
  作为组件库再分发**。因此它不属于 OSI 认可的开源许可。
- 字体 Geist / Geist Mono 适用 SIL Open Font License 1.1（SPDX：`OFL-1.1`）。
- 快照中的新闻、论文与仓库数据版权归 Hacker News / arXiv / GitHub 及各原文站点所有。

完整的版权声明、条款原文与依赖许可清单（含 `gsap` 的非 MIT 条款）见 [NOTICE](NOTICE)。
