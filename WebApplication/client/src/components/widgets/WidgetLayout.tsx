/**
 * The public page body: left sidebar, the transcriber, right sidebar.
 *
 * Layout strategy
 * ---------------
 * The sidebars are driven entirely by the stored config, so the number of
 * columns is not known until it arrives. Rather than branch through several
 * hardcoded grid classes, the column template is computed from which zones
 * actually have visible widgets:
 *
 *   both zones populated -> sidebar | main | sidebar
 *   one zone populated   -> sidebar | main
 *   neither              -> main only, centred exactly as before the engine
 *
 * That last case matters: an admin who deletes every widget must get the
 * original single-column page back, not an empty column pushing the
 * transcriber off-centre.
 *
 * Below `xl` the sidebars stack underneath the transcriber. Widgets are
 * supporting content — on a narrow screen the audio uploader has to come
 * first, and a sidebar squeezed to phone width is unreadable anyway.
 *
 * While the config is loading nothing is reserved for the sidebars. The
 * transcriber renders immediately at full width and widgets slot in when they
 * arrive; blocking first paint on a decorative sidebar would be the wrong
 * trade, and a reserved-but-empty gutter looks broken if the request fails.
 */

import { useWidgetConfig } from '../../hooks/useWidgetConfig';
import { TranscribePage } from '../../pages/TranscribePage';
import { SidebarZone } from './SidebarZone';

export function WidgetLayout() {
  const { config } = useWidgetConfig();

  const left = config.zones.left.filter((w) => w.enabled);
  const right = config.zones.right.filter((w) => w.enabled);

  const hasLeft = left.length > 0;
  const hasRight = right.length > 0;

  // No widgets: the original layout, untouched.
  if (!hasLeft && !hasRight) return <TranscribePage />;

  const columns =
    hasLeft && hasRight
      ? 'xl:grid-cols-[17rem_minmax(0,1fr)_17rem]'
      : 'xl:grid-cols-[17rem_minmax(0,1fr)]';

  return (
    <div
      className={`mx-auto grid w-full max-w-[100rem] flex-1 grid-cols-1 gap-6 px-4 py-8 sm:px-6 ${columns}`}
    >
      {hasLeft && (
        <SidebarZone
          widgets={left}
          label="Left sidebar"
          // `xl:order-1` keeps the visual order correct while letting the
          // sidebar fall *below* the transcriber on smaller screens.
          className="xl:sticky xl:top-24 xl:order-1 xl:self-start"
        />
      )}

      {/*
        min-w-0 is load-bearing: without it a long transcript line makes this
        grid track refuse to shrink and the sidebars get pushed off-screen.
      */}
      <div className="order-first min-w-0 xl:order-2">
        <TranscribePage embedded />
      </div>

      {hasRight && (
        <SidebarZone
          widgets={right}
          label="Right sidebar"
          className="xl:sticky xl:top-24 xl:order-3 xl:self-start"
        />
      )}
    </div>
  );
}
