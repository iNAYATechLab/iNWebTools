/**
 * Widget type -> React component mapping.
 *
 * This is the *only* place the client knows which component renders which
 * stored `type`. Everything else — the sidebars, the admin customizer, the
 * preview — goes through `resolveWidget`, so adding a widget type means adding
 * one catalogue entry on the server and one line here.
 *
 * An unknown type resolves to a visible placeholder rather than throwing or
 * rendering nothing. That is a forward-compatibility decision: a stored
 * document may legitimately reference a type a newer server knows about and
 * this bundle does not (a cached SPA after a deploy), and the correct
 * behaviour is to skip that widget while rendering the rest of the page.
 */

import type { ComponentType } from 'react';

import type { WidgetInstance } from '../../types/widgets';
import { ImageBannerWidget } from './ImageBannerWidget';
import { OnlineUsersWidget } from './OnlineUsersWidget';
import { QuickToolsWidget } from './QuickToolsWidget';
import { RecentTranscriptionsWidget } from './RecentTranscriptionsWidget';
import { SystemStatsWidget } from './SystemStatsWidget';
import { TextHtmlWidget } from './TextHtmlWidget';
import { UnknownWidget } from './WidgetShell';

export type WidgetComponent = ComponentType<{ widget: WidgetInstance }>;

export const WIDGET_REGISTRY: Record<string, WidgetComponent> = {
  text_html: TextHtmlWidget,
  image_banner: ImageBannerWidget,
  online_users: OnlineUsersWidget,
  recent_transcriptions: RecentTranscriptionsWidget,
  quick_tools: QuickToolsWidget,
  system_stats: SystemStatsWidget,
};

/** True when this build can render the given stored type. */
export const isKnownWidgetType = (type: string): boolean => type in WIDGET_REGISTRY;

/** Component for a stored type, or the placeholder. Never throws. */
export function resolveWidget(type: string): WidgetComponent {
  return WIDGET_REGISTRY[type] ?? (() => <UnknownWidget type={type} />);
}
