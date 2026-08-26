import type { SiteAdapter, SiteCapability } from '../../types';

/**
 * DeepSeek adapter (chat.deepseek.com).
 * Observed stable class names come from real production DOM (verified 2026-08-26):
 * - user message: `.d29f3d7d.ds-message` (hash `.d29f3d7d` distinguishes user from assistant)
 * - assistant text: `.ds-markdown.ds-assistant-message-main-content`
 * - R1 reasoning: `.ds-think-content` (inner `.ds-markdown` — NOT used as assistant selector)
 * - Note: DeepSeek does NOT use `data-role` attributes; `.ds-message` matches BOTH user and assistant.
 * - `.fbb737a4` is a CHILD of `.d29f3d7d.ds-message` (content wrapper), NOT a separate message
 *   container — including it in userTurn causes duplicate matches that break collectChatPairs pairing.
 */
export const deepseekAdapter: SiteAdapter = {
  id: 'deepseek',
  label: 'DeepSeek',
  matches: ['https://chat.deepseek.com/*'],
  selectors: {
    userTurn: '.d29f3d7d.ds-message, .d29f3d7d, .ds-user-message, div[class*="user-message"]',
    assistantTurn:
      '.ds-assistant-message-main-content, .ds-markdown.ds-assistant-message-main-content, .ds-message--assistant, [data-role="assistant"]',
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
