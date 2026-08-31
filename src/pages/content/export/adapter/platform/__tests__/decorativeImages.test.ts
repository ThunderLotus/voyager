import { describe, expect, it } from 'vitest';

import { isDecorativeImageUrl } from '../decorativeImages';

describe('isDecorativeImageUrl', () => {
  it('flags Google favicon service URLs', () => {
    expect(
      isDecorativeImageUrl(
        'https://www.google.com/s2/favicons?domain=https://tailscale.com&sz=128',
      ),
    ).toBe(true);
  });

  it('flags generic favicon query endpoints', () => {
    expect(
      isDecorativeImageUrl(
        'https://icons.duckduckgo.com/ip3/tailscale.com.ico?foo=1'.replace('?foo=1', ''),
      ),
    ).toBe(false);
    expect(isDecorativeImageUrl('https://example.com/favicon?domain=x.com')).toBe(true);
  });

  it('flags static favicon files', () => {
    expect(isDecorativeImageUrl('https://example.com/favicon.ico')).toBe(true);
    expect(isDecorativeImageUrl('https://example.com/favicon.png')).toBe(true);
    expect(isDecorativeImageUrl('https://example.com/favicon.svg?v=2')).toBe(true);
  });

  it('keeps real content images', () => {
    expect(isDecorativeImageUrl('https://example.com/photos/chart.png')).toBe(false);
    expect(isDecorativeImageUrl('https://example.com/media/favicon-explained.jpg')).toBe(false);
    expect(isDecorativeImageUrl('')).toBe(false);
    expect(isDecorativeImageUrl(null)).toBe(false);
    expect(isDecorativeImageUrl(undefined)).toBe(false);
  });
});
