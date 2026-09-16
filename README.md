# AI 日报

每日汇总 AI 行业新闻、技术进展、论文速递与开源项目动态的 PC 端站点。
暗色科技风格，冷色单一强调色，版心 1700px。

## 快速开始

```bash
npm install
npm run dev          # 开发服务器 http://127.0.0.1:5273
npm run build        # 生产构建到 dist/
npm run preview      # 预览构建产物
npm run typecheck    # 类型检查
```

> Windows PowerShell 下如果 `npm` 被执行策略拦下（提示 `npm.ps1` 无法加载），
> 请改用 `npm.cmd run dev`，或换用 cmd / Git Bash。

## 停止开发服务器

**关掉浏览器标签页不算停服务。** 浏览器只是客户端，`npm run dev` 起的 Vite
进程还在后台跑着，端口照样占着。要停就得停进程。

### 在启动它的地方停（正常做法）

| 你怎么启动的 | 怎么停 |
|---|---|
| 终端里 `npm.cmd run dev` | 在该终端按 `Ctrl + C`。若提示 `Terminate batch job (Y/N)?`，按 `Y` 再回车 |
| IDEA 的 npm 面板 / 运行配置 | Run 工具窗口点红色 ■ 停止按钮，或按 `Ctrl + F2` |
| VS Code 任务或其它 IDE | 用对应 IDE 的停止按钮，别只关面板 |

IDEA 里有个容易踩的点：**如果服务是 IDEA 通过运行配置启动的，在 IDEA 的 Terminal
里按 `Ctrl + C` 是停不掉它的**——那个进程归 IDEA 管，得用停止按钮。

### 终端已经关了，但端口还占着

按端口把进程找出来杀掉。**先查后杀，不要凭进程名批量杀**：

```powershell
# 1) 查是谁占着 5273：最后一列就是 PID
netstat -ano | findstr :5273

# 2) 连整棵进程树一起杀（/T 是关键，别省）
taskkill /PID <上一步查到的 PID> /T /F
```

也可以一步取出 PID：

```powershell
$p = netstat -ano | Select-String ":5273\s+.*LISTENING" |
     ForEach-Object { ($_.Line -split '\s+')[-1] } | Select-Object -First 1
taskkill /PID $p /T /F
```

**为什么必须带 `/T`：** `npm run dev` 不是单个进程，而是
`npm.cmd → node(npm) → node(vite)` 三层，Vite 是孙子进程。只杀最外层，
Vite 可能还活着继续占端口——表现就是「明明杀了，端口还是被占、服务还在响应」。

**为什么用 `netstat` 而不是 `Get-NetTCPConnection`：** 后者底层走 CIM/WMI，
在部分受限环境下会**静默返回空**，让你误判成「服务已经停了」（我实测踩到过）。
`netstat` 在所有 Windows 上都能用。

**别按 `node.exe` 名字批量杀。** 开发机上通常同时跑着好几个无关的 node 进程
（其它项目、编辑器插件、各类工具）。只按端口定位，命中谁杀谁。

`npm run preview` 同理，它默认跑在 **4173** 端口，停法完全一样。

### 确认已经停掉

```powershell
if (netstat -ano | Select-String ":5273\s+.*LISTENING" -Quiet) { "仍在运行" } else { "已停止" }
```

### 端口可能不是 5273

5273 被占用时 Vite 会自动顺延到 5274、5275……以它启动时打印的那行 `Local:`
为准，按那个端口来查和杀。

## 数据是真实的，而且是构建期快照

页面内容全部来自真实数据源，由脚本在构建前拉取并固化成快照：

```bash
npm run sync-data         # 完整同步（含文章配图抓取，约 30 到 60 秒）
npm run sync-data:fast    # 跳过配图抓取，更快
node scripts/sync-data.mjs --days 14   # 自定义归档窗口天数
```

| 板块 | 数据源 | 说明 |
|---|---|---|
| 今日速递 | Hacker News（Algolia 检索 API） | 过去 24 小时的高分 AI 故事，按赞同数排序 |
| 论文速递 | arXiv 官方 API | `cs.AI` / `cs.LG` / `cs.CL` 的最新提交 |
| 开源项目 | GitHub Search API | 近 7 天有推送、star 数最高的 AI 仓库 |
| 配图与摘要 | 原文页面的 Open Graph 元信息 | 抓不到就留空，由前端优雅降级 |
| 归档历史 | 历史快照 + Hacker News 回填 | 每一期真实发过的内容 |

**为什么是构建期快照，而不是前端实时请求：**

1. arXiv 官方 API 不返回 CORS 响应头，浏览器端根本无法直连；
2. GitHub 匿名调用限流 60 次/小时，若由访客浏览器发起，站点很快会被打死；
3. 日报本身就是「每天生成一次」的产品形态，内容应当固化，而不是每个访客各拉一遍。

可选：设置 `GITHUB_TOKEN` 环境变量可提高 GitHub 接口的限流额度。

## 目录结构

```
scripts/sync-data.mjs        数据同步脚本（唯一产出内容的入口）
src/data/snapshot.json       生成的内容快照，属于站点内容，需要提交
src/data/snapshots/          历史快照，归档板块的数据来源
src/data/digest.ts           只做适配：把快照映射成组件要用的形状
src/index.css                设计令牌：颜色 / 圆角 / 字体 / 关键帧，三把锁写在这里
src/components/
  layout/    Container(1700px) · Nav · SectionHeader · CursorGlow(指针光轨开关)
  hero/      Hero(内含指针光轨) · HeroBackdrop(场景总装) · GhostFibers(React Bits 纤维场) · FluidBackdrop(CSS 兜底) · IssuePanel
  sections/  TodayDigest(bento) · NewsCard · Papers · OpenSource · Archive
  footer/    SiteFooter(整屏，内含 StrokeText 描边字标) · SubscribeForm(四态)
  ui/        Button · Tag · Skeleton · SmartImage · Reveal · StrokeText · GlowCursor
```

## 数据质量上的已知约定

这些是刻意的取舍，不是遗漏：

- **拿不到就是空，绝不填假值。** 抓不到摘要就不渲染摘要行，抓不到配图就落到
  设计好的占位槽（或直接不渲染图片块），归档里没取到的计数写 `null` 并通过 UI
  整项隐藏，而不是写 `0` 冒充「当天没有论文」。
- **分类是启发式的。** `category` 由脚本按标题关键词判定（规则见 `sync-data.mjs`
  的 `CATEGORY_RULES`），命中不到归入「业界」。它不是人工标注。
- **关键词来自受控词表。** 实体表 + 主题词表（`KNOWN_ENTITIES` /
  `AI_TOPIC_TERMS`），表外的新话题识别不到。要扩覆盖面就改这两个表。
- **标题保留原文语言。** 数据源以英文为主，站点界面是中文，标题不做机器翻译。
- **归档有两种来源。** 有真实历史快照的日期是当期实际发布的内容；
  没有快照的日期由 Hacker News 回填，只包含确实取到的字段，因此显示的计数更少。
- **单个数据源失败不会停更。** 某源不可用时沿用上一次成功的数据，并在页脚如实
  标注降级状态；只有三个源全部失败且无历史数据可沿用，同步才会失败退出。

## 配色与可访问性

颜色令牌集中在 `src/index.css` 的 `@theme` 里。色阶是**按感知亮度拉开台阶**的，
不是随手挑深浅。括号里是 CIE L*（0=纯黑，100=纯白）：

| 令牌 | 值 | L* | 用途 |
|---|---|---|---|
| `--color-void` | `#171a21` | 9.25 | 页面底、页脚 |
| `--color-abyss` | `#1b1f27` | 11.69 | 交替分区底 |
| `--color-surface` | `#1e222a` | 13.15 | 卡片面 |
| `--color-surface-2` | `#262b35` | 17.45 | 卡片 hover |

参照：纯黑是 0，GitHub Dark Dimmed 的底色 `#22272e` 是 15.43。

**为什么不用更黑的底：** 早期版本用 `#06070a`（L* 1.92），四个层级全部落在 L* 8 以下。
人眼在这个区间分辨力最差，卡片和底色会糊成一片，整体被读成「一块黑」而不是「深邃」；
而且偏蓝的冷色调在这个亮度上**根本感知不到**，等于白设计了冷色基调。

### 底色节奏

分区交替使用两档底色，避免整页一块平黑：

```
Hero(自身场景) → 今日速递 void → 论文速递 abyss → 开源 void → 归档 abyss → 页脚 void
```

两档相差约 2.4 个 L*，是很轻的一步。**改过底色的分区必须显式声明自己的底色**，
否则会露出上一分区的颜色。

### 对比度都是算过的

| 前景 | 对 surface | 对 void |
|---|---|---|
| `--color-fg` `#e9ecf1` | 13.5:1 | 14.7:1 |
| `--color-fg-muted` `#acb4bf` | 7.6:1 | 8.3:1 |
| `--color-fg-dim` `#8d96a1` | 5.3:1 | 5.8:1 |
| `--color-accent` `#5bc8e8` | 8.3:1 | |
| `--color-danger` `#e0837d` | 5.9:1 | |

全站最低对比度 **4.74:1**（`fg-dim` 对 `surface-2`），高于 WCAG AA 的 4.5 线。
强调色按钮（`#5bc8e8` 底 + `#171a21` 字）是 9.0:1。

> **改底色时必须同步改 `--color-fg*` 并重新核算。**
> `fg-dim` 是最容易踩线的一档：它原本对旧 surface 是 5.09:1，
> 底色一抬就会掉到 4.5 以下。现在选的 `#8d96a1` 对更亮的 `surface-2` 也还留了余量。

### Hero 里的文字压在 WebGL 背景上，另算一遍

上面那张表算的是「文字压在设计令牌的底色上」。但 Hero 的文字实际压在**纤维场 + 三层遮罩**
的合成结果上，而纤维场有很亮的发光带，所以必须单独核算。

做法是把 fragment shader 与三层遮罩的渐变**按同一套参数在 Node 里重算一遍**
（shader 是纯数学，遮罩是 CSS 渐变，都不需要真的跑 WebGL），
在 1920×1080 上按网格取样、并在多个时间点取最坏情况。

第一次核算的结果暴露了两处不达标，都是**在纤维场上用了最暗的 `fg-dim`**：

| 位置 | 修前 | 修后 | 做法 |
|---|---|---|---|
| Hero 眉标 14px | **3.60:1** ★ | **5.16:1** ✓ | `text-fg-dim` → `text-fg-muted` |
| 刊头面板内小字 | **3.17:1** ★ | **5.58:1** ✓ | 同上 + 玻璃 alpha `0.6` → `0.72` |

其余位置本来就在线上方，未做改动：

| 位置 | 对比度 | 门槛 |
|---|---|---|
| 未滚动时的导航链接 14px | 4.83:1 | 4.5 |
| 站点字标 17px | 8.54:1 | 4.5 |
| H1 88px | 6.44:1 | 3.0（大字号） |
| 副文案 18px | 4.57:1 | 4.5 |
| CTA 15px | 9.89:1 | 4.5 |
| 刊头面板 fg | 9.85:1 | 4.5 |

**修法是调亮文字，而不是加浓遮罩。** 对比过两条路：加浓遮罩虽然也能让全部达标，
但会把纤维峰值从 ΔL\* 41.7 压到 25.7，并且让 Hero 更暗 —— 与「页面别太黑」的诉求相反。
调亮文字则完全不动背景，纤维亮度保持原样。

> 结论：**Hero 里任何压在纤维场上的文字都不要用 `--color-fg-dim`。**
> 它在令牌底色上合法（5.3:1），但在纤维场的发光带上会掉到 4.5 以下。

### 遮罩色只有一处真源

Hero 的三层压暗遮罩、导航与刊头面板的玻璃底色，全部引用 `--scrim-rgb`
（写成 `rgb(var(--scrim-rgb) / 0.82)` 这种形式）。它必须与 `--color-void` 保持一致，
但这样「遮罩跟着底色走」的绑定只在一处维护，不会出现
「Hero 还是黑的、下面已经亮了」的脱节。

`index.html` 里另有一处内联的首帧底色（防加载瞬间闪白）和 `theme-color`，
改底色时也要一起改。

## Hero 背景：GhostFibers WebGL 纤维场

Hero 的主视觉是 [React Bits](https://reactbits.dev) 的 **GhostFibers** 组件，
由 `src/components/hero/HeroBackdrop.tsx` 总装，源码在
`src/components/hero/GhostFibers.tsx`（+ 同名 `.css`）。

### 三层结构自下而上，顺序不能调换

| 层 | 内容 | 何时存在 |
|---|---|---|
| 1 | GhostFibers WebGL 纤维场 | 始终（静态导入） |
| 2 | CSS 兜底（`FluidBackdrop`） | 仅在场景就绪前 / 失败后 |
| 3 | 暗色遮罩（渐变） | 始终 |

设计上刻意做的几个取舍：

- **兜底层在场景就绪后淡出并卸载**，不是一直挂着。CSS 斑块与粒子虽然被盖住
  看不见，但动画仍在跑、仍在占合成资源，等于白跟 WebGL 抢帧。
- **暗色遮罩只用渐变，不用 `backdrop-filter`。** 全屏毛玻璃压在每帧重绘的 canvas 上
  会迫使合成器每帧重新模糊，代价很高，还会把场景糊掉。文字对比度改用「左重右轻」
  的渐变解决：左侧文字栈和右侧刊头压暗，中间留出场景。

### 相对上游源码改了三处

组件是从 React Bits 的 **JavaScript + CSS** 变体搬进来的，逻辑一行未改，只做了三处适配：

1. **转成 TSX 并补上类型。** 上游是 `.jsx`，本项目 tsconfig 没开 `allowJs`，
   直接放 `.jsx` 会让 `npm run typecheck` 报找不到模块。转换是机械的。
2. **新增 `backdrop` prop。** 上游把暗色模式的地色硬编码在 shader 里
   （`vec3(0.070588, 0.058824, 0.090196)`，即 `#120F17`）。本站页面底是 `#171a21`，
   照搬会让 Hero 变成一块比页面更暗、且带紫调的区域。默认值保持上游原值不变，
   本站显式传入页面底色。
3. **换了两个颜色。** 上游默认是 `#140E35` / `#3437A0`（深紫 + 靛蓝），会跟本站锁定的
   冷青强调色打架，也踩到设计规范里要避开的「AI 紫」。现在用 `#0d2b37` / `#1a7791`。
   换色时保持了**各色相对地色的亮度比例**，而不是照搬绝对值 —— 上游地色 `#120F17`
   的 L\* 约 4.4，本站是 9.25，照搬绝对值会让纤维比地色还暗，整个效果看不见。
   想改回上游紫色，把 `HeroBackdrop.tsx` 里的 `FIBER_LINE_COLOR` / `FIBER_GLOW_COLOR`
   换掉即可。

### 上游没有 onLoad / onError，所以这两条路径自己接

- **就绪**：React 的 effect 是自下而上执行的，子组件 effect 先于父组件跑完，
  而 GhostFibers 在自己的 effect 里就同步 append 了 canvas。所以父组件挂载后
  查一次 `container.querySelector('canvas')` 就能确定它起来了，不需要
  MutationObserver 或轮询。
- **失败**：用 `SceneBoundary` 错误边界兜住。**这个边界不是可选项** ——
  ogl 在拿不到 WebGL2 上下文、或 shader 编译/链接失败时会直接抛错，而且抛在
  `useEffect` 里；没有边界的话 React 会卸载整棵树，也就是**整页白屏**。

### 不需要自己处理降动效

GhostFibers 上游自带：`prefers-reduced-motion` 命中时只渲染一帧静态画面、
离屏（IntersectionObserver）暂停、标签页隐藏暂停、容器尺寸跟随（ResizeObserver）、
卸载时断开全部监听并主动 `loseContext()` 释放 WebGL 上下文。
所以 `HeroBackdrop` 里**没有**再传 `paused`。

### 它是静态导入的，不要改成懒加载

`ogl` 很轻，只用到 `Mesh / Program / Renderer / Triangle`，实际只给主包增加
**约 52 kB（gzip 16 kB）**：

```
dist/assets/index-*.js    462.59 kB  (gzip 147.00 kB)   ← 单一产物，含 ogl 与纤维场
```

对比一下上一版用的 Unicorn Studio：主包 410.90 kB **外加**一个 903.93 kB 的异步 chunk，
JS 合计 1.31 MB。换成 GhostFibers 后 JS 总量降到 463 kB，**减少约 65%**，
也就不再需要 `React.lazy` + `Suspense` 了（那套是为 903 kB 的 SDK 才加的）。

### 性能旋钮

| 参数 | 当前值 | 说明 |
|---|---|---|
| `dpr` | `1` | 上游默认就是 1，会被夹在 0.5 到 2 之间。2K/4K 屏上等于少渲染两三倍像素量 |
| `fps` | 未传（默认 60） | 组件内部按帧率节流，想让背景更省就传 `fps={30}` |
| `layers` | `4` | 叠加层数，1 到 10。直接决定 shader 循环次数，是最大的性能开关 |
| `grain` | `0.05` | 胶片颗粒强度，调到 0 可省一点片元开销 |

## 页脚描边字标：StrokeText

页脚收尾区的「AI 日报」字标是 [React Bits](https://reactbits.dev) 的 **StrokeText**，
滚入视口时先画出描边、再由左向右扫过填充。源码在
`src/components/ui/StrokeText.tsx`（+ 同名 `.css`），用在
`src/components/footer/SiteFooter.tsx`。

### 它被放在页脚，不是 Hero —— 原因是硬性约束

组件源码里写死了 `preserveAspectRatio="xMidYMid meet"`，意味着
**内容永远在自己的容器里居中**。这条改不掉（除非动组件源码）。所以：

- 拿它做左对齐的 Hero 大标题会和上方的眉标、下方的副文案错位，
  而且 Hero 标题是 LCP 元素，换成 JS 测量 + GSAP 驱动的 SVG 会引入
  首帧完整闪现再重画的抖动。
- 页脚收尾区本来就适合居中的整屏字标，且位于折叠线以下，
  用 `trigger="scroll"` 正好是组件设计的使用方式，也不影响 LCP。

另外它**刻意没有包在 `<Reveal>` 里**：Reveal 会先把容器置为透明再淡入，
那会让 GSAP 的时间轴在看不见的状态下跑完。

### 相对上游源码改了三处

1. **转成 TSX 并补类型。** 上游是 `.jsx`，本项目没开 `allowJs`。
   时间轴、ScrollTrigger、降动效分支的逻辑一行未改。
2. **补了一份 `StrokeText.css`。** 上游给了 JSX 却没给这份 CSS，但源码里 import 了它。
   现在是按组件实际用到的五个类名（`.stroke-text` / `--hover` / `__svg` / `__stroke` / `__fill`）
   与 `--stroke-text-height` 变量补写的。
3. **`gsap.registerPlugin` 加了 SSR 守卫**（上游是裸调用，服务端会碰到 window）。

描边色取的是本站强调色 `#5bc8e8`，填充色取正文色 `#e9ecf1`，不是上游默认的
紫色 `#A78BFA` / 近白 `#F8FAFC`。

### 三个 trigger 模式

| 值 | 行为 |
|---|---|
| `mount` | 挂载即播放 |
| `scroll` | 滚入视口播放一次（ScrollTrigger，`start: 'top 82%'`）—— 当前用的是这个 |
| `hover` | 鼠标移入重播 |
| `loop` | 循环播放（`repeat: -1`，间隔 0.9s） |

### 全站现在有三个动画系统，这点要知道

| 系统 | 负责什么 | 位置 |
|---|---|---|
| Motion（Framer Motion） | 滚动入场、卡片 hover、导航玻璃化、表单四态 | 全站 UI |
| GSAP + ScrollTrigger | 页脚字标的描边描画 | 仅 `StrokeText` 这一个叶子组件 |
| 原生 rAF + WebGL | Hero 纤维场 | 仅 `GhostFibers` |

设计规范里有一条「不要把 GSAP / Three.js 和 Motion 放在同一棵组件树里，它们会抢帧」。
现状是**三者并存**，之所以还能接受，是因为它们各自只驱动不相交的元素集合
（Motion 动容器与卡片、GSAP 只动字标内部的 SVG 属性、WebGL 只画自己的 canvas）。
但这是有代价的：GSAP + ScrollTrigger 给主包增加了约 **118 kB（gzip 47 kB）**。
如果之后觉得不值，页脚字标换成纯 CSS 描边动画可以整块省掉 GSAP。

### 性能与体积

```
dist/assets/index-*.js    580.16 kB  (gzip 193.76 kB)
```

| 组成 | 增量 |
|---|---|
| 未加任何背景/装饰组件前 | 410.90 kB (gzip 131.08) |
| + GhostFibers + ogl | 462.59 kB (gzip 147.00)，**+52 kB** |
| + GSAP + ScrollTrigger | 580.16 kB (gzip 193.76)，**+118 kB** |

## 指针光轨：GlowCursor

首屏有一条跟随指针的青色光轨（[React Bits](https://reactbits.dev) 的 **GlowCursor**，
shader 驱动，依赖 `ogl`）。源码在 `src/components/ui/GlowCursor.tsx`（+ 同名 `.css`），
开关层在 `src/components/layout/CursorGlow.tsx`，用在 `src/components/hero/Hero.tsx`。

### 相对上游只改了类型，逻辑一字未改

从官方 registry 取源（`https://reactbits.dev/r/GlowCursor-JS-CSS`），
只做了 TSX 转换；shader、props 默认值、CSS 全部是原文。

它本身已经解决了自定义光标最容易出的两个问题：canvas 是 `pointer-events: none`
（**不隐藏原生指针、不拦截点击**），且 `idleFade` 会在指针离开或静止后自动淡出。

### 为什么包在 Hero 的 Container 上，而不是整页

两个约束叠加，位置基本只有一种选择：

1. **GlowCursor 的 canvas 是在 `children` 之下的。** 如果包整个 `<section>`，
   canvas 会被 `HeroBackdrop` 里那块**不透明的**纤维场 canvas 盖掉，完全看不见。
   必须包在 `HeroBackdrop` 之后（DOM 顺序靠后）才能让光轨浮在纤维场之上。
2. **不能包整页，开销会差 5 倍。** 见下。

所以：首屏有光轨（可看到纤维场之上浮着一条青光），往下没有。这是刻意的分区 ——
首屏由纤维场负责，指针光轨是首屏的交互层。

### 开销只由 canvas 面积决定，这点必须知道

这个 shader 对**每个像素固定循环 `MAX_POINTS - 1` = 63 次**，而且
`discard` 写在循环**之后**。也就是说：

- `trailLength` 调小**不省开销**（循环次数是编译期常量）；
- 光轨淡出到不可见时，每帧仍然跑满；
- 唯一的两档是 **canvas 面积** 和 **dpr**。

| 包裹范围 | 碎片数（1920 宽，dpr 1）|
|---|---|
| Hero 的 Container（当前） | 约 **207 万** |
| 整个 `<main>` | 约 **1060 万** |

按每碎片约 6 个超越函数（4×pow + exp + sin）× 63 次循环估算，
整页方案在中低端集显上很可能掉帧。所以当前选了首屏，并额外把
`maxDevicePixelRatio` 从上游默认的 `1.5` 压到 `1`。

想让它覆盖整页：把 `<CursorGlow>` 从 `Hero.tsx` 挪到 `App.tsx` 的 `<main>` 上即可
（同时要接受上面那个开销，或者把 dpr 再降到 0.5）。

### 触屏与降动效由开关层负责，不是传个 false 就完事

GlowCursor 上游**没有处理 `prefers-reduced-motion`，也不区分触屏**。
`CursorGlow` 用一条媒体查询同时卡住两者：

```
(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)
```

不满足时**完全不挂载** GlowCursor —— 不创建 canvas、不建 WebGL 上下文、不进 rAF 循环。
之所以不能只传 `enabled={false}`：因为 `discard` 在循环之后，
「淡出但仍在渲染」照样跑满开销，触屏设备上等于白烧电。

读媒体查询用 `useSyncExternalStore` 而不是 `useState + useEffect`：
后者首帧拿到 `false`、effect 跑完才变 `true`，会导致包裹层出现又消失，
把整棵子树（含 Hero 的 WebGL 上下文与 ScrollTrigger）重新挂载一次。
`useSyncExternalStore` 在客户端首帧就能同步拿到正确值；`getServerSnapshot` 返回
`false`，所以 SSR 阶段直接渲染 children，不碰 `window`。

### 配色

上游默认 `color="#67E8F9"` / `secondaryColor="#A78BFA"`（青 + 紫罗兰）。
紫色换成站内令牌：头部是强调色 `#5bc8e8`，尾部收到强调色暗档 `#2e7d93`，
所以光轨「头亮尾沉」且整条都在冷色家族里。

## 技术栈

React 19 · Vite 8 · Tailwind CSS v4 · Motion（Framer Motion 的现行包名）·
GSAP + ScrollTrigger · Lucide React · ogl（WebGL）· TypeScript

字体：Geist（自托管，负责拉丁字符与数字）＋ 系统 CJK 字体栈（负责中文）。

## 许可

作者原创部分适用 [MIT 许可](LICENSE)。

**但本仓库包含第三方代码，它们不由本仓库的 MIT 许可覆盖：**

- `src/components/hero/GhostFibers.*`、`src/components/ui/GlowCursor.*`、
  `src/components/ui/StrokeText.*` 来自 [React Bits](https://reactbits.dev)，
  适用 **MIT + Commons Clause License Condition v1.0**（Copyright (c) 2026 David Haz）。
  意思是：可以自由使用（含商用）在自己的网站/产品里，**但不能把这些组件本身
  出售、再授权或作为组件库再分发**。因此它不属于 OSI 认可的开源许可 ——
  若以后要把本仓库当作组件库分发，需先剥离这三个组件。
- 字体 Geist / Geist Mono 适用 SIL Open Font License 1.1。
- 快照里的新闻、论文与仓库数据版权归 Hacker News / arXiv / GitHub 及各原文站点所有。

完整的版权声明、条款原文与依赖许可清单见 [NOTICE](NOTICE)。

> 仓库里还放了 `.gitattributes`，把换行统一为 LF（`* text=auto eol=lf`）。
> 不写它的话，Windows 上 `core.autocrlf` 会让每次 git 操作都刷一屏
> `LF will be replaced by CRLF` 警告，跨平台协作时还会产生整文件级别的假差异。
