import {
  DOMContentExtractor,
  type ExtractedContent,
} from '@/features/export/services/DOMContentExtractor';
import type { SiteAdapter } from '@/features/plugins/types';

import type { ExportPlatformAdapter } from './contract';

function extractTitle(): string {
  // Strip trailing " - DeepSeek" like the upstream DeepSeek-Voyager metadata.
  const title = document.title?.replace(/\s*-\s*DeepSeek\s*$/i, '')?.trim();
  if (title && title !== 'DeepSeek' && title !== 'New chat') {
    return title;
  }

  const active = document.querySelector(
    'nav [class*="active"], nav [class*="selected"], [class*="active-chat"], a[href*="/a/chat/s/"], [class*="selected"], [class*="active"]',
  );
  const activeTitle = active?.textContent?.trim();
  if (activeTitle) return activeTitle;

  const conversationId = extractId();
  return conversationId ? `Conversation ${conversationId.slice(0, 8)}` : 'DeepSeek Conversation';
}

function extractId(): string | null {
  // Prefer the canonical 36-char UUID route used by DeepSeek.
  const path = window.location.pathname;
  return (
    path.match(/\/a\/chat\/s\/([a-f0-9-]{36})/i)?.[1] ??
    path.match(/\/a\/chat\/s\/([^/?#]+)/)?.[1] ??
    path.match(/\/chat\/([^/?#]+)/)?.[1] ??
    null
  );
}

const ROOT_CANDIDATES = ['main', '[role="main"]', '.ds-scroll-area', '#root', '.chat-container'];

// Walk up from a user message to the nearest scrolling container, mirroring the
// fork's getConversationRoot: the scroll area is the stable conversation root.
function resolveRoot(userSelectors: string[], doc: Document = document): HTMLElement {
  const user = doc.querySelector<HTMLElement>(
    userSelectors.join(',') || '.ds-message, [data-role="user"]',
  );
  if (user) {
    let parent = user.parentElement;
    while (parent && parent !== doc.body) {
      if (parent.classList.contains('ds-scroll-area') || parent.matches('main')) return parent;
      parent = parent.parentElement;
    }
  }
  return doc.querySelector<HTMLElement>('main') || (doc.body as HTMLElement);
}

function extractUserImage(element: HTMLElement): NodeListOf<HTMLImageElement> {
  return element.querySelectorAll('img:not([aria-hidden="true"])');
}

function getUserAttachmentCandidates(element: HTMLElement): HTMLElement[] | undefined {
  const groups = Array.from(element.querySelectorAll<HTMLElement>('[role="group"][aria-label]'));
  return groups.filter((group) => {
    const label = group.getAttribute('aria-label');
    if (!label) return false;
    const button = group.querySelector('button[aria-label]');
    if (button && button.getAttribute('aria-label') === label) return true;
    if (group.querySelector('img:not([aria-hidden="true"])')) return true;
    if (group.querySelector('[class*="file"], [class*="upload"]')) return true;
    return false;
  });
}

const USER_TEXT_BLOCK_TAGS = new Set([
  'ADDRESS',
  'BLOCKQUOTE',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'P',
  'PRE',
]);

function readStructuredUserText(root: HTMLElement): string {
  const parts: string[] = [];
  const appendLineBreak = (): void => {
    if (parts.length > 0 && !parts.at(-1)?.endsWith('\n')) parts.push('\n');
  };
  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push((node.textContent || '').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' '));
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === 'BR') {
      parts.push('\n');
      return;
    }
    const block = USER_TEXT_BLOCK_TAGS.has(node.tagName);
    if (block) appendLineBreak();
    node.childNodes.forEach(visit);
    if (block) appendLineBreak();
  };

  root.childNodes.forEach(visit);
  return (
    parts
      .join('')
      .replace(/[\u200b\u00a0]/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      // Strip DeepSeek R1 "已思考（n秒）/ 思考过程 / 收起" collapse toggle noise
      // (from the upstream DeepSeek-Voyager cleanupDeepSeekClone hardening).
      .replace(/^\s*已思考[（(]?.*?[）)]?\s*$/gm, '')
      .replace(/^\s*思考过程.*$/gm, '')
      .replace(/^\s*收起\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

export function deepseekExtractUserText(
  _textLines: NodeListOf<HTMLElement>,
  textParts: string[],
  element: HTMLElement,
): void {
  const contentOnly = element.cloneNode(true) as HTMLElement;
  // Strip DeepSeek UI chrome (buttons, icons, focus rings, decorative svg).
  contentOnly
    .querySelectorAll(
      'button, .ds-icon-button, .ds-focus-ring, svg[class*="_9bc" i], [role="button"], [class*="think"]',
    )
    .forEach((el) => el.remove());
  const fallback = readStructuredUserText(contentOnly);
  if (fallback) textParts.push(fallback);
}

// Remove DeepSeek R1 collapse-toggle UI ("已思考… / 收起") from a root before
// extraction.  These are pure UI controls and never belong in exported text;
// deleting nodes at the DOM layer keeps the shared text walker platform-agnostic.
function stripDeepSeekCollapsedNoise(root: HTMLElement): void {
  root
    .querySelectorAll(
      '.ds-collapse, .ds-collapse-label, .ds-collapse-trigger, [class*="collapse"], [class*="toggle"]',
    )
    .forEach((el) => el.remove());
}

function extractAssistantImage(
  child: Element,
  htmlParts: string[],
  textParts: string[],
  flags: Pick<ExtractedContent, 'hasImages' | 'hasFormulas' | 'hasTables' | 'hasCode'>,
  tagName?: string,
  _DEBUG?: boolean,
  processedImageSrcs?: Set<string>,
): boolean | undefined {
  if (tagName !== 'img') return;
  const image = child as HTMLImageElement;
  if (image.getAttribute('aria-hidden') === 'true') return true;

  const src = image.getAttribute('src') || image.src || '';
  if (src && src !== 'about:blank' && !processedImageSrcs?.has(src)) {
    processedImageSrcs?.add(src);
    flags.hasImages = true;
    const alt = image.getAttribute('alt')?.trim() || 'Image';
    htmlParts.push(
      `<img src="${DOMContentExtractor.escapeHtmlAttribute(src)}" alt="${DOMContentExtractor.escapeHtmlAttribute(alt)}" />`,
    );
    textParts.push(`\n![${alt.replace(/\]/g, '\\]')}](${src})\n`);
  }
  return true;
}

export function deepseekExtractFormula(
  child: Element,
  flags: Pick<ExtractedContent, 'hasImages' | 'hasFormulas' | 'hasTables' | 'hasCode'>,
  htmlParts: string[],
  textParts: string[],
): boolean | undefined {
  // Support DeepSeek R1 reasoning chain (.ds-think-content / ._74c0879)
  if (
    child.classList.contains('ds-think-content') ||
    child.classList.contains('_74c0879') ||
    child.classList.contains('ds-think-block')
  ) {
    const thinkMarkdown = child.querySelector('.ds-markdown') || child;
    // Strip "已思考… / 收起" toggle noise and collapse markers.
    const thinkText = readStructuredUserText(thinkMarkdown as HTMLElement)
      .replace(/\s*已思考.*$/g, '')
      .replace(/\s*收起\s*$/g, '')
      .trim();
    if (thinkText) {
      const quoteLines = thinkText
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      textParts.push(`\n> **Thinking Process:**\n>\n${quoteLines}\n\n`);
      htmlParts.push(
        `<blockquote><strong>Thinking Process:</strong><br>${DOMContentExtractor.escapeHtml(thinkText).replace(/\n/g, '<br>')}</blockquote>`,
      );
    }
    (child as Element & { processedByGV?: boolean }).processedByGV = true;
    return true;
  }

  // Check for KaTeX block formula or DeepSeek custom math container
  if (
    !child.classList.contains('katex-display') &&
    !child.classList.contains('katex') &&
    !child.classList.contains('ds-markdown-math')
  ) {
    return;
  }

  const annotation =
    child.querySelector('annotation[encoding="application/x-tex"]') ||
    child.querySelector('annotation');
  const latex = (
    annotation?.textContent ||
    child.getAttribute('data-math-source') ||
    child.getAttribute('aria-label') ||
    ''
  ).trim();
  if (!latex) return;

  flags.hasFormulas = true;
  htmlParts.push(
    `<div class="math-block" data-math="${DOMContentExtractor.escapeHtmlAttribute(latex)}">${child.outerHTML}</div>`,
  );
  textParts.push(`\n$$\n${latex}\n$$\n`);
  (child as Element & { processedByGV?: boolean }).processedByGV = true;
  return true;
}

// --- Mermaid source extraction helpers ---

const MERMAID_KEYWORDS_RE =
  /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|pie|gantt|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4\w*)\b/im;

function isMermaidSource(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 15 &&
    value.includes('\n') &&
    MERMAID_KEYWORDS_RE.test(value)
  );
}

/**
 * Search a React fiber tree for Mermaid source code stored in component
 * props or hooks state.  DeepSeek keeps the Mermaid source in React-internal
 * state; this walker traverses `memoizedProps` and the `memoizedState` hooks
 * linked list looking for a string that resembles Mermaid source.
 */
function findMermaidSourceInFiber(element: Element): string | null {
  const fiberKey = Object.keys(element).find(
    (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
  );
  if (!fiberKey) return null;

  const visited = new WeakSet<object>();

  function searchValue(value: unknown, depth: number): string | null {
    if (depth > 8 || value === null || value === undefined) return null;
    if (typeof value === 'string') return isMermaidSource(value) ? value : null;
    if (typeof value !== 'object') return null;
    if (visited.has(value as object)) return null;
    visited.add(value as object);
    try {
      for (const key of Object.keys(value as object)) {
        if (key.startsWith('__') || key.startsWith('_')) continue;
        const result = searchValue((value as Record<string, unknown>)[key], depth + 1);
        if (result) return result;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  let fiber: any = (element as any)[fiberKey];
  while (fiber) {
    if (fiber.memoizedProps) {
      const result = searchValue(fiber.memoizedProps, 0);
      if (result) return result;
    }
    let state: any = fiber.memoizedState;
    while (state) {
      const result = searchValue(state.memoizedState, 0);
      if (result) return result;
      state = state.next;
    }
    fiber = fiber.return;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return null;
}

/**
 * Trigger a React tab click via native events and, as a fallback, by
 * calling the handler directly through the fiber.
 */
function triggerTabClick(tab: HTMLElement): void {
  tab.click();
  tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  tab.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  tab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  try {
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    tab.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
  } catch {
    /* PointerEvent not available */
  }

  const fiberKey = Object.keys(tab).find(
    (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
  );
  if (!fiberKey) return;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  let fiber: any = (tab as any)[fiberKey];
  while (fiber) {
    const props = fiber.memoizedProps;
    if (props) {
      for (const handlerName of ['onClick', 'onPointerDown', 'onMouseDown'] as const) {
        const handler = props[handlerName];
        if (typeof handler === 'function') {
          try {
            handler({
              preventDefault: () => {},
              stopPropagation: () => {},
              nativeEvent: new MouseEvent('click', { bubbles: true }),
              target: tab,
              currentTarget: tab,
              type: 'click',
            });
          } catch {
            /* ignore */
          }
        }
      }
    }
    fiber = fiber.return;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/**
 * Async hook called before DOM extraction.  For each Mermaid code block
 * lacking a `<pre>` source element, tries to obtain the original Mermaid
 * source via React fiber search (stored in `data-mermaid-source`) or by
 * clicking the "Code" tab and waiting for `<pre>` to appear.
 */
export async function prepareDeepSeekForExport(signal?: AbortSignal): Promise<void> {
  const mermaidBlocks = Array.from(document.querySelectorAll('.md-code-block')).filter(
    (block) => !block.querySelector('pre') && block.querySelector('svg'),
  );
  if (mermaidBlocks.length === 0) return;

  const needsTabClick: Element[] = [];

  for (const block of mermaidBlocks) {
    const source = findMermaidSourceInFiber(block);
    if (source) block.setAttribute('data-mermaid-source', source);
    else needsTabClick.push(block);
  }
  if (needsTabClick.length === 0 || signal?.aborted) return;

  for (const block of needsTabClick) {
    const tabs = block.querySelectorAll('[role="tab"], [class*="segmented"] [class*="item"]');
    for (const tab of tabs) {
      if (tab.textContent?.trim().toLowerCase() === 'code') {
        triggerTabClick(tab as HTMLElement);
        break;
      }
    }
  }

  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (signal?.aborted) return;
    if (needsTabClick.every((block) => block.querySelector('pre'))) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

export function deepseekExtractCodeBlock(
  child: Element,
  htmlParts: string[],
  textParts: string[],
  flags: Pick<ExtractedContent, 'hasImages' | 'hasFormulas' | 'hasTables' | 'hasCode'>,
  tagName?: string,
): boolean | undefined {
  const isMdCodeBlock = child.classList.contains('md-code-block');
  if (!isMdCodeBlock && tagName !== 'pre') return;

  let preElement: HTMLPreElement | null = null;
  let language = '';

  if (isMdCodeBlock) {
    preElement = child.querySelector('pre');
    const bannerText =
      child.querySelector('.md-code-block-banner, [class*="banner"]')?.textContent || '';
    // DeepSeek Mermaid blocks show "Diagram" in the banner; set language
    // directly instead of parsing the banner text which includes button labels.
    if (/diagram/i.test(bannerText)) {
      language = 'mermaid';
    } else {
      // DeepSeek concatenates language name with button labels without
      // separators (e.g. "htmlcopydownloadrun" or "python复制下载").
      // Truncate at the first known button keyword to recover the real
      // language.  Include Chinese labels for localized UIs.
      const buttonKeywords = [
        'copy',
        'download',
        'run',
        'fullscreen',
        '复制',
        '下载',
        '运行',
        '全屏',
      ];
      let langEnd = bannerText.length;
      for (const keyword of buttonKeywords) {
        const idx = bannerText.toLowerCase().indexOf(keyword);
        if (idx > 0 && idx < langEnd) langEnd = idx;
      }
      language = bannerText.slice(0, langEnd).trim().toLowerCase();
    }

    // DeepSeek renders Mermaid diagrams as SVG without a <pre> source.
    // Try data-mermaid-source (set by prepareDeepSeekForExport via fiber
    // search), then fall back to innerText.  Always return true to prevent
    // processNodes from recursing into SVG and leaking CSS/markup.
    if (!preElement) {
      const mermaidSource = child.getAttribute('data-mermaid-source');
      if (mermaidSource) {
        flags.hasCode = true;
        language = 'mermaid';
        htmlParts.push(
          `<pre><code class="language-mermaid">${DOMContentExtractor.escapeHtml(mermaidSource)}</code></pre>`,
        );
        textParts.push(`\n\`\`\`mermaid\n${mermaidSource}\n\`\`\`\n`);
      } else {
        // Clone and strip banner/style/svg, then extract clean text.
        const clone = child.cloneNode(true) as HTMLElement;
        clone
          .querySelectorAll('[class*="banner"], style, svg, [class*="segmented"]')
          .forEach((el) => el.remove());
        const svgText = (clone.textContent || '').trim();
        if (svgText && child.querySelector('svg')) {
          flags.hasCode = true;
          language = 'mermaid';
          htmlParts.push(
            `<pre><code class="language-mermaid">${DOMContentExtractor.escapeHtml(svgText)}</code></pre>`,
          );
          textParts.push(`\n\`\`\`mermaid\n${svgText}\n\`\`\`\n`);
        }
      }
      (child as Element & { processedByGV?: boolean }).processedByGV = true;
      return true;
    }
  } else {
    preElement = child as HTMLPreElement;
  }

  if (!preElement) return;

  const codeElement = preElement.querySelector('code') || preElement;
  const code = preElement.textContent || codeElement.textContent || '';
  if (!language) {
    const className = (codeElement.getAttribute('class') || '').toLowerCase();
    language = className.match(/language-([a-z0-9+#_.-]+)/i)?.[1] ?? '';
  }

  if (code.trim()) {
    flags.hasCode = true;
    htmlParts.push(
      `<pre><code class="language-${language}">${DOMContentExtractor.escapeHtml(code)}</code></pre>`,
    );
    textParts.push(`\n\`\`\`${language}\n${code}\n\`\`\`\n`);
    (child as Element & { processedByGV?: boolean }).processedByGV = true;
    if (codeElement !== child) {
      (codeElement as Element & { processedByGV?: boolean }).processedByGV = true;
    }
  }
  return true;
}

export function deepseekExtractInlineFormula(
  element: Element,
  htmlParts: string[],
  textParts: string[],
): boolean | undefined {
  if (!element.classList.contains('katex') && !element.classList.contains('ds-markdown-math')) {
    return;
  }
  const isDisplay =
    element.classList.contains('katex-display') || element.closest('.katex-display') !== null;

  const annotation =
    element.querySelector('annotation[encoding="application/x-tex"]') ||
    element.querySelector('annotation');
  const latex = (
    annotation?.textContent ||
    element.getAttribute('data-math-source') ||
    element.getAttribute('aria-label') ||
    ''
  ).trim();
  if (!latex) return;

  htmlParts.push(
    `<span class="${isDisplay ? 'math-block' : 'math-inline'}" data-math="${DOMContentExtractor.escapeHtmlAttribute(latex)}">${element.outerHTML}</span>`,
  );
  textParts.push(isDisplay ? `\n$$\n${latex}\n$$\n` : `$${latex}$`);
  (element as Element & { processedByGV?: boolean }).processedByGV = true;
  return true;
}

export function buildDeepSeekAdapter(site: SiteAdapter): ExportPlatformAdapter {
  return {
    site,
    getUserSelectors: () => [site.selectors.userTurn],
    getAssistantSelectors: () => [site.selectors.assistantTurn],
    getConversationRootCandidates: () => ROOT_CANDIDATES,
    extractConversationTitle: extractTitle,
    extractConversationIdFromUrl: extractId,
    shouldPreloadHistory: () => false,
    resolveConversationRoot: resolveRoot,
    extractUserImage,
    extractUserText: deepseekExtractUserText,
    getUserAttachmentCandidates,
    extractAssistantImage,
    extractFormula: deepseekExtractFormula,
    extractCodeBlock: deepseekExtractCodeBlock,
    extractInlineFormula: deepseekExtractInlineFormula,
    stripCollapsedNoise: stripDeepSeekCollapsedNoise,
    prepareForExport: prepareDeepSeekForExport,
  };
}
