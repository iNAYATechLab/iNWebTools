import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SerpPreviewCard } from '../SeoWebmaster/SerpPreviewCard';
import { SocialCardPreview } from '../SeoWebmaster/SocialCardPreview';

describe('SEO & Webmaster Interactive Components', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('SerpPreviewCard Component', () => {
    it('renders Google Search simulation with character gauges and mode switching', () => {
      render(
        <SerpPreviewCard
          title="iNWebTools — Free 1070+ Online Web Tools"
          url="https://inwebtools.com/tools/seo"
          description="High speed privacy friendly developer and SEO tools for webmasters."
        />,
      );

      expect(screen.getByText('Google SERP Simulator')).toBeDefined();
      expect(screen.getByText('iNWebTools — Free 1070+ Online Web Tools')).toBeDefined();
      expect(screen.getByText('https://inwebtools.com/tools/seo')).toBeDefined();
      expect(
        screen.getByText('High speed privacy friendly developer and SEO tools for webmasters.'),
      ).toBeDefined();

      const mobileBtn = screen.getByRole('button', { name: /📱 Mobile/i });
      fireEvent.click(mobileBtn);
      expect(screen.getByRole('button', { name: /📱 Mobile/i })).toBeDefined();
    });
  });

  describe('SocialCardPreview Component', () => {
    it('renders Open Graph and Twitter Card tabs', () => {
      render(
        <SocialCardPreview
          title="iNWebTools Pro Suite"
          description="Everything a modern developer needs."
          imageUrl="https://inwebtools.com/og-banner.png"
          url="https://inwebtools.com"
          siteName="iNWebTools"
        />,
      );

      expect(screen.getByText('Social Share Card Simulator')).toBeDefined();
      expect(screen.getByText('iNWebTools Pro Suite')).toBeDefined();
      expect(screen.getByText('Everything a modern developer needs.')).toBeDefined();

      const twitterTab = screen.getByRole('button', { name: /Twitter \/ X/i });
      fireEvent.click(twitterTab);
      expect(screen.getByRole('button', { name: /Twitter \/ X/i })).toBeDefined();
    });
  });
});
