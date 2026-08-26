# TDD: DeepSeek 导出适配器对齐方案

## 1. 文档信息

| 项目     | 内容                                     |
| -------- | ---------------------------------------- |
| 文档类型 | Technical Design Document (TDD)          |
| 主题     | DeepSeek 导出适配器对齐 Gemini / ChatGPT |
| 版本     | v1.0                                     |
| 日期     | 2026-08-26                               |
| 状态     | Implemented                              |
| 目标受众 | 开发团队                                 |
| 分支     | feat-deepseek                            |

## 2. 背景与问题描述

### 2.1 背景

Voyager 扩展目前支持三个平台的对话导出：Gemini（原生站点）、ChatGPT（plugin platform）、DeepSeek（plugin platform）。三者的导出适配器实现成熟度不一，DeepSeek 作为最新接入的平台，存在若干差距需要对齐。

### 2.2 问题描述

通过对三个适配器的详细对比分析，发现 DeepSeek 在以下三个维度存在明确差距：

| 差距项         | 现状                                                                       | 影响                                                    | 优先级 |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | ------ |
| 选择器稳定性   | 依赖 hash 类名 `.d29f3d7d` / `.fbb737a4` / `._4f9bf79`                     | DeepSeek 前端重新构建即可能失效，导致导出功能完全不可用 | 高     |
| 附件处理       | `getUserAttachmentCandidates` 返回所有 `[role="group"][aria-label]` 无过滤 | 装饰性容器被误判为附件，导出结果含噪音                  | 中     |
| 角色判定冗余度 | 仅靠单一选择器字符串，无多选择器回退                                       | 单一选择器失效时无 fallback，鲁棒性低                   | 中     |

### 2.3 DeepSeek 独有优势（非差距）

- 唯一支持 R1 思考链导出为 blockquote
- 唯一实现 Mermaid React fiber 源码反查 + 标签点击物化

## 3. 目标与约束

### 3.1 目标

1. **选择器稳定性**：将稳定属性（`data-role`）和语义类名（`.ds-message`）的优先级提升到 hash 类名之前，hash 类名降级为 fallback 或移除
2. **附件处理**：实现类似 ChatGPT 的交叉验证过滤，排除非附件的 `[role="group"]` 元素
3. **角色判定冗余度**：扩展选择器列表，提供多级 fallback，提高鲁棒性

### 3.2 约束

- **向后兼容**：不破坏现有导出功能，hash 类名选择器在确认无风险后才能移除
- **测试覆盖**：所有修改必须通过 `bun run typecheck` + `bun run test` + `bun run build:chrome`
- **版本号**：保持 1.7.1 不变
- **分支**：所有修改在 `feat-deepseek` 分支上
- **DOM 调研依赖**：选择器重构依赖 DeepSeek 当前真实 DOM 结构，需先执行调研脚本

## 4. 方案对比

### 4.1 方案 A：激进重构（移除所有 hash 类名）

**描述**：直接移除 `userTurn` 和 `assistantTurn` 中的所有 hash 类名，仅保留稳定属性和语义类名。

**优点**：

- 代码最简洁
- 不依赖任何不稳定类名

**缺点**：

- 如果 DeepSeek 当前 DOM 仍依赖 hash 类名匹配，可能导致选择器完全不匹配
- 风险过高，无法在不调研 DOM 的情况下安全执行

**适用场景**：确认 DeepSeek 已全面使用 `data-role` 等稳定属性后

### 4.2 方案 B：渐进对齐（稳定优先 + hash fallback）— 推荐

**描述**：将稳定属性和语义类名的优先级提升，hash 类名降级为选择器列表末尾的 fallback。附件处理实现交叉验证过滤。

**优点**：

- 向后兼容：hash 类名仍作为 fallback 存在
- 渐进式：即使稳定属性不存在，hash 类名仍能匹配
- 风险可控：逐步验证，可回退

**缺点**：

- 选择器列表较长
- hash 类名仍存在（作为 fallback），未完全消除风险

**适用场景**：当前阶段，DOM 结构未完全确认

### 4.3 方案 C：保守观察（仅修附件处理）

**描述**：不修改选择器，仅优化附件处理逻辑。

**优点**：

- 零风险
- 改动最小

**缺点**：

- 选择器稳定性问题未解决
- 角色判定冗余度问题未解决

**适用场景**：时间紧迫，仅修复最紧急问题

### 4.4 方案对比矩阵

| 维度           | 方案 A（激进） | 方案 B（渐进） | 方案 C（保守） |
| -------------- | -------------- | -------------- | -------------- |
| 选择器稳定性   | ✅ 完全解决    | ✅ 大幅改善    | ❌ 未解决      |
| 附件处理       | ❌ 未涉及      | ✅ 解决        | ✅ 解决        |
| 角色判定冗余度 | ✅ 解决        | ✅ 解决        | ❌ 未解决      |
| 向后兼容       | ❌ 高风险      | ✅ 兼容        | ✅ 兼容        |
| 实施复杂度     | 低             | 中             | 低             |
| 推荐           | 否             | **是**         | 否             |

## 5. 推荐方案与理由

**推荐方案 B（渐进对齐）**。

理由：

1. **风险可控**：hash 类名作为 fallback 保留，即使稳定属性匹配失败也不会完全不可用
2. **全面覆盖**：三个差距项全部解决，对齐效果完整
3. **向后兼容**：不破坏任何现有功能，已有测试应全部通过
4. **可验证**：每个步骤都有明确的验证点，可逐步确认

## 6. 实施步骤与里程碑

### 阶段 0：DOM 结构调研（前置条件）

**目标**：获取 DeepSeek 当前真实 DOM 结构，确认哪些属性/类名是稳定的

**操作方式**：在 DeepSeek 页面 DevTools Console 执行调研脚本

**脚本 A — 用户消息 DOM 结构**：

    // 在 Console 中执行，结果复制贴回
    copy(JSON.stringify(
      Array.from(document.querySelectorAll('.ds-message, [data-role="user"], [class*="user-message"]')).slice(0,2).map(el => ({
        tag: el.tagName,
        classes: el.className,
        dataAttrs: Object.fromEntries(Array.from(el.attributes).filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])),
        parentClasses: el.parentElement?.className,
        childStructure: Array.from(el.children).map(c => c.tagName + '.' + c.className.slice(0,50))
      }))
    ))

**脚本 B — 助手消息 DOM 结构**：

    copy(JSON.stringify(
      Array.from(document.querySelectorAll('.ds-markdown, .ds-assistant-message-main-content, [data-role="assistant"]')).slice(0,2).map(el => ({
        tag: el.tagName,
        classes: el.className,
        dataAttrs: Object.fromEntries(Array.from(el.attributes).filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])),
        parentClasses: el.parentElement?.className,
        childStructure: Array.from(el.children).map(c => c.tagName + '.' + c.className.slice(0,50))
      }))
    ))

**脚本 C — 附件/图片结构**：

    copy(JSON.stringify(
      Array.from(document.querySelectorAll('.ds-message, [data-role="user"]')).slice(0,3).map(el => {
        const groups = el.querySelectorAll('[role="group"][aria-label]');
        const imgs = el.querySelectorAll('img');
        return {
          groups: Array.from(groups).map(g => ({
            ariaLabel: g.getAttribute('aria-label'),
            hasButton: !!g.querySelector('button[aria-label]'),
            buttonLabel: g.querySelector('button[aria-label]')?.getAttribute('aria-label'),
            childTags: Array.from(g.children).map(c => c.tagName + '.' + (c.className||'').slice(0,30))
          })),
          imgs: Array.from(imgs).map(i => ({ src: i.src?.slice(0,50), alt: i.alt, ariaHidden: i.getAttribute('aria-hidden') }))
        }
      })
    ))

**交付物**：三份 JSON 结果，用于后续步骤的选择器设计

**里程碑**：M0 — DOM 调研完成（需用户协助）

---

### 阶段 1：选择器稳定性对齐（高优先级）

**目标**：减少 hash 类名依赖，优先使用稳定属性

**前提**：阶段 0 调研结果

#### 步骤 1.1：调研结果分析

- 确认 `data-role="user"` / `data-role="assistant"` 是否在所有消息上存在
- 确认 `.ds-message` / `.ds-markdown` / `.ds-assistant-message-main-content` 是否稳定
- 确认 hash 类名 `.d29f3d7d` / `.fbb737a4` / `._4f9bf79` 是否仍存在

#### 步骤 1.2：重构 userTurn 选择器

**文件**：`src/features/plugins/sites/adapters/deepseek.ts:16`

**现状**：

    '.d29f3d7d.ds-message, .fbb737a4, .ds-user-message, [data-role="user"], div[class*="user-message"]'

**目标**（根据调研结果调整优先级）：

    '[data-role="user"], .ds-user-message, .ds-message, div[class*="user-message"], .d29f3d7d.ds-message, .fbb737a4'

**设计原则**：

1. 稳定属性（`data-role`）排第一
2. 语义类名（`.ds-user-message`、`.ds-message`）排第二
3. 模糊匹配（`div[class*="user-message"]`）排第三
4. hash 类名（`.d29f3d7d`、`.fbb737a4`）降级为 fallback

#### 步骤 1.3：重构 assistantTurn 选择器

**文件**：`src/features/plugins/sites/adapters/deepseek.ts:18`

**现状**：

    '.ds-assistant-message-main-content, .ds-markdown, ._4f9bf79, .ds-message--assistant, [data-role="assistant"]'

**目标**：

    '[data-role="assistant"], .ds-assistant-message-main-content, .ds-message--assistant, .ds-markdown, ._4f9bf79'

**注意**：`.ds-markdown` 保留但排倒数第二位（可能匹配用户消息中的 Markdown 渲染），hash 类名 `._4f9bf79` 排最后

#### 步骤 1.4：验证

- `bun run typecheck`
- `bunx vitest run src/pages/content/export --reporter=dot`
- `bun run build:chrome`
- 用户在 DeepSeek 页面测试导出，确认消息配对正确

**里程碑**：M1 — 选择器稳定性对齐完成

---

### 阶段 2：附件处理对齐（中优先级）

**目标**：实现类似 ChatGPT 的交叉验证过滤，排除非附件容器

**前提**：阶段 0 脚本 C 的调研结果

#### 步骤 2.1：分析 ChatGPT 附件过滤逻辑

**参考文件**：`src/pages/content/export/adapter/platform/chatgpt.ts`

ChatGPT 的过滤策略：查找 `[role="group"][aria-label]`，对每个 group 检查内部按钮的 aria-label 是否与 group 的 aria-label 匹配，只返回匹配的 group。

#### 步骤 2.2：实现 DeepSeek 附件过滤

**文件**：`src/pages/content/export/adapter/platform/deepseek.ts:59-61`

**现状**：

    function getUserAttachmentCandidates(element: HTMLElement): HTMLElement[] | undefined {
      return Array.from(element.querySelectorAll<HTMLElement>('[role="group"][aria-label]'));
    }

**目标**（根据调研结果调整过滤策略）：

    function getUserAttachmentCandidates(element: HTMLElement): HTMLElement[] | undefined {
      const groups = Array.from(element.querySelectorAll<HTMLElement>('[role="group"][aria-label]'));
      return groups.filter((group) => {
        const label = group.getAttribute('aria-label');
        if (!label) return false;
        // 策略 1：内部有按钮且按钮 aria-label 匹配
        const button = group.querySelector('button[aria-label]');
        if (button && button.getAttribute('aria-label') === label) return true;
        // 策略 2：内部有可见图片
        if (group.querySelector('img:not([aria-hidden="true"])')) return true;
        // 策略 3：内部有文件/上传类元素
        if (group.querySelector('[class*="file"], [class*="upload"]')) return true;
        return false;
      });
    }

#### 步骤 2.3：优化 extractUserImage

**文件**：`src/pages/content/export/adapter/platform/deepseek.ts:55-57`

**现状**：

    function extractUserImage(element: HTMLElement): NodeListOf<HTMLImageElement> {
      return element.querySelectorAll('img');
    }

**目标**：

    function extractUserImage(element: HTMLElement): NodeListOf<HTMLImageElement> {
      return element.querySelectorAll('img:not([aria-hidden="true"])');
    }

#### 步骤 2.4：验证

- 用户在 DeepSeek 页面发送带图片/文件的消息，测试导出是否正确包含附件且无噪音

**里程碑**：M2 — 附件处理对齐完成

---

### 阶段 3：角色判定冗余度对齐（中优先级）

**目标**：扩展选择器列表，提供多级 fallback

#### 步骤 3.1：扩展 userTurn 选择器

在阶段 1.2 的基础上，根据调研结果添加更多 fallback：

    '[data-role="user"], .ds-user-message, .ds-message, div[class*="user-message"], div[class*="ds-message"][class*="user"], .d29f3d7d.ds-message, .fbb737a4'

#### 步骤 3.2：扩展 assistantTurn 选择器

在阶段 1.3 的基础上，根据调研结果添加更多 fallback：

    '[data-role="assistant"], .ds-assistant-message-main-content, .ds-message--assistant, .ds-markdown.ds-assistant-message-main-content, .ds-markdown, ._4f9bf79'

#### 步骤 3.3：验证

- 确保扩展后的选择器不会误匹配（特别是 `.ds-markdown` 不能匹配用户消息）
- 用户测试导出，确认消息配对正确

**里程碑**：M3 — 角色判定冗余度对齐完成

---

### 阶段 4：测试与交付

#### 步骤 4.1：更新单元测试

**文件**：`src/pages/content/export/adapter/__tests__/deepseek.test.ts`

- 添加使用新选择器的测试用例
- 确保旧 hash 类名选择器仍能工作（向后兼容）

#### 步骤 4.2：完整验证流程

    bun run typecheck
    bun run test
    bun run build:chrome

#### 步骤 4.3：用户端到端测试

在 DeepSeek 页面导出多种对话类型：

- 简单文本对话
- 带代码块的对话
- 带 Mermaid 图表的对话
- 带 R1 思考过程的对话
- 带图片附件的对话
- 带文件附件的对话

#### 步骤 4.4：提交与推送

    git add -A
    git commit -m "refactor(deepseek): align adapter selectors and attachment filtering with ChatGPT/Gemini"
    git push origin feat-deepseek

**里程碑**：M4 — 交付完成

## 7. 风险分析与缓解

| 风险                                            | 概率 | 影响 | 缓解措施                                                                                                   |
| ----------------------------------------------- | ---- | ---- | ---------------------------------------------------------------------------------------------------------- |
| DeepSeek DOM 结构已变化，调研脚本结果与预期不符 | 中   | 高   | 阶段 0 先调研，根据实际结果调整方案                                                                        |
| `.ds-markdown` 选择器匹配用户消息导致角色错位   | 低   | 高   | 将 `.ds-markdown` 排在 assistantTurn 选择器列表末尾，优先匹配更具体的 `.ds-assistant-message-main-content` |
| hash 类名移除后某些边缘情况无法匹配             | 低   | 中   | 方案 B 保留 hash 类名作为 fallback，不移除                                                                 |
| 附件过滤策略误过滤真实附件                      | 中   | 中   | 保留三种过滤策略（按钮匹配/图片/文件类名），任一匹配即保留                                                 |
| 新选择器在旧 DeepSeek 版本上不工作              | 低   | 低   | 保留所有旧选择器作为 fallback                                                                              |

## 8. 待确认事项（已全部解决）

| 编号 | 事项                                           | 确认方式     | 结论                                                                                                                                            |
| ---- | ---------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1   | DeepSeek 是否在所有消息上使用 `data-role` 属性 | MCP 脚本 A/B | **否**。DeepSeek 不使用 `data-role` 属性。用户/助手区分依赖 hash 类名 `.d29f3d7d`。                                                             |
| Q2   | `.ds-message` 是否仅用于用户消息               | MCP 脚本 A/B | **否**。`.ds-message` 同时匹配用户和助手消息。需配合 `.d29f3d7d` 区分用户。                                                                     |
| Q3   | 附件容器的 DOM 结构                            | MCP 脚本 C   | 测试的 3 个对话中无用户附件。图片均为助手消息中的外部站点图标（`cdn.deepseek.com/site-icons/`）。过滤逻辑已实现三策略防御。                     |
| Q4   | hash 类名是否仍存在                            | MCP 脚本 A/B | **是**。`.d29f3d7d`、`.fbb737a4`、`._63c77b1` 仍存在。但 `.fbb737a4` 是 `.d29f3d7d.ds-message` 的子元素（内容包装器），不能作为独立消息选择器。 |
| Q5   | 是否需要 Chrome DevTools MCP                   | 用户决定     | **已安装**。全局用户级别，包名 `chrome-devtools-mcp@latest`。                                                                                   |

## 8.1 MCP 调研发现与修复记录（2026-08-26）

通过 Chrome DevTools MCP 在真实 DeepSeek 页面执行调研脚本，发现并修复以下问题：

### 发现 1：`.fbb737a4` 导致用户消息重复匹配

**问题**：`.fbb737a4` 是 `.d29f3d7d.ds-message` 的**子元素**（内容包装器），不是独立消息容器。

DOM 结构：

```
<div class="d29f3d7d ds-message _63c77b1">    ← 外层消息容器
  <div class="fbb737a4">                       ← 内层内容包装器
    ...文本...
  </div>
</div>
```

将 `.fbb737a4` 加入 userTurn 选择器导致 `querySelectorAll` 返回 4 个匹配（2 个外层 + 2 个内层），破坏 `collectChatPairs` 配对。

**修复**：从 userTurn 移除 `.fbb737a4`（commit `dfb7bc4f`）。

**验证**：

- 修复前：userCount=4，配对顺序 user→user→assistant→user→user→assistant（错误）
- 修复后：userCount=2，配对顺序 user→assistant→user→assistant（正确）

### 发现 2：中文 UI 导致代码块语言提取错误

**问题**：DeepSeek UI 为中文本地化，代码块 banner 文本为 `python复制下载` 而非 `pythoncopydownload`。语言提取逻辑仅搜索英文按钮关键词 `['copy', 'download', 'run', 'fullscreen']`，导致提取的语言为 `python复制下载` 而非 `python`。

**修复**：添加中文按钮关键词 `['复制', '下载', '运行', '全屏']`（commit `215a22ab`）。

**验证**（在"中行汇率Python代码"对话上测试 6 个代码块）：
| Banner 文本 | 修复前 | 修复后 |
|-------------|--------|--------|
| `bash复制下载` | `bash复制下载` | `bash` |
| `python复制下载` | `python复制下载` | `python` |
| `text复制下载` | `text复制下载` | `text` |
| `javascript复制下载` | `javascript复制下载` | `javascript` |
| `yaml复制下载` | `yaml复制下载` | `yaml` |
| `json复制下载` | `json复制下载` | `json` |

### 发现 3：`.ds-markdown` 单独使用会误匹配 R1 思考块

**问题**：`.ds-markdown` 不仅用于助手消息主体，也用于 R1 思考过程内部。在测试对话中，`.ds-markdown` 匹配 8 个元素（2 个助手主体 + 6 个思考块内部），而 `.ds-markdown.ds-assistant-message-main-content` 仅匹配 2 个。

**修复**：将 assistantTurn 中的单独 `.ds-markdown` 替换为 `.ds-markdown.ds-assistant-message-main-content`（commit `c5ea58aa`）。

### 发现 4：DeepSeek 代码块结构

DeepSeek 代码块 DOM 结构：

```
<div class="md-code-block md-code-block-light">
  <div class="md-code-block-banner-wrap">
    <div class="md-code-block-banner md-code-block-banner-lite">
      python复制下载                    ← 语言名 + 按钮文本（无分隔符）
    </div>
  </div>
  <pre><code>...代码内容...</code></pre>
</div>
```

- `<code>` 元素**无语言类名**（`codeClass: ""`）
- 语言信息仅在 banner 文本中，与按钮文本拼接无分隔符
- Mermaid 图表以 SVG 渲染，可能无 `<pre>` 源码（由 `prepareDeepSeekForExport` 处理）

## 9. 里程碑总览

| 里程碑 | 内容               | 依赖       | 交付物                                                       | 状态    |
| ------ | ------------------ | ---------- | ------------------------------------------------------------ | ------- |
| M0     | DOM 结构调研       | 用户协助   | MCP 调研结果                                                 | ✅ 完成 |
| M1     | 选择器稳定性对齐   | M0         | 重构后的 `deepseek.ts` 选择器                                | ✅ 完成 |
| M2     | 附件处理对齐       | M0         | 重构后的 `getUserAttachmentCandidates` 和 `extractUserImage` | ✅ 完成 |
| M3     | 角色判定冗余度对齐 | M1         | 扩展后的选择器列表                                           | ✅ 完成 |
| M4     | 测试与交付         | M1, M2, M3 | 通过全部验证的代码 + Git 提交                                | ✅ 完成 |

### 提交历史

| Commit     | 描述                                                                          |
| ---------- | ----------------------------------------------------------------------------- |
| `215a22ab` | fix(deepseek): handle Chinese button labels in code block language extraction |
| `dfb7bc4f` | fix(deepseek): remove .fbb737a4 from userTurn to prevent duplicate matches    |
| `c5ea58aa` | refactor(deepseek): align selectors and attachment filtering with real DOM    |
| `da5e7f5d` | fix(deepseek): suppress response container warning for DeepSeek               |
| `59c2dc79` | fix(deepseek): remove overly broad userTurn selector causing misattribution   |

## 10. 相关文件

| 文件路径                                                      | 修改内容                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `src/features/plugins/sites/adapters/deepseek.ts`             | userTurn / assistantTurn 选择器重构                      |
| `src/pages/content/export/adapter/platform/deepseek.ts`       | getUserAttachmentCandidates 过滤 + extractUserImage 优化 |
| `src/pages/content/export/adapter/__tests__/deepseek.test.ts` | 新增测试用例                                             |

## 11. 附录：三平台适配器对比矩阵

| 维度         | Gemini           | DeepSeek（现状）      | DeepSeek（目标）         | ChatGPT                    |
| ------------ | ---------------- | --------------------- | ------------------------ | -------------------------- |
| 角色判定     | 9+9 多选择器冗余 | 单一字符串（含 hash） | 多选择器 + hash fallback | `data-*` + resolveTurnRole |
| 选择器稳定性 | 中高             | 最脆弱                | 中高                     | 最稳定                     |
| 附件处理     | 精准自定义元素   | 无过滤                | 交叉验证过滤             | aria-label 交叉验证        |
| 思考过程     | 无               | 唯一完整支持          | 保持                     | 无                         |
| Mermaid      | 共享处理         | fiber + 标签点击      | 保持                     | 共享 `<pre>`               |
| 消息选择 UI  | 无               | 无                    | 无（未来考虑）           | 独有                       |
