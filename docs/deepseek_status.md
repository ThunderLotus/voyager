# DeepSeek 功能支持情况

## 第一部分：DeepSeek 功能支持分析报告（DeepSeek Functionality Support Analysis Report）

**总体架构（Overall Architecture）**
DeepSeek 在 Voyager 中被定位为插件平台（非原生站点），内容脚本入口 index.tsx 中仅启动 startExportButton()，所有 Gemini 核心功能被分支逻辑跳过。（DeepSeek is positioned as a plugin platform (non-native site) in Voyager, where the content script entry index.tsx only starts startExportButton(), and all core Gemini features are bypassed by branch logic.）
**逐项分析（Item-by-Item Analysis）**

| 功能（Feature）            | DeepSeek 已支持（DeepSeek Supported） | 技术可行性（Technical Feasibility） | 说明（Notes / Description）                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💾 **Chat Export**         | ✅ 是（Yes）                          | -                                   | 已实现完整 adapter，支持 JSON/Markdown/PDF/Image，PDF 平台无关（Fully implemented adapter supporting JSON/Markdown/PDF/Image, with PDF being platform-independent）                                                           |
| 🛡️ **Prevent Auto Scroll** | ❌ 否（No）                           | 高（High）                          | 拦截机制平台无关，仅需在 CHAT_SCROLL_SELECTOR 添加 DeepSeek 选择器（如 .ds-scroll-area）（Interception mechanism is platform-independent; only needs adding DeepSeek selectors like .ds-scroll-area to CHAT_SCROLL_SELECTOR） |
| 🧜‍♀️ **Mermaid Rendering**   | ❌ 否（No）                           | 中（Medium）                        | 核心渲染逻辑可复用，需适配代码块选择器（.md-code-block）和主题检测（html.dark）（Core rendering logic is reusable; needs adapting code block selector (.md-code-block) and theme detection (html.dark)）                      |
| 📝 **Quote Reply**         | ❌ 否（No）                           | 中（Medium）                        | 选择器已有 fallback 机制，需添加 DeepSeek 选择器 + 适配输入框（Selector already has fallback mechanism; needs adding DeepSeek selector and adapting input box）                                                               |
| 📝 **Input Collapse**      | ❌ 否（No）                           | 中（Medium）                        | 需适配路由（/a/chat/s/_）和输入框 DOM（Needs adapting routes (/a/chat/s/_) and input box DOM）                                                                                                                                |
| 📍 **Timeline Navigation** | ❌ 否（No）                           | 低（Low）                           | Gemini 路由 /app//gem/ + 专属 DOM，DeepSeek 无等价概念（Gemini route /app//gem/ + exclusive DOM; DeepSeek has no equivalent concept）                                                                                         |
| 🔬 **Deep Research**       | ❌ 否（No）                           | 低（Low）                           | 硬编码 gemini.google.com，但 R1 思考过程已在导出中处理（Hardcoded to gemini.google.com, but R1 thinking process is already handled in export）                                                                                |
| 🛠️ **Default Model**       | ❌ 否（No）                           | 低（Low）                           | Gemini 模型 ID + Material 菜单，DeepSeek UI 完全不同（Gemini model ID + Material menu; DeepSeek UI is completely different）                                                                                                  |
| 📝 **Markdown Fix**        | ❌ 否（No）                           | -                                   | 不必要，针对 Gemini 渲染 bug，DeepSeek 不存在此问题（Unnecessary; targets Gemini rendering bugs, which DeepSeek does not have）                                                                                               |
| 🍌 **Image/Watermark**     | ❌ 否（No）                           | -                                   | 不适用，DeepSeek 无 SynthID 水印（Not applicable; DeepSeek has no SynthID watermark）                                                                                                                                         |
| **Hide Recent/Gems**       | ❌ 否（No）                           | -                                   | 不适用，Gems 是 Gemini 专属概念（Not applicable; Gems is a Gemini-exclusive concept）                                                                                                                                         |
| **Sidebar Auto Hide**      | ❌ 否（No）                           | 低（Low）                           | 全部基于 bard-sidenav custom element（Entirely based on bard-sidenav custom element）                                                                                                                                         |

**结论（Conclusion）**

- **已完整支持（Fully Supported）：** Chat Export（含 Mermaid 源代码导出）（Chat Export (including Mermaid source code export)）
- **最易移植（Easiest to Port）：** Prevent Auto Scroll（仅需扩展选择器列表）（Prevent Auto Scroll (only needs extending selector list)）
- **有价值的移植（Valuable Ports）：** Mermaid Rendering（页面内渲染）、Quote Reply（Mermaid Rendering (in-page rendering), Quote Reply）
- **不适用/不必要（Not Applicable / Unnecessary）：** Markdown Fix、Image/Watermark、Hide Recent/Gems

## 第二部分：项目实施与技术细节（Project Implementation & Technical Details）

**目标（Goal）**
让 Voyager 浏览器扩展在 DeepSeek (chat.deepseek.com) 页面上实现完整的 Markdown 导出功能，包括正确处理 Mermaid 流程图导出、代码块语言标签、以及各种 Markdown 格式。（Enable Voyager browser extension to achieve full Markdown export functionality on DeepSeek (chat.deepseek.com) pages, including proper handling of Mermaid flowchart export, code block language tags, and various Markdown formats.）
**指令（Instructions）**

- 使用简体中文回复（Reply in Simplified Chinese）
- 用户在 Edge 浏览器中加载 dist_chrome 目录进行测试（User loads dist_chrome directory in Edge browser for testing）
- 修改后需要运行 bun run typecheck 和 bun run test 验证（After modifications, need to run bun run typecheck and bun run test for verification）
- 修改后需要运行 bun run build:chrome 重新构建（After modifications, need to run bun run build:chrome to rebuild）
- 每次构建后用户需要在 Edge 中重新加载扩展并刷新 DeepSeek 页面测试（After each build, user needs to reload extension in Edge and refresh DeepSeek page for testing）
- Git 远端已改为 https://github.com/ThunderLotus/voyager（origin），上游为 https://github.com/Nagi-ovo/voyager.git（upstream）（Git remote changed to https://github.com/ThunderLotus/voyager (origin), upstream is https://github.com/Nagi-ovo/voyager.git (upstream)）
- 所有 DeepSeek 修改在 feat-deepseek 分支上，main 分支与 upstream 保持一致（All DeepSeek modifications are on feat-deepseek branch; main branch remains consistent with upstream）
- 版本号保持 1.7.1（与 upstream 一致）（Version number remains 1.7.1 (consistent with upstream)）
  **发现（Findings）**

- **DeepSeek DOM 结构（DeepSeek DOM Structure）：**
  - 用户消息：`<div class="d29f3d7d ds-message _63c77b1">`（User message: `<div class="d29f3d7d ds-message _63c77b1">`）
  - 助手主内容：`<div class="ds-markdown ds-assistant-message-main-content">`（Assistant main content: `<div class="ds-markdown ds-assistant-message-main-content">`）
  - 代码块：`<div class="md-code-block md-code-block-light">` 包含 banner、style、SVG（Code block: `<div class="md-code-block md-code-block-light">` containing banner, style, SVG）
  - Mermaid 代码块：banner 含 "Diagram"/"Code" tab，SVG 渲染容器，默认无 `<pre>`（Mermaid code block: banner contains "Diagram"/"Code" tab, SVG rendering container, default no `<pre>`）
- **Mermaid 源代码提取三重策略（已实现）（Mermaid Source Code Extraction Triple Strategy (Implemented)）：**
  - 策略1：React fiber 搜索（memoizedProps + memoizedState hooks 链表）（Strategy 1: React fiber search (memoizedProps + memoizedState hooks linked list)）
  - 策略2：点击 "Code" tab（原生事件 + PointerEvent + 直接调用 React fiber onClick handler）（Strategy 2: Click "Code" tab (native event + PointerEvent + direct call to React fiber onClick handler)）
  - 策略3：克隆元素并移除 banner/style/svg 后提取 textContent 兜底（Strategy 3: Clone element, remove banner/style/svg, then extract textContent as fallback）
- **代码块语言提取（Code Block Language Extraction）：** DeepSeek 将语言名与按钮文本无分隔拼接（如 htmlcopydownloadrun），需在第一个按钮关键词（copy/download/run/fullscreen）处截断（DeepSeek concatenates language name with button text without separators (e.g., htmlcopydownloadrun), requiring truncation at the first button keyword (copy/download/run/fullscreen)）
- **关键 bug（Critical Bug）：** 移除调试日志时意外产生空 if 语句，导致 processNodes 递归被跳过（this.processNodes 成了 if 的 body），影响链接 URL、图片语法、脚注换行等多个问题（Removing debug logs accidentally left an empty if statement, causing processNodes recursion to be skipped (this.processNodes became the body of if), affecting link URLs, image syntax, footnote line breaks, and multiple other issues）
- DeepSeek 不渲染引用链接定义和脚注定义（标准 Markdown 行为），这些在 DOM 中不存在（DeepSeek does not render reference link definitions or footnote definitions (standard Markdown behavior), which do not exist in the DOM）
- **功能支持分析（Feature Support Analysis）：** DeepSeek 目前仅启用导出功能。Prevent Auto Scroll 最易移植（仅需扩展选择器），Mermaid Rendering 和 Quote Reply 中等可行性（DeepSeek currently only enables export functionality. Prevent Auto Scroll is easiest to port (only needs extending selectors), while Mermaid Rendering and Quote Reply have medium feasibility）
  **已完成（Completed）**

- ✅ 完整的 DeepSeek 导出适配器（JSON/Markdown/PDF/Image 四种格式）（Complete DeepSeek export adapter (four formats: JSON/Markdown/PDF/Image)）
- ✅ Mermaid 源代码提取（React fiber + 点击 Code tab + textContent 兜底）（Mermaid source code extraction (React fiber + click Code tab + textContent fallback)）
- ✅ 代码块语言标签修复（htmlcopydownloadrun → html，diagram → mermaid）（Code block language tag fix (htmlcopydownloadrun → html, diagram → mermaid)）
- ✅ 标题 H1-H6、段落、行内格式、列表、表格、引用块、数学公式、水平线（Headings H1-H6, paragraphs, inline formatting, lists, tables, quote blocks, math formulas, horizontal rules）
- ✅ 任务列表、`<br>` 换行、R1 思考过程提取（Task lists, `<br>` line breaks, R1 thinking process extraction）
- ✅ 表格短路 bug 修复、offset 配对修复、最后一条助手消息无法选择的 bug 修复（Table short-circuit bug fix, offset pairing fix, last assistant message unselectable bug fix）
- ✅ 空 if 语句 bug 修复（恢复 processNodes 递归）（Empty if statement bug fix (restored processNodes recursion)）
- ✅ 所有 5 个导出问题已验证解决（代码语言标签、引用链接定义、脚注定义、内联链接 URL、内联图片语法）（All 5 export issues verified resolved (code language tags, reference link definitions, footnote definitions, inline link URLs, inline image syntax)）
- ✅ 版本号改回 1.7.1（Version number changed back to 1.7.1）
- ✅ Git 分支结构：main 与 upstream 一致，feat-deepseek 包含所有修改（Git branch structure: main consistent with upstream, feat-deepseek contains all modifications）
- ✅ 推送到 origin/feat-deepseek（commit 9f50e40c）（Pushed to origin/feat-deepseek (commit 9f50e40c)）
  **Git 提交（Git Commit）**
  9f50e40c feat(deepseek): add full Markdown export support with Mermaid source extraction（在 feat-deepseek 分支，已推送到 origin）（(on feat-deepseek branch, pushed to origin)）
  **下一步（Next Steps）**

- 用户可能要求移植其他 Gemini 功能到 DeepSeek（Prevent Auto Scroll 最容易）（User may request porting other Gemini features to DeepSeek (Prevent Auto Scroll being the easiest)）
- 或继续测试其他导出场景（Or continue testing other export scenarios）
- 或创建 PR（https://github.com/ThunderLotus/voyager/pull/new/feat-deepseek）（Or create a PR (https://github.com/ThunderLotus/voyager/pull/new/feat-deepseek)）
  **相关文件/目录（Related Files / Directories）**

- `src/features/export/services/DOMContentExtractor.ts` — 核心提取器（表格修复、`<br>`、任务列表、generic container 跳过 .md-code-block、空 if 修复）（Core extractor (table fix, `<br>`, task lists, generic container skip .md-code-block, empty if fix)）
- `src/pages/content/export/adapter/platform/deepseek.ts` — DeepSeek 导出适配器（Mermaid 提取、语言解析、prepareForExport）（DeepSeek export adapter (Mermaid extraction, language parsing, prepareForExport)）
- `src/pages/content/export/adapter/platform/contract.ts` — ExportPlatformAdapter 接口（新增 prepareForExport?）（ExportPlatformAdapter interface (added prepareForExport?)）
- `src/pages/content/export/index.ts` — 导出入口（调用 prepareForExport）（Export entry (calls prepareForExport)）
- `src/features/plugins/sites/adapters/deepseek.ts` — DeepSeek 站点适配器（DeepSeek site adapter）
- `src/pages/content/export/adapter/__tests__/deepseek.test.ts` — DeepSeek 测试（DeepSeek tests）
- `src/features/export/services/MarkdownFormatter.ts` — Markdown 格式化器（Markdown formatter）
- `public/contentStyle.css` — z-index 和 DeepSeek 专属样式（z-index and DeepSeek-specific styles）
- `package.json` / `manifest.json` / `manifest.dev.json` — 版本号 1.7.1（Version number 1.7.1）

---

## Prevent Auto Scroll 功能分析（Prevent Auto Scroll Feature Analysis）

**1. 它是什么（What It Is）**
一个防自动跳转功能。当用户在阅读历史对话时提交新问题，AI 平台默认会强制滚动到底部追踪新生成回答。该功能拦截这一行为，让用户停留在当前阅读位置。（An anti-auto-scroll feature. When a user submits a new question while reading chat history, AI platforms by default force scroll to the bottom to track newly generated responses. This feature intercepts this behavior, allowing the user to remain at their current reading position.）
**2. 在 Gemini 中的体验（Experience in Gemini）**

- **关闭（默认）（Disabled (Default)）：** 提交新 prompt → 页面跳到底部 → 跟踪流式回答（Submit a new prompt → Page jumps to the bottom → Track streaming response）
- **开启（Enabled）：** 提交新 prompt → 停留在当前阅读位置 → 用户可随时手动下滚查看新回答（Submit a new prompt → Remain at current reading position → User can manually scroll down anytime to view new response）
- **解决 GitHub Issue #321（Resolves GitHub Issue #321）：** 用户读历史时按 Enter 提交，Gemini 强制跳底，打断阅读。（User presses Enter to submit while reading history, Gemini forces a jump to the bottom, interrupting reading.）
  **3. 技术机制（Technical Mechanism）**

| 层面（Aspect）                           | 做法（Implementation / Approach）                                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MAIN world 脚本（MAIN world script）** | 改写 `scrollTo`/`scrollBy`/`scrollIntoView`/`scrollTop` 原生 API（Overrides native `scrollTo`/`scrollBy`/`scrollIntoView`/`scrollTop` APIs）               |
| **时间窗口（Time Window）**              | 提交后 120 秒内生效，路由变化后 4 秒宽限解除（Takes effect within 120 seconds after submission, released after a 4-second grace period upon route change） |
| **触发条件（Trigger Conditions）**       | 用户已向上滚 >150px 且试图向下滚动且在阻止窗口内（User has scrolled up >150px, attempts to scroll down, and is within the blocking window）                |
| **提交检测（Submission Detection）**     | 监听 Enter 键 + 多语言发送按钮匹配（send/提交/送信…）（Listens for Enter key + multilingual send button matching (send/提交/送信…)）                       |
| **侧边栏保护（Sidebar Protection）**     | 排除 `bard-sidenav` 等侧边栏元素，只拦聊天主容器（Excludes sidebar elements like `bard-sidenav`, targeting only the main chat container）                  |

**4. 为什么需要这个功能（Why This Feature Is Needed）**
AI 对话界面的通病：流式生成时强制追焦。用户想边读历史边等新回答，但平台不让——每次提交都被拽到底部。这不是 bug 而是产品设计（大多数用户想看新回答生成过程），但对"多轮阅读型"用户是干扰。（A common pain point of AI chat interfaces: forced focus during streaming generation. Users want to read history while waiting for a new answer, but platforms prevent it—pulling them to the bottom on every submission. This is not a bug but product design (most users want to see the new response generation process), yet it is an interruption for "multi-turn reading" users.）
**5. DeepSeek 是否需要（Whether DeepSeek Needs It）**
需要。DeepSeek 同样是流式生成 + 自动追焦的 AI 对话界面，用户提交新问题后页面也会跳到底部。这类行为是 AI chat UI 的通用模式，不是 Gemini 独有。（Yes. DeepSeek is likewise a streaming generation + auto-focus AI chat interface, where the page also jumps to the bottom after users submit new questions. This behavior is a common pattern in AI chat UI, not unique to Gemini.）
**6. DeepSeek 是否原生有此功能（Whether DeepSeek Has This Natively）**
大概率没有。主流 AI 对话平台（Gemini、ChatGPT、Claude、DeepSeek）均默认追焦且不提供关闭选项。DeepSeek 的 Web UI 较简洁，没有已知的"禁止自动滚动"设置项。即使有，Voyager 的实现更灵活（120 秒窗口 + 向上滚才触发 + Ctrl+Enter 联动），体验优于简单的全开/全关。（Most likely no. Mainstream AI chat platforms (Gemini, ChatGPT, Claude, DeepSeek) all default to auto-focus without providing a toggle off option. DeepSeek's Web UI is clean with no known "disable auto-scroll" setting. Even if it exists, Voyager's implementation is more flexible (120s window + triggers only when scrolled up + Ctrl+Enter integration), offering a better experience than simple full on/off toggles.）
**7. 移植难度（Porting Difficulty）**
最低。只需在 `CHAT_SCROLL_SELECTOR` 中添加 DeepSeek 的滚动容器选择器（如 `.ds-scroll-area` 或 `div[class*="scroll"]`），其余机制（时间窗口、提交检测、API 拦截）完全平台无关。不需要改写任何逻辑代码。（Lowest. Only requires adding DeepSeek's scroll container selectors (such as `.ds-scroll-area` or `div[class*="scroll"]`) to `CHAT_SCROLL_SELECTOR`, as remaining mechanisms (time window, submission detection, API interception) are completely platform-independent. No logic code rewrite needed.）

---

Prevent Auto Scroll 的拦截条件很严格——必须同时满足：功能开启 + 提交后 120 秒窗口内 + 用户已向上滚 >150px + 试图向下滚。它拦的是 scrollTo/scrollIntoView 等页面级滚动 API。

导出功能不需要滚动——它直接从 DOM 树中读取所有消息节点。哪怕最后一条消息不在视口内，它在 DOM 里依然存在，提取器能直接访问其 textContent/innerHTML。选择导出范围也是通过 UI 控件（下拉框/数字），不是滚动到某条消息去点选。

---

## Mermaid Rendering 功能分析（Mermaid Rendering Feature Analysis）

## DeepSeek - 不需要(No need)

**1. 它是什么（What It Is）**
自动检测 AI 回复中的 Mermaid 代码块（flowchart、sequenceDiagram、gantt 等），在对话中即时渲染为可交互的 SVG 图表，提供 "📊 Diagram / </> Code" 切换和全屏缩放平移查看器。（Automatically detects Mermaid code blocks (flowchart, sequenceDiagram, gantt, etc.) in AI responses, renders them instantly into interactive SVG diagrams within the conversation, and provides a "📊 Diagram / </> Code" toggle alongside a full-screen zoom/pan viewer.）

**2. 在 Gemini 中的体验（Experience in Gemini）**

| 状态（Status）                        | 用户看到（User Sees）                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **关闭（Disabled）**                  | Mermaid 代码以纯文本显示，需手动复制到 `mermaid.live` 才能看图（Mermaid code displayed as plain text, requiring manual copy-pasting to `mermaid.live` to view the diagram） |
| **开启（默认）（Enabled (Default)）** | 代码块被替换为渲染好的 SVG 图表，可切换源码、全屏缩放（Code block is replaced with a rendered SVG diagram, with support for toggling source code and full-screen zooming）  |

Gemini 不原生渲染 Mermaid——只显示代码文本。此功能解决了用户拿到 flowchart/sequenceDiagram 代码后无法直接可视化的痛点。（Gemini does not natively render Mermaid—it only displays code text. This feature solves the pain point where users receive flowchart/sequenceDiagram code but cannot visualize it directly.）

**3. 技术机制（Technical Mechanism）**

| 层面（Aspect）                          | 实现（Implementation）                                                                                                                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mermaid` 库（`mermaid` Library）**   | 打包进扩展（v11.12.2），动态 `import('mermaid')` 懒加载（~1MB）（Bundled into the extension (v11.12.2), lazily loaded via dynamic `import('mermaid')` (~1MB)）                                                       |
| **代码块选择器（Code Block Selector）** | `code[data-test-id="code-content"]`（Gemini 专属）（`code[data-test-id="code-content"]` (Gemini-exclusive)）                                                                                                         |
| **语言检测（Language Detection）**      | 从 `.code-block-decoration` 读取语言标签；无标签时用内容启发式检测（`isMermaidCode`）（Reads language tags from `.code-block-decoration`; uses content heuristic detection (`isMermaidCode`) when tags are missing） |
| **主题检测（Theme Detection）**         | `.theme-host.dark-theme`（Gemini）、`html.dark`、`body[data-theme="dark"]`、系统偏好兜底（`.theme-host.dark-theme` (Gemini), `html.dark`, `body[data-theme="dark"]`, with system preferences as fallback）           |
| **DOM 变更（DOM Mutation）**            | 包裹 `.gv-mermaid-wrapper` + 切换按钮 + SVG 容器，隐藏原 `<code-block>`（Wraps with `.gv-mermaid-wrapper` + toggle buttons + SVG container, hiding the original `<code-block>`）                                     |
| **全屏查看器（Full-screen Viewer）**    | 滚轮缩放 + 拖拽平移 + ESC 关闭（Wheel zoom + drag panning + ESC to close）                                                                                                                                           |
| **`MutationObserver`**                  | 监听 `body` 变化（debounce 1000ms）处理流式新增代码块（Monitors `body` changes (debounced by 1000ms) to handle dynamically added streaming code blocks）                                                             |

**4. 为什么需要这个功能（Why This Feature Is Needed）**
AI 经常生成 Mermaid 图表代码（流程图、时序图、甘特图等），但 Gemini 不渲染这些代码——用户只看到纯文本。必须手动复制到 `mermaid.live` 才能看图。此功能让图表在对话中即时可视化，无需离开页面。（AI frequently generates Mermaid diagram code (flowcharts, sequence diagrams, Gantt charts, etc.), but Gemini does not render these codes—users only see plain text. Users must manually copy it to `mermaid.live` to view the diagram. This feature makes diagrams instantly visible within the conversation without leaving the page.）

**5. DeepSeek 是否需要（Whether DeepSeek Needs It）**
不需要。DeepSeek 原生就渲染了 Mermaid 图表。（No. DeepSeek natively renders Mermaid diagrams.）
根据之前导出适配器开发时的 DOM 分析，DeepSeek 的 Mermaid 代码块结构与 Gemini 完全不同：（Based on the DOM analysis during previous export adapter development, DeepSeek's Mermaid code block structure is completely different from Gemini's:）

- DeepSeek 代码块 banner 自带 "Diagram" / "Code" tab 切换（DeepSeek code block banner comes with native "Diagram" / "Code" tab toggles）
- 默认显示 SVG 渲染结果（而非纯文本代码）（Displays SVG rendered results by default (instead of plain text code)）
- 点击 "Code" tab 才显示源代码（Clicking the "Code" tab reveals the source code）
  这意味着 DeepSeek 已经内置了 Mermaid 即时渲染，用户不需要 Voyager 的此功能。（This means DeepSeek already has built-in instant Mermaid rendering, so users do not need this Voyager feature.）

**6. DeepSeek 原生 vs Voyager 实现对比（DeepSeek Native vs. Voyager Implementation Comparison）**

| 维度（Dimension）                     | DeepSeek 原生（DeepSeek Native）             | Voyager Mermaid Rendering                                                          |
| ------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| **渲染（Rendering）**                 | ✅ 自动渲染 SVG（Automatically renders SVG） | ✅ 自动渲染 SVG（Automatically renders SVG）                                       |
| **源码切换（Source Toggle）**         | ✅ Diagram/Code tab                          | ✅ 📊/</> 按钮（📊/</> buttons）                                                   |
| **全屏缩放（Full-screen Zoom）**      | ❌ 未见（Not observed）                      | ✅ 滚轮缩放 + 拖拽平移（Wheel zoom + drag panning）                                |
| **语法修复（Syntax Repair）**         | 未知（Unknown）                              | ✅ NBSP/零宽空格/subgraph 引号修复（NBSP/zero-width space/subgraph quote repairs） |
| **导出集成（Export Integration）**    | N/A                                          | ✅ 浅色 SVG 模板供 PDF/图片导出（Light-theme SVG templates for PDF/Image export）  |
| **启发式检测（Heuristic Detection）** | N/A                                          | ✅ 无标签时内容检测（Content detection when tags are missing）                     |

**7. 结论（Conclusion）**
DeepSeek 原生已有 Mermaid 渲染，不需要移植此功能。Voyager 的全屏缩放和语法修复是额外增值，但核心体验（对话中看图）DeepSeek 已满足。移植成本不低（需改写代码块选择器、语言检测、主题检测），而收益有限。（DeepSeek already has native Mermaid rendering, so porting this feature is unnecessary. Voyager's full-screen zoom and syntax repairs offer additional value, but DeepSeek already satisfies the core user experience (viewing diagrams in conversation). Porting costs are not low (requiring code block selectors, language detection, and theme detection rewrites), while the return is limited.）

---

## Quote Reply 功能分析（Quote Reply Feature Analysis）

DeepSeek - 需要(Needed)
**1. 它是什么（What It Is）**
选中 AI 回答中的任意文本 → 选区旁浮现工具栏 → 点击"引用回复" → 选中文本以 Markdown 引用块格式（`> 内容`）自动插入输入框，无需手动复制粘贴再打 `> `。（Select any text in an AI response → a floating toolbar appears near the selection → click "Quote Reply" → the selected text is automatically inserted into the input box in Markdown blockquote format (`> content`), without manually copy-pasting and typing `> `.）

**2. 在 Gemini 中的体验（Experience in Gemini）**

| 步骤（Step） | 操作（Action）                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1            | 鼠标选中 AI 回答中的一段文字（Select a passage of text in an AI response with the mouse）                                                                                       |
| 2            | 250ms 防抖后，选区上方浮现工具栏（含引用按钮 + 可选高亮按钮）（After 250ms debounce, a toolbar appears above the selection with a quote button and optional highlight buttons） |
| 3            | 点击引用按钮 → 文本逐行加 `> ` 前缀 → 自动插入输入框（Click the quote button → text is prefixed line-by-line with `> ` → automatically inserted into the input box）            |
| 4            | 光标定位到引用块末尾，用户可立即继续输入跟进问题（Cursor is placed at the end of the quote block; user can immediately continue typing a follow-up question）                   |

**解决的问题（Problem Solved）**（GitHub Issue #119）：日常对话中经常需要针对 AI 输出中的某个具体片段做跟进或反驳，传统方式是复制 → 切到输入框 → 粘贴 → 手打 `> `，太繁琐。（In daily conversations, we often need to follow up on or refute a specific part of the AI's output. The traditional method involves copying that text, switching to the input box, pasting, and manually typing `> `, which is tedious.）

**3. 技术机制（Technical Mechanism）**

| 层面（Aspect）                       | 实现（Implementation）                                                                                                                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **选区检测（Selection Detection）**  | `mouseup` + `keyup` 监听，250ms 防抖（Listens to `mouseup` + `keyup` with 250ms debounce）                                                                                                                                              |
| **合法性校验（Validity Checks）**    | 排除侧边栏、导航、输入框自身、Gemini 欢迎语等（Excludes sidebar, navigation, input box itself, Gemini welcome message, etc.）                                                                                                           |
| **消息选择器（Message Selectors）**  | `.conversation-container` + Gemini Angular 组件（`user-query`、`model-response` 等），10+ 级 fallback（`.conversation-container` + Gemini Angular components (`user-query`, `model-response`, etc.) with 10+ level fallback）           |
| **输入框识别（Input Detection）**    | 7 级 fallback：`[data-testid="chat-input"]` → `rich-textarea` → 通用 `contenteditable` → `textarea` 兜底（7-level fallback: `[data-testid="chat-input"]` → `rich-textarea` → generic `contenteditable` → `textarea` as final fallback） |
| **文本注入（Text Injection）**       | `<textarea>` 直接拼 value；`contenteditable` 用 `execCommand('insertText')` + Range.insertNode 降级（`<textarea>`: directly concatenate value; `contenteditable`: `execCommand('insertText')` with Range.insertNode fallback）          |
| **LaTeX 保留（LaTeX Preservation）** | 引用数学公式时还原 `$...$` / `$$...$$` 源码（Restores `$...$` / `$$...$$` source code when quoting math formulas）                                                                                                                      |
| **IME 兼容（IME Compatibility）**    | 中日韩输入法组合状态不丢失（Chinese/Japanese/Korean input method composition state is preserved）                                                                                                                                       |

**4. 为什么需要这个功能（Why This Feature Is Needed）**
AI 对话中经常需要针对回答的某个具体片段做引用跟进，手动复制粘贴再格式化太繁琐。此功能一键完成引用插入，是通用的效率增强需求，不限于 Gemini。（In AI conversations, we frequently need to quote and follow up on a specific fragment of a response. Manually copying, pasting, and formatting is tedious. This feature completes the quote insertion in one click, serving as a universal efficiency enhancement need, not limited to Gemini.）

**5. DeepSeek 是否需要（Whether DeepSeek Needs It）**
需要。DeepSeek 同样是 AI 对话界面，用户同样需要针对 AI 回答中的具体片段做引用跟进。这是通用效率需求，不是 Gemini 独有。（Yes. DeepSeek is likewise an AI chat interface where users equally need to quote and follow up on specific fragments of AI responses. This is a universal efficiency need, not unique to Gemini.）

**6. DeepSeek 是否原生有此功能（Whether DeepSeek Has This Natively）**
没有。主流 AI 对话平台（Gemini、ChatGPT、Claude、DeepSeek）均不提供原生的"选中文本 → 引用回复"功能。DeepSeek 的 Web UI 较简洁，没有已知的引用回复机制。（No. Mainstream AI chat platforms (Gemini, ChatGPT, Claude, DeepSeek) do not provide a native "select text → quote reply" feature. DeepSeek's Web UI is clean with no known quote reply mechanism.）

**7. 移植难度（Porting Difficulty）**
中等。现有 fallback 机制使移植主要是追加选择器而非重写逻辑。（Medium. The existing fallback mechanism makes porting primarily about adding selectors rather than rewriting logic.）

| 需要做的事（Task）                                                                                                           | 工作量（Effort） |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `selectors.ts` 添加 DeepSeek 消息选择器（`.ds-message`、`.ds-markdown`）（Add DeepSeek message selectors to `selectors.ts`） | 小（Small）      |
| `chatInput/index.ts` 添加 DeepSeek 输入框选择器（Add DeepSeek input selector to `chatInput/index.ts`）                       | 小（Small）      |
| 验证 DeepSeek 输入框类型（textarea / contenteditable）并测试注入路径（Verify DeepSeek input type and test injection path）   | 中（Medium）     |
| LaTeX 处理适配（DeepSeek 数学公式 DOM 结构可能不同）（Adapt LaTeX handling (DeepSeek math formula DOM may differ)）          | 中（Medium）     |

---
