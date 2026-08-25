/**
 * Header/footer CMS types.
 *
 * Shared by the public site (which renders the layout) and the admin CMS
 * page (which edits it), so the two can never drift apart silently.
 */

export type LayoutLink = {
  label: string;
  url: string;
  newTab: boolean;
};

export type LayoutActionButton = LayoutLink & {
  variant: 'primary' | 'ghost';
};

export type LayoutNotice = {
  isVisible: boolean;
  text: string;
  linkLabel: string;
  linkUrl: string;
};

export type LayoutHeader = {
  logoUrl: string;
  siteTitle: string;
  tagline: string;
  navLinks: LayoutLink[];
  actionButtons: LayoutActionButton[];
  notice: LayoutNotice;
  showStatusPill: boolean;
  showLocaleToggle: boolean;
};

export type SocialPlatform =
  'facebook' | 'x' | 'linkedin' | 'github' | 'youtube' | 'instagram' | 'email' | 'website';

export type LayoutSocialLink = {
  platform: SocialPlatform;
  url: string;
  label: string;
};

export type LayoutColumn = {
  title: string;
  items: LayoutLink[];
};

export type LayoutNewsletter = {
  enabled: boolean;
  heading: string;
  description: string;
  buttonLabel: string;
  placeholder: string;
};

export type LayoutFooter = {
  copyrightText: string;
  tagline: string;
  columns: LayoutColumn[];
  socialLinks: LayoutSocialLink[];
  newsletter: LayoutNewsletter;
  showPrivacyNote: boolean;
};

export type LayoutConfig = {
  header: LayoutHeader;
  footer: LayoutFooter;
};

export type LayoutResponse = {
  value: LayoutConfig;
  updatedAt: string | null;
  updatedBy: string | null;
};

/** Mirrors DEFAULT_LAYOUT on the server. Used before the fetch resolves. */
export const DEFAULT_LAYOUT: LayoutConfig = {
  header: {
    logoUrl: '',
    siteTitle: 'iNWebTools',
    tagline: '',
    navLinks: [],
    actionButtons: [],
    notice: { isVisible: false, text: '', linkLabel: '', linkUrl: '' },
    showStatusPill: true,
    showLocaleToggle: true,
  },
  footer: {
    copyrightText: '© {year} iNWebTools · Built with care by iNAYA TechLab',
    tagline: '',
    columns: [],
    socialLinks: [],
    newsletter: {
      enabled: false,
      heading: 'Stay in the loop',
      description: '',
      buttonLabel: 'Subscribe',
      placeholder: 'you@example.com',
    },
    showPrivacyNote: true,
  },
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'facebook',
  'x',
  'linkedin',
  'github',
  'youtube',
  'instagram',
  'email',
  'website',
];
