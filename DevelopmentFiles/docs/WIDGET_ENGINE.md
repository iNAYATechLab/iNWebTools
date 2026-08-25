# Sidebar Widget Engine

How the dynamic sidebars work, why they are built this way, and what it takes to add a
new widget type.

The goal was a WordPress-style widget customizer: an operator arranges the sidebars from
the admin dashboard, and the website renders whatever they arranged. **Nothing about a
sidebar is hardcoded in a component** — placement, order, visibility, titles and every
per-widget setting live in one stored document.

---

## The data model

One JSON document, stored as a single row in `app_settings` under the key
`layout_sidebar_widgets`:

```jsonc
{
  "zones": {
    "left":  [ /* Widget[] */ ],
    "right": [ /* Widget[] */ ]
  }
}
```

A widget is exactly the shape the brief specified:

```ts
type Widget = {
  id: string;        // opaque, unique across BOTH zones
  type: string;      // key into the catalogue
  title: string;     // empty means "render no heading"
  settings: {};      // schema-driven, per type
  enabled: boolean;  // false = kept in the zone, not rendered
  position: number;  // renumbered from array order on every save
};
```

**One key, not one per zone.** A save is then atomic: the two sidebars can never disagree
about which revision they came from. This mirrors the header/footer CMS, which stores
both sections under `layout_header_footer` for the same reason.

**`position` is derived, never trusted.** Array order is what the admin sees and drags.
A `position` sent by the client is discarded and renumbered `0..n-1` from array order, so
the two representations cannot disagree.

---

## The catalogue is the single source of truth

`server/services/widgets.service.js` declares each widget type once, including its
settings **schema** — field key, kind, label, default, and limits:

```js
online_users: {
  type: 'online_users',
  name: 'Live Online Users',
  fields: [
    { key: 'refreshSeconds', kind: 'number', label: '…', default: 30, min: 10, max: 600 },
    { key: 'showDeviceBreakdown', kind: 'boolean', label: '…', default: true },
  ],
}
```

Three things are **derived** from that one declaration rather than restated:

| Derived thing | Where | How |
| --- | --- | --- |
| Server-side validation | `sanitiseSettings()` | Walks the schema, switches on `kind` |
| The admin settings form | `WidgetSettingsForm.tsx` | Renders a control per `kind` |
| The warehouse listing | `WidgetCustomizer/index.tsx` | Iterates the catalogue |

The catalogue is served at `GET /api/widgets/catalogue` rather than duplicated in the
client. That is what makes drift impossible: the form an admin fills in is generated from
exactly the schema the validator enforces. A field cannot exist in one and not the other.

### Supported field kinds

`text` · `textarea` · `html` · `url` · `image` · `number` · `boolean` · `select`

---

## Adding a widget type

Two edits. Nothing else changes.

1. **Server** — add an entry to `WIDGET_CATALOGUE` in
   `server/services/widgets.service.js`, declaring its fields.
2. **Client** — add one line to `WIDGET_REGISTRY` in
   `client/src/components/widgets/registry.tsx`, mapping the type to a component.

The warehouse, the settings form, validation and the live preview all pick it up
automatically.

### Forward compatibility

`resolveWidget()` returns a visible placeholder for a type it does not know, rather than
throwing. This is deliberate: a cached SPA can outlive a deploy that added a type, and
the right behaviour is to skip that one widget and render the rest of the page.

---

## API

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/widgets/config` | **public** | The arrangement the website renders |
| `POST /api/widgets/config` | **`requireAdmin`** | Save the arrangement |
| `GET /api/widgets/catalogue` | public | Type registry + settings schemas |
| `GET /api/widgets/public-stats` | public | Aggregate numbers for the live widgets |

### Why GET is public and POST is not

`GET` **must** be public: every visitor's first paint depends on it, and it contains
nothing private — only what is already visible on the page.

`POST` must not be, even though it shares the `/api/widgets` prefix. It rewrites the
sidebars of every page on the site and the Custom HTML widget carries markup. Left open
it would be a defacement and injection endpoint. It carries the same `requireAdmin` guard
as `/api/admin/*`, and `server/tests/widgets.test.js` pins that boundary.

### Why POST replaces instead of merging

The header/footer CMS merges per section, so sending only `header` preserves the stored
`footer`. The widget document deliberately does **not** work that way. A widget layout is
an arrangement, not a set of independent fields — "merge" has no meaning for a reorder,
and a merged delete would resurrect the removed widget. The editor always holds both
zones in memory, so it always sends a complete document.

### Why `public-stats` exists

The Live Online Users and System Stats widgets render on the **public** site, so they
cannot call `/api/admin` — that needs a staff token. Rather than loosen the admin route,
this endpoint exposes a deliberately narrow projection: **aggregate counts only**.

No session ids, no IP addresses, no user agents, no geography — none of the per-visitor
detail the admin view carries. Publishing "how many people are here" is a product
decision; publishing *who they are* is not. A test asserts on the serialised payload that
none of those field names appear, so a nested addition cannot leak one silently.

### Availability

Both public GETs degrade rather than fail. With the database down, `config` answers `200`
with built-in defaults and `public-stats` returns `null` for the DB-backed sections. A
widget outage must degrade to "shows the default sidebar", never to "the website is
broken".

---

## Security: the Custom HTML widget

This is the sharp edge of the whole feature, and the only place in the product that
renders stored markup with `dangerouslySetInnerHTML`.

The defence is a **parser-based allowlist** (`sanitize-html`), applied on the way in
**and** on the way out. Sanitising on read as well as write matters: a document stored by
an older, laxer build must not be trusted just because it is already in the table.

**Stripped:** `<script>`, `<style>`, `<iframe>`, `<object>`, `<form>`, `<input>`, every
`on*` event handler, and any URL scheme outside `http` / `https` / `mailto` / `tel`.

**Why the scheme check is not a formality:** React escapes text content but will happily
render a `javascript:` href. `allowedSchemes` is the actual defence.

**Why server-side, not in the component:** a client-side sanitiser is bypassed by anything
that talks to the API directly, and the stored value will also be read by the Phase 2
extension and Phase 3 mobile app. Sanitising at the boundary protects every consumer at
once.

Links that open a new tab are rewritten to `rel="noopener noreferrer nofollow"` — without
`noopener` the opened page can reach back through `window.opener` and navigate the
original.

### Other hardening

- Unknown settings keys are **dropped**, not passed through. An attribute nobody declared
  is an attribute nobody validated.
- Numeric settings are clamped to their declared `min`/`max`.
- Widget ids are constrained to `[A-Za-z0-9_-]`; duplicates across both zones are
  replaced rather than rejecting the save, because losing an admin's entire layout to a
  client-side id collision is the worse outcome.
- Zones are capped at 12 widgets so one request cannot store an unbounded document that
  then ships to every visitor.

### The styling contract

`.widget-prose` in `client/src/styles/index.css` and `HTML_POLICY.allowedTags` are two
halves of one contract: every tag styled there is a tag the sanitiser permits. When one
changes, check the other — an allowed-but-unstyled tag renders as unformatted text and
looks like a bug to whoever wrote the content.

---

## Rendering on the site

`WidgetLayout` computes its grid from which zones actually have visible widgets:

- both populated → `sidebar | main | sidebar`
- one populated → `sidebar | main`
- neither → **the original single-column page, unchanged**

That last case matters. An admin who deletes every widget must get the original layout
back, not an empty column pushing the transcriber off-centre. `SidebarZone` returns
`null` for an empty zone, which is what makes it work with no special-casing elsewhere.

Below `xl` the sidebars stack underneath the transcriber: widgets are supporting content,
and on a narrow screen the audio uploader has to come first.

**Disabled widgets are filtered before render, not hidden with CSS.** The component never
mounts, so a hidden stats widget stops polling entirely.

### Shared polling

Two widget types want the same numbers. `useWidgetStats` runs **one** module-scope poller
that fans out to every subscriber at the shortest interval any of them requested, and
pauses while the tab is hidden — a background tab re-polling for numbers nobody is
looking at is waste, and it inflates the very "online now" figure it fetches.

### Recent Transcriptions is client-side

That widget reads `localStorage`, not the server. Transcription does not require an
account, so there is no user to key server-side rows against for an anonymous visitor,
and keeping transcript text in the browser matches the privacy posture of the upload path
(the audio file is deleted immediately). It uses `useSyncExternalStore`, which is the hook
built for an external store that can change from another tab.

### Cross-component messaging

The Quick Tools widget sets the *audio* language, but it is rendered by the sidebar
renderer and has no parent relationship to `TranscribePage`. It publishes the choice on a
window event (`inwebtools:audio-language`) rather than threading a context through the
whole widget engine.

Note the two distinct meanings of "language" in that widget, labelled separately in the
UI because conflating them is a real trap:

- the **interface** locale (Bengali/English chrome), owned by `LocaleContext`
- the **audio** language hint sent to the ASR model

---

## The admin builder

`/AdminDashboard/Settings/WidgetCustomizer`, built on **dnd-kit**.

### Two drag kinds, one context

Told apart by the dragged id:

- `source:<type>` — a warehouse item. Dropping it **creates** a new instance; the
  warehouse entry never moves, because the warehouse is an infinite source, not a list
  being reordered.
- `<widget id>` — a placed widget. Dropping it reorders within a zone or moves it across.

Drop targets are likewise two kinds: `zone:<name>` (the column, **including its empty
space**) and a placed widget's id (insert at that position). Both are needed — the column
target is what makes an *emptied* sidebar able to receive a widget again, since with no
sortable children there would be nothing for the drag to collide with.

### Drag handles, not draggable cards

Listeners are bound to a dedicated grip, never the whole card. The cards contain toggles,
delete buttons and — when expanded — text inputs. A card-wide drag listener would steal
pointer events from all of them: selecting text in a textarea would start a drag.

`PointerSensor` uses a 5px activation distance so a click on the handle is still a click.

### Keyboard and touch

Every warehouse item also has an **Add** button. Drag-and-drop is the showcase
interaction; it must not be the only way to complete the task. `KeyboardSensor` with
`sortableKeyboardCoordinates` covers keyboard reordering.

### `DragOverlay`

Renders the dragged item in a portal, outside the scrolling columns — without it a card
dragged out of an `overflow-hidden` panel is clipped at the panel's edge.

### Save semantics

The whole document is saved at once, and the editor then **adopts the server's response**
rather than keeping its local copy. The returned document has been sanitised and
renumbered, so trusting the local one would leave the editor showing HTML the site will
not actually render.

A `dirty` flag against the last saved snapshot drives the Save/Discard buttons and a
`beforeunload` guard — arranging a sidebar is many small edits that are tedious to redo.

On success the client-side config cache is invalidated so a visitor's next page load sees
the new arrangement.

### Live preview

Renders the **real** widget components through the same registry the public site uses,
against the in-progress draft. A mock preview would drift from production the first time
a widget changed; this cannot, because there is only one implementation of each widget.

Two caveats are stated in the UI rather than hidden:

1. Custom HTML shows **unsanitised** there, because sanitising happens server-side on
   save. After saving, the editor adopts the cleaned copy and the preview updates — so an
   admin whose `<script>` disappears on save is not left confused.
2. Widgets render at preview width, not the site's sidebar width.

The preview wraps its children in `LocaleProvider`: Quick Tools calls `useLocale`, and the
admin area deliberately sits outside the public locale context.

---

## Tests

| File | Covers |
| --- | --- |
| `server/tests/widgets.test.js` (25) | Public GET degradation, the admin auth boundary, the HTML sanitiser, document normalisation, and that `public-stats` leaks no per-visitor fields |
| `client/src/components/widgets/__tests__/widgets.test.tsx` (9) | Registry coverage, unknown-type fallback, zone rendering, disabled widgets not mounting, and the real config → fetch → render path |

---

## Files

**Server**

- `services/widgets.service.js` — catalogue, sanitising, persistence
- `routes/widgets.routes.js` — the four endpoints
- `tests/widgets.test.js`

**Client — rendering**

- `types/widgets.ts` · `hooks/useWidgetConfig.ts` · `hooks/useWidgetStats.ts`
- `services/transcriptionHistory.ts`
- `components/widgets/` — `registry.tsx`, `WidgetLayout.tsx`, `SidebarZone.tsx`,
  `WidgetShell.tsx`, and the six widget components

**Client — admin**

- `pages/AdminDashboard/Settings/WidgetCustomizer/` — `index.tsx`, `DropZoneColumn.tsx`,
  `PlacedWidgetCard.tsx`, `WarehouseItem.tsx`, `WidgetSettingsForm.tsx`,
  `WidgetPreview.tsx`, `WidgetIcon.tsx`
