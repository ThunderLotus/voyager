import type { SiteAdapter, SiteCapability } from '../../types';

/**
 * DeepSeek adapter (chat.deepseek.com).
 * Observed stable class names come from real production DOM:
 * - user message: `.d29f3d7d.ds-message`
 * - assistant text: `.ds-markdown` / `.ds-assistant-message-main-content`
 * - R1 reasoning: `.ds-think-content` (inner `.ds-markdown`)
 */
export const deepseekAdapter: SiteAdapter = {
  id: 'deepseek',
  label: 'DeepSeek',
  matches: ['https://chat.deepseek.com/*'],
  selectors: {
    userTurn:
      '.d29f3d7d.ds-message, .fbb737a4, .ds-user-message, [data-role="user"], div[class*="user-message"]',
    assistantTurn:
      '.ds-assistant-message-main-content, .ds-markdown, ._4f9bf79, .ds-message--assistant, [data-role="assistant"]',
    composer: 'textarea, div[contenteditable="true"]',
    sidebar: 'a[href*="/a/chat/s/"], [class*="sidebar"], nav, aside',
  },
  theme: {
    hostSelector: 'html',
    lightSelector: 'html:not(.dark)',
    darkSelector: 'html.dark',
  },
  brandColor: '#4d6bfe', // DeepSeek brand blue
  capabilities: new Set<SiteCapability>(['chat', 'sidebar', 'composer', 'darkMode']),
};
