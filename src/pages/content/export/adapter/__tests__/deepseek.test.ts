import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DOMContentExtractor } from '@/features/export/services/DOMContentExtractor';
import { deepseekAdapter } from '@/features/plugins/sites/adapters/deepseek';

import { buildDeepSeekAdapter } from '../platform/deepseek';

describe('DeepSeek export adapter', () => {
  const adapter = buildDeepSeekAdapter(deepseekAdapter);

  beforeEach(() => {
    document.body.replaceChildren();
    DOMContentExtractor.setExportAdapter(adapter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts conversation id from DeepSeek url formats', () => {
    window.history.pushState({}, '', '/a/chat/s/12345678-abcd-ef01-2345-6789abcdef01');
    expect(adapter.extractConversationIdFromUrl()).toBe('12345678-abcd-ef01-2345-6789abcdef01');

    window.history.pushState({}, '', '/chat/session-987654');
    expect(adapter.extractConversationIdFromUrl()).toBe('session-987654');
  });

  it('extracts conversation title correctly', () => {
    document.title = '美元外币利息计算 - DeepSeek';
    // Title suffix " - DeepSeek" is stripped (mirrors upstream DeepSeek-Voyager).
    expect(adapter.extractConversationTitle()).toBe('美元外币利息计算');

    // Fallback to active item when title is generic
    window.history.pushState({}, '', '/');
    document.title = 'DeepSeek';
    const activeNav = document.createElement('div');
    activeNav.className = 'selected';
    activeNav.textContent = '美元利息分析';
    document.body.appendChild(activeNav);

    expect(adapter.extractConversationTitle()).toBe('美元利息分析');
  });

  it('extracts KaTeX display formulas using annotation source', () => {
    const assistant = document.createElement('div');
    assistant.className = 'ds-markdown ds-assistant-message-main-content';
    assistant.innerHTML = `
      <p class="ds-markdown-paragraph">计算公式如下：</p>
      <span class="katex-display ds-markdown-math">
        <span class="katex">
          <span class="katex-mathml">
            <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
              <semantics>
                <annotation encoding="application/x-tex">利息 = 本金 \\times 年利率 \\times \\frac{存期（天数）}{计息天数}</annotation>
              </semantics>
            </math>
          </span>
        </span>
      </span>
    `;

    const extracted = DOMContentExtractor.extractAssistantContent(assistant);
    expect(extracted.hasFormulas).toBe(true);
    expect(extracted.text).toContain(
      '$$\n利息 = 本金 \\times 年利率 \\times \\frac{存期（天数）}{计息天数}\n$$',
    );
  });

  it('extracts code blocks with language from banner and pre content', () => {
    const assistant = document.createElement('div');
    assistant.className = 'ds-markdown ds-assistant-message-main-content';
    assistant.innerHTML = `
      <div class="md-code-block md-code-block-light">
        <div class="md-code-block-banner-wrap">
          <div class="md-code-block-banner md-code-block-banner-lite">
            <div class="_121d384">
              <div class="d2a24f03"><span class="d813de27">python</span></div>
            </div>
          </div>
        </div>
        <pre><span>import requests</span>
<span>def get_rate():</span>
<span>    return 7.2</span></pre>
      </div>
    `;

    const extracted = DOMContentExtractor.extractAssistantContent(assistant);
    expect(extracted.hasCode).toBe(true);
    expect(extracted.text).toContain(
      '```python\nimport requests\ndef get_rate():\n    return 7.2\n```',
    );
  });

  it('extracts tables embedded in ds-scroll-area', () => {
    const assistant = document.createElement('div');
    assistant.className = 'ds-markdown ds-assistant-message-main-content';
    assistant.innerHTML = `
      <div class="ds-scroll-area">
        <table>
          <thead>
            <tr><th>存款类型</th><th>计息天数</th><th>结果</th></tr>
          </thead>
          <tbody>
            <tr><td>美元活期</td><td>360天</td><td>0.0833 美元</td></tr>
          </tbody>
        </table>
      </div>
    `;

    const extracted = DOMContentExtractor.extractAssistantContent(assistant);
    expect(extracted.hasTables).toBe(true);
    expect(extracted.text).toContain('| 存款类型 | 计息天数 | 结果 |');
    expect(extracted.text).toContain('| 美元活期 | 360天 | 0.0833 美元 |');
  });

  it('extracts user turn text accurately', () => {
    const userContainer = document.createElement('div');
    userContainer.className = 'ds-user-message';
    userContainer.innerHTML = '<p>存入100美元，年利率0.3%，存期100天，利息怎么算？</p>';

    const extracted = DOMContentExtractor.extractUserContent(userContainer);
    expect(extracted.text).toBe('存入100美元，年利率0.3%，存期100天，利息怎么算？');
  });
  it('extracts DeepSeek R1 reasoning process from ds-think-content', () => {
    const assistant = document.createElement('div');
    assistant.className = 'ds-assistant-message-container';
    assistant.innerHTML = `
      <div class="e1675d8b ds-think-content _767406f">
        <div class="ds-markdown">
          <ol>
            <li><p class="ds-markdown-paragraph"><strong>解构用户的请求</strong>：存入100美元，利率0.3%。</p></li>
          </ol>
        </div>
      </div>
      <div class="ds-markdown ds-assistant-message-main-content">
        <p class="ds-markdown-paragraph">计算公式如下：利息 = 本金 × 年利率</p>
      </div>
    `;

    const extracted = DOMContentExtractor.extractAssistantContent(assistant);
    expect(extracted.text).toContain('> **Thinking Process:**');
    expect(extracted.text).toContain('解构用户的请求');
    expect(extracted.text).toContain('计算公式如下：利息 = 本金 × 年利率');
  });

  it('strips R1 "已思考…/收起" collapse toggle noise from assistant body', () => {
    const assistant = document.createElement('div');
    assistant.className = 'ds-assistant-message-main-content';
    // Simulate the collapse toggle text DeepSeek renders inside the body.
    assistant.innerHTML = `
      <div class="ds-collapse"><span class="ds-collapse-label">已思考（8秒）</span><span class="ds-collapse-trigger">收起</span></div>
      <div class="ds-markdown"><p class="ds-markdown-paragraph">正式回答核心内容</p></div>
    `;

    const extracted = DOMContentExtractor.extractAssistantContent(assistant);
    expect(extracted.text).not.toContain('已思考');
    expect(extracted.text).not.toContain('收起');
    expect(extracted.text).toContain('正式回答核心内容');
  });

  it('excludes decorative favicon images from assistant content', () => {
    const assistant = document.createElement('div');
    assistant.className = 'ds-markdown ds-assistant-message-main-content';
    assistant.innerHTML = `
      <img src="https://www.google.com/s2/favicons?domain=https://tailscale.com&sz=128" alt="Image" />
      <img src="https://example.com/content-photo.png" alt="Photo" />
      <p class="ds-markdown-paragraph">Tailscale 是一个基于 WireGuard 的平台。</p>
    `;

    const extracted = DOMContentExtractor.extractAssistantContent(assistant);
    expect(extracted.text).not.toContain('google.com/s2/favicons');
    expect(extracted.text).toContain('https://example.com/content-photo.png');
    expect(extracted.hasImages).toBe(true);
  });
});
