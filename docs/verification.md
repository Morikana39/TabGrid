# TabGrid verification

## Refined Claymorphism material and motion — 2026-10-01

- **Automated: 131 tests pass.** Added a focused Clay case for inner-surface
  layout reflow at 240 ms, unchanged 120 ms reorder, and interrupted offsets.
  Shared material gates and live timing tests include Clay. Existing effect
  ownership, dialog coordinates, preferences, privacy, and worker tests pass.
  Syntax/module and whitespace checks pass.
- **Chrome-hosted HTTP fixture, simulated Chrome APIs: 27 assertions pass.**
  Checked Clay persistence, independent tint/font, quiet autofocus, menu entry/
  exit, immediate inert/focus release, outside-action shielding, native group
  swatches and action exclusions, aligned filters, phrase matching, individual
  results, second-click picker closure, and immediate close/Undo staying in grid.
  Cached preview imagery is synthetic. This is real Chrome rendering and native
  pointer/keyboard input on a local page, not native extension API verification.
- Root pointer sweep produced 3 swaps and 3 interrupted retargets; group
  row-crossing produced 2 swaps and 2 retargets. Both had ghost opacity 0, no
  animated outer slots, and maximum continuity jump 0. Motion-off drag produced
  2 swaps, no shifted surfaces/animated slots, and an immediate 383.2 px step,
  expected with movement disabled. Resize/disclosure created no movement effects.
- Menu/drawer effects measured 240 ms. Keyboard drawer docking remained fixed
  and contained on all four edges, with an untransformed/unblurred group panel.
  Group-header buttons and six root filter controls remained 40 px tall.
- Light/Dark, settings, group, and narrow screenshots were inspected. Nine Light
  and eight Dark base-color contrast samples passed 4.5:1; this is not a complete
  audit of inset shadows, every tint/group color, or screenshot imagery. At
  375×812 the dialog, vertical rail, and panel scrolling remained contained;
  ArrowDown selected the next category. Temporary viewport was reset. No OS
  motion setting or older Chrome binary was changed.
- No fixture console errors/warnings. Measurement-probe corrections (tint ID,
  picker focus/scroll timing, panel selectors, and transient Undo status) are
  recorded separately in browser-checks.json. The fixture retains connect-src
  none; material code/assets remain local. This is **not a physically network-
  disconnected acceptance run**.
- **Native Chrome extension remains pending** under the earlier extension-URL
  policy restriction: actual tab/group APIs, real screenshot capture, browser-wide
  commands, worker suspension/restart, and disconnected acceptance. No bypass
  was attempted. Physical touchscreen checks were not performed; TabGrid is a
  desktop extension. Disposable tabs/server closed; existing user changes
  preserved, no commit/push.

Evidence: output/clay-2026-10-01/browser-checks.json, clay-light.png,
clay-dark.png, clay-group.png, clay-settings.png, and clay-narrow.png.
Earlier sections are historical.

## Refined Neumorphism material and motion — 2026-10-01

- **Automated: 130 tests pass.** Added a focused case for Neumorphism reflow on
  inner surfaces at 200 ms while reorder retains 120 ms. Shared material gates
  and live timing tests now include Neumorphism. Existing interruption, effect
  ownership, dialog coordinates, preferences, privacy, and worker tests pass.
  Syntax/module and whitespace checks pass.
- **Chrome-hosted HTTP fixture, simulated Chrome APIs: 29 assertions pass.**
  Checked Neumorphism persistence, independent tint/font, menu entry/exit and
  immediate inert/focus release, group action exclusions/outside-action shielding,
  aligned filters, phrase matching, flattened matching results, and picker toggle.
  Cached preview imagery is synthetic. This is real Chrome rendering and pointer/
  keyboard input on a local page, not native Chrome extension API verification.
- Pointer drag: root sweep produced 2 swaps and 2 interrupted retargets; group
  row-crossing produced 1 swap/retarget. Both had ghost opacity 0, no animated
  outer slots, and maximum continuity jump 0. Motion-off drag produced 2 swaps,
  no shifted surfaces/animated slots, and an immediate 383.2 px step, expected
  with movement disabled. Disclosure and card resizing created no movement
  effects with that preference off.
- Neumorphism menu/drawer effects measured 200 ms. The group drawer remained
  fixed and contained on all four edges using keyboard docking, with an
  untransformed, unblurred group panel. All group-header buttons and six root
  filter controls remained 40 px tall. Flat retained no surface shadows and
  180 ms effects; Glass retained navigation blur, blur-free cards, and 220 ms.
- Light/Dark and settings/group screenshots were inspected. Eight Light and
  five Dark base-color contrast samples passed 4.5:1. A separate calculated
  check covers text/muted/accent on the matte plane and both convex-gradient
  endpoints in all 44 tint/mode combinations; minimum is 4.56:1. The first
  calculation found 4.47:1 in Cold luxury Light, fixed by reducing the ending
  shade. This is not a pixel-by-pixel contrast audit of inset shadows, every
  group color, or screenshot background.
- At 375×812, the settings dialog, vertical category rail, and contained panel
  scrolling fit; ArrowDown selected the next category. Temporary viewport was
  reset. System-motion gates have focused tests; no OS preference or older
  Chrome binary was changed. Initial measurement-selector corrections are
  recorded separately in browser-checks.json.
- No fixture console errors/warnings. The fixture keeps connect-src none, and
  all material assets/code remain local. This is **not a physically network-
  disconnected acceptance run**.
- **Native Chrome extension remains pending** under the earlier extension-URL
  policy restriction: actual tab/group actions, real screenshot capture,
  browser-wide commands, worker suspension/restart, and disconnected acceptance.
  No bypass was attempted. Physical touchscreen checks were not performed;
  TabGrid remains a desktop extension. Disposable tabs/server closed; existing
  user changes preserved, no commit/push.

Evidence: output/neumorphism-2026-10-01/browser-checks.json,
neumorphism-light.png, neumorphism-dark.png, neumorphism-group.png,
neumorphism-settings.png, and neumorphism-narrow.png. Earlier sections are historical.

## Refined Glassmorphism material and motion — 2026-09-30

- **Automated: 129 tests pass.** New cases verify live material-specific settling
  timing and that Glass layout reflow does not change accepted reorder timing.
  Existing effect ownership, interruption, dialog-coordinate, motion-gating,
  preference, privacy, and worker tests pass. Syntax/module and whitespace checks pass.
- **Chrome-hosted HTTP fixture, simulated Chrome APIs: 34 assertions pass.**
  Checked material persistence, independent tint/font choices, aligned filters,
  phrase picker matching, flattened results, second-click closure, outside-action
  shielding, immediate dialog focus restoration, history, close/Undo, and Flat
  timing after switching styles. The fixture contains synthetic cached previews.
- Actual pointer drag in the fixture: root sweep had 2 swaps and 2 interrupted
  retargets; group row crossing had 1 swap/retarget and 4 displaced surfaces.
  Both measured maximum continuity jump 0, ghost opacity 0, and no animated
  outer slots. Motion-off dragging had 2 swaps, no animated surfaces/slots, and
  a 287.4 px immediate step, expected when movement is disabled.
- Glass UI effects measured 220 ms; Flat remains 180 ms and reorder remains
  120 ms. Reflow animates only inner card surfaces. Closed overlays retain exit
  paint while becoming inert immediately. Pointer drawer docking retained the
  128×36 px moving full pill; keyboard expansion at all four edges stayed fixed
  to the viewport inside the group panel. Group controls remain 40 px tall.
- Light/Dark were visually inspected. Sampled navigation, primary button,
  sort, normal-card and last-opened text met 4.5:1. Translucent color calculations
  composite against the base canvas; this is a limited sample, not a complete
  audit of every tint or background pixel. At 375×812, settings and navigation
  remained contained and category arrow navigation passed. Viewport was reset.
- The `opaque` fixture forces the reduced-transparency **CSS** branch. It passed
  opaque fills, no sheen/blur, and operable menus. The OS preference was not
  changed. System motion gates have focused tests; no OS-level reduction change
  or older Chrome binary was tested in this run. Initial measurement-probe
  corrections are recorded in the evidence JSON.
- No fixture console warnings/errors. All material code/assets remain local;
  no liquidGL package, remote texture, shader rasterizer, or new dependency was
  introduced. The fixture keeps connect-src none. This is **not a physically
  network-disconnected acceptance run**.
- **Native Chrome extension remains pending** under the previously observed
  extension-URL policy restriction: actual tab/group actions, screenshot capture,
  browser-wide commands, worker suspension/restart, and disconnected acceptance.
  Physical touchscreen checks were not performed; this is a desktop extension.
  Disposable tabs/server were closed; existing user changes preserved, no commit/push.

Evidence: output/glass-2026-09-30/browser-checks.json, glass-light.png,
glass-dark.png, glass-group.png, glass-settings.png, and glass-narrow.png.
Earlier sections are historical.

## Refined Flat material and motion — 2026-09-30

- **Automated: 127 tests pass.** Thirteen added tests cover Flat/system motion gates,
  auto-animate effect ownership/cancellation, interrupted visibility, fixed-dialog
  coordinates, immediate inert/accessibility state, card reflow, successive-render
  snapshots, root/group scroller coordinates, and older-Chrome dialog event fallback. Syntax/module and whitespace
  checks pass.
- **Chrome-hosted HTTP fixture, simulated Chrome APIs: 34 assertions pass.**
  Checked Flat persistence after reopening, phrase filter pickers and flattened
  results, menu second-click closure, outside-action protection, close/Undo staying
  in the grid, group controls/menu contents, and immediate focus restoration.
  A second tint and bundled Outfit font remained independent of Flat.
- Actual pointer reorder in the fixture: root sweep had 2 swaps, 1 interrupted
  retarget, ghost opacity 0, no animated outer slots, and maximum jump 0. A group
  row-crossing displaced 4 surfaces with 1 interrupted retarget and maximum jump 0.
  With motion disabled, 2 swaps produced no animated surfaces or slots; the
  measured 287.4 px immediate step is expected with movement turned off.
- Drawer pointer/keyboard docking and horizontal expansion passed at all four
  edges. Card resizing moved only inner surfaces. Menu entry/exit effects measured
  180 ms; closed menus/dialogs retained exit paint while immediately becoming
  inert and leaving accessibility snapshots. Disabled motion produced no nonzero
  UI effects during resize/drawer operations. System reduction is covered by
  focused tests and the live listener, not an OS preference change in this run.
  The attribute-observer fallback preserves Chrome 120+ dialog behavior; no old
  Chrome binary was run. Dialog toggle events arrived in Chrome 132, per the
  [official release documentation](https://developer.chrome.com/blog/new-in-chrome-132).
- Light/Dark were visually inspected. Four sampled Dark foreground/background
  pairs (source button, primary button, sort, card title) met 4.5:1; this is not a
  full contrast audit. At 375×812, dialog/panel widths remained contained and
  ArrowDown selected the next settings category. Temporary viewport was reset.
- No fixture console warnings/errors. Cached preview evidence is synthetic.
  The fixture retains connect-src none and all new assets are local. This is
  **not a physically network-disconnected acceptance run**.
- **Native Chrome extension remains pending** under the previously observed
  extension-URL policy restriction: actual tab/group actions, screenshot capture,
  browser-wide commands, worker suspension/restart, and disconnected acceptance.
  Physical touchscreen checks were not performed; the product remains desktop.
  Existing user changes are preserved; no commit/push.

Evidence: output/flat-2026-09-30/browser-checks.json, flat-light.png, flat-dark.png,
flat-group.png, flat-settings.png, and flat-narrow.png. Earlier sections are historical.

## Search focus and edge-drawer refinements — 2026-09-30

- **Automated: 114 tests pass.** New cases cover independent quiet autofocus,
  drawer defaults/migration/backup, resize limits, and live group Ungroup identities,
  ordering, stale groups, and overlapping drops. Syntax/module/whitespace checks pass.
- **Chrome-hosted HTTP fixture, simulated Chrome APIs: 54 assertions pass.**
  Root/group automatic focus hides retained histories; clicking shows them and
  typing filters by phrase. Checked inline Show all windows, root/group spacing
  with all filters hidden, equal exclusion buttons, Settings backdrop dismissal,
  native-radio palette arrow navigation, chosen color persistence in created groups,
  colored Add to Group/Idle protection/drawer labels, and regular/private window
  requests from both normal and private fixtures.
- Pointer drags docked the drawer, resized its end, and observed its moving grip
  at 36×128 px (side) / 128×36 px (top/bottom), with full-pill radius 999 px.
  Click/keyboard resizing and reload persistence passed. Destinations expanded
  horizontally at all four edges; a 375×812 viewport kept them inside the viewport,
  including with maximum saved drawer length. Settings panels did not overflow.
- A whole-group pointer drop exposed only Ungroup and retained both Research
  members as individual tabs. The first very fast attempt missed expansion; the
  start-of-drag proximity check fixed the timing and the retest passed. These are
  disposable fixture records, not native Chrome tabs.
- Material regression checks preserved the half-pill shape across all five styles.
  Glass group-panel drawers remained clickable on all four viewport edges. A
  discovered blurred-ancestor coordinate shift was fixed: the group panel keeps
  its tint/sheen, while blur remains on the backdrop and drawer.
- Reorder retest: normal motion had 2 swaps / 2 interrupted retargets, ghost opacity
  0, no animated outer slots, max jump 0. Disabled motion had 2 swaps, no animated
  surfaces/slots, ghost opacity 0; the 191.6 px immediate step is expected without
  animation. No fixture console warnings/errors were recorded.
- Native extension acceptance was not retried after the earlier URL-policy denial.
  Actual window creation, group Ungroup, screenshot capture, browser-wide shortcuts,
  service-worker restart and a physically disconnected run remain unverified.
  No remote assets or processing were added. Physical touchscreen testing was not
  performed and touch compatibility is outside the current desktop scope.

Evidence: output/drawer-2026-09-30/browser-checks.json, drawer.png,
group-palette.png, narrow-settings.png. Browser viewport reset; disposable tabs
and server closed. Existing user changes preserved; no commit/push.

## Desktop usability refinements — 2026-09-30

- **Automated: 110 tests pass.** Seven new tests cover drag policy, milliseconds/
  sizing migration, phrase history limits, session window ordering/compaction,
  cross-window tab/group positioning, and invalid/stale/private drop requests.
  Three obsolete swipe tests were removed with the feature. Module/syntax and
  whitespace checks pass.
- **Chrome-hosted HTTP fixture; simulated Chrome APIs:** 27 assertions passed.
  Checked conditional history/custom/confirmation/capture fields, URL normalization
  and exclusion removal, root retention versus independent group clearing, default
  activation clearing/recording, phrase history, picker second-click closure,
  group-only reorder, main group/window metadata, circular selection, persisted
  preferences on reload, four-column fresh defaults, and category keyboard navigation.
- Actual pointer drags in the fixture moved a tab before a destination card and a
  whole group between two destination cards across windows. A group-only filter
  reordered its five members. Text-query dragging preserved in-window order and
  still moved a member into another window. A discovered append-only bug was fixed
  by resolving reorder eligibility before entering the busy state. These operations
  mutate disposable fixture records, **not native Chrome tabs**.
- Motion on: a sweep had 2 swaps / 2 interrupted-animation retargets, ghost opacity
  0, no animated outer slots, and maximum continuity jump 0. Motion off: 2 swaps,
  no animated surfaces or slots, ghost opacity 0; immediate layout changes produced
  a measured 191.6 px step, as expected with animation disabled.
- A new tab in a 32-member group scrolled into view with switching disabled. Root
  new-tab creation also stayed in the grid. The shared helper covers root, group,
  new-group, and New Tab After Selected entry points; the latter two were inspected
  but were not separately exercised through the UI in this pass.
- The clarified desktop Search/Sort/Card-size row measured Search 786.6 px and
  Sort 155 px, sharing the same top position. Search width stayed unchanged on
  focus. At 375 × 812, Search & Filters and Backup panels had no horizontal overflow.
  Category Home/arrow navigation worked; the temporary viewport was reset.
- No fixture console warnings/errors. No remote assets were added. This is not a
  physically network-disconnected acceptance run. Backup validation remains covered
  by automated tests; the new chooser's layout was inspected, not an OS file upload.
- **Native Chrome extension remains pending:** attempting to inspect its installed
  grid was denied by the browser URL protocol policy (only HTTP(S) allowed). No
  workaround was used. Actual cross-window tab/group moves, browser-wide shortcuts,
  real screenshot capture, worker suspension/restart, and disconnected acceptance
  still require native verification. Physical touch was not tested; swipe closure
  was intentionally removed and touchscreen compatibility is outside current scope.
- Window order: new creation/closure and worker recreation pass mock tests. On first
  use, pre-existing windows are seeded from Chrome enumeration order; their historic
  creation times are unavailable. Native enumeration/creation timing is unverified.

Evidence: output/usability-2026-09-30/browser-checks.json, grid.png, selection.png,
backup.png, and narrow-settings.png. Earlier sections below are historical.

## Material styles and compact controls — 2026-09-30

- Automated: **106 tests pass**, module/syntax and whitespace checks pass. Added
  exact-match filter tests and style migration, validation, tint independence,
  and backup checks across all 5 styles × 22 tints × 2 modes.
- **In-app browser, HTTP fixture with simulated Chrome APIs**: keyboard-operated
  website exact match (`EXAMPLE.COM` → `example.com`), root group restriction,
  Arrow Up choosing the last group, Enter selection, clearing restrictions,
  and the independent group-panel website picker passed. Root group restriction
  rendered the five Design reference members with their group identity.
- All six filter controls measured 40 px high with identical bottom positions.
  All three group-header actions measured 40 px. Existing group destinations
  rendered blue/green native tints; New group and Ungroup had no group color.
- Four new materials × Light/Dark applied distinct radius/shadow/blur treatments,
  with no settings-panel horizontal overflow. Glass alone used 20 px backdrop
  blur. Warm craft tint stayed selected when switching material. Neumorphism
  survived page reload. At 375 × 812, page width was 375 px and panel client/scroll
  widths were both 234 px. Temporary viewport override was reset.
- Fixture console warning/error list was empty. New surface treatments use only
  local CSS; the fixture retains connect-src none. This is not a physically
  network-disconnected acceptance run.
- Pointer automation repeatedly returned without activating controls, including
  a correctly hit-tested, non-inert Clear filters button. Keyboard actions worked.
  Therefore pointer selection, pointer dismissal, and rapid drag/reorder with both
  motion preferences remain **unverified in this pass**. No reorder implementation
  was changed; previous fixture continuity results are historical, not rerun here.
- Native installed Chrome extension, worker restart, actual OS color-mode change,
  reduced-transparency OS setting, and physical touch remain pending. No blocked
  extension URL access was bypassed.

Screenshots: output/materials-2026-09-30/appearance.png and clay-grid.png.


## Appearance personalization - 2026-09-29

- Automated: **103 tests pass**. New tests cover old-preference migration, all
  theme/font backup combinations, invalid import values, manual/system resolution,
  token replacement, font assets/licenses, and palette contrast. All 44 palettes
  meet 4.5:1 for text, muted text, and accents on canvas/surface/selection, and for
  primary-button text. Syntax and whitespace checks pass.
- Chrome HTTP fixture with **simulated Chrome APIs**: selected all 22 themes in
  Light and Dark (44 combinations); each applied the requested mode without errors
  or settings-panel horizontal overflow. Six font choices applied; font readiness
  and local loading checks passed. Ethereal glass / Dark / Plus Jakarta Sans
  survived a page reload.
- Category End/Home/ArrowDown navigation includes the new seventh category. Native
  theme radio ArrowRight updated both selection and focus. Reset restored Calm
  editorial, Geist, Follow system, and system motion. At 375 x 812, page width was
  375 px and panel client/scroll widths were both 234 px, including Newsreader and
  Liquid glass. Viewport overrides were reset after testing.
- A group reorder sweep reported ghost opacity 0, one retargeted swap, no animated
  outer slots, and maxJump 0. Motion disabled reported no shifted-card animations
  and maxJump 189, the expected immediate slot move. The effect ownership is intact.
- Final fixture console warning/error list was empty. All fonts are bundled;
  the HTTP fixture retained connect-src none. No runtime remote assets were added.

Follow-system resolution is automated-tested and its change listener is wired.
An actual operating-system theme change, installed native extension behavior,
service-worker restart propagation, physical touchscreen input, and a real
network-disconnected acceptance run were not performed in this pass. Previously
blocked native extension access was not bypassed. Simulated tab operations above
are not native Chrome verification.

Screenshots: [light](../output/appearance-2026-09-29/settings-light.png),
[dark](../output/appearance-2026-09-29/settings-dark.png),
[narrow](../output/appearance-2026-09-29/settings-narrow.png).


## Calm editorial redesign — 2026-09-29

- Automated: **97 tests pass**; syntax and whitespace checks pass.
- The local Geist WOFF2 loaded successfully in the Chrome fixture. All stylesheet
  and font paths are bundled; the fixture retains its no-connect CSP.
- Expanding Filters, choosing Playing audio = Yes, then collapsing it retained
  only Music and displayed “1 active.” Clear filters restored the original cards.
- Grouped settings still save checkbox changes. ArrowDown switches category and
  updates aria-selected. Both group menus retain the shared requested actions.
- Four-column sizing produced four equal 269.4 px tracks; the fixture was restored
  to six columns afterward. Skip to tabs moved focus to the main tab area.
- At 375 × 812, page width remained 375 px; settings panels measured 234 px client
  and scroll width, expanded filters 339/339 px, and group content 339/339 px.
  Narrow group cards retained a 147.5 × 110.625 px four-to-three frame.
- A rapid two-insertion reorder with two retargeted movements recorded ghost
  opacity 0, animatedSlots [], maxJump 0. With animations disabled, reverse reorder
  had no shifted-card animations and immediate placement, as expected.
- A fixture-only server option forced dark CSS branches for visual inspection.
  Group surfaces measured rgb(41,45,44) with text rgb(232,234,228). This is CSS
  emulation, not a native system-theme-switch test. No console warnings/errors
  were reported in the final fixture check. Temporary viewport overrides were reset.

All tab/Chrome operations above are **simulated APIs in an HTTP fixture**. Native
extension, physical touchscreen/trackpad, real disconnected operation, capture,
worker lifecycle, and previously noted backup/shortcut acceptance limits remain.

Evidence: [desktop grid](../output/redesign-2026-09-29/grid.png),
[settings](../output/redesign-2026-09-29/settings.png),
[narrow settings](../output/redesign-2026-09-29/settings-narrow.png),
[narrow group](../output/redesign-2026-09-29/group-narrow.png),
[dark group](../output/redesign-2026-09-29/group-dark.png).

## Menu, history, and drawer follow-up — 2026-09-29

- Automated: **97 passed, 0 failed**; syntax and whitespace checks pass. Added
  coverage for removed suggestion preference migration, opt-in/private/expired
  history display, drawer preference validation/backup, edge snapping, narrow
  bounds, and stationary handle anchoring when the drawer expands.
- Chrome-hosted HTTP fixture, **simulated Chrome APIs**: root Music and group
  Reference article result clicks cleared their respective search fields and
  placed the queries in recent history. This worked with both query-memory
  switches enabled. ArrowDown/Enter reused Music and filtered to its card.
  With recording off, Reading queue still cleared after activation but was not
  recorded or displayed; previously retained history reappeared when enabled.
- Suggestion switches are absent from settings. Outer and inner group menus
  share name/color controls and action sections; Reload, Duplicate, Pin, and
  Mute Site are absent. Only the outer menu has the two relative-close actions.
  Second opener clicks continue to dismiss menus.
- Drawer: 44 px collapsed, 176 px expanded on desktop; 168.75 px at a 375 px
  viewport, with no horizontal page overflow. Dragging its handle from right to
  left changed its edge/offset and survived a reload. Alt+Arrow docking and
  bottom-edge bounds were also checked. The drawer remains usable inside the
  modal group panel and in selection mode.
- Dragging Music near the collapsed drawer expanded it, dropped into New group,
  and collapsed it afterward. Moving selected Music into existing Research
  produced a 33-member group. These are mock tab-strip changes only.
- With movement enabled, a fast two-insertion reorder included one interrupted
  slide: ghost opacity 0, animatedSlots [], maxJump 0. A drawer drop also reported
  maxJump 0 and effects confined to card surfaces. With movement disabled, the
  drawer drop passed and cards moved immediately (a nonzero positional step is
  expected). Sortable remains the DOM owner and auto-animate the effect owner.

Native extension behavior is **not certified**: the previously documented
extension-page access restriction remains. Physical touch dragging/swiping and
trackpad edge scrolling require hardware checks. Existing offline/native preview,
worker restart, browser-wide shortcut, and backup-picker acceptance limitations
remain unchanged. Screenshots below are disposable fixture data, not user tabs.

Evidence: [drawer](../output/usability-tweaks-2026-09-29/drawer.png),
[history](../output/usability-tweaks-2026-09-29/history.png),
[group menu](../output/usability-tweaks-2026-09-29/group-menu.png).

## Offline personalization acceptance — 2026-09-28–29

### Automated checks

`npm test`: **93 passed, 0 failed**. `npm run check` and `git diff --check` pass.
Thirty new personalization tests cover defaults/migration, valid hostnames and
subdomain boundaries, search fields/modes and filter intersections, filtered
selection, history expiry/deduplication/retention, strict confirmation thresholds,
future-only Undo timing, idle exceptions, shortcut conflicts/reserved combinations,
backup validation/preview/apply separation, root/private session isolation and
cross-window group state, preview eviction, and clear/exclusion/navigation/active-
tab capture races. An integration test recreates the personalization service and
exercises management/search/preferences/cached previews/backup with `fetch`
replaced by a throwing network-disabled stub. This is a data-layer simulation,
not a real extension-worker restart or browser network-disconnection test.

### Chrome-hosted fixture observations — simulated Chrome APIs

- A normally typed 12-second Undo timeout survived reload. Zero was rejected with
  an explanation and `aria-invalid`; the previous saved value remained intact.
  The browser tool's direct `fill` operation did not produce the native numeric
  change commit, so numeric checks use real typing and Tab. Fixture RPC calls now
  serialize like the worker.
- Root `Research` and group `scroll test 2` queries restored independently. Group
  scrolling restored at 545.5 px across repeated close/reopen while autofocus stayed
  on search. A later `Reference article` query survived page reload with the new
  group-specific session keys. Cross-window group-state sharing has unit coverage.
- Playing-audio filtering produced only Music; Select all selected one tab.
  Hiding a filter cleared its restriction. Explicit group selection produced 32
  member cards, locked Search inside groups in both the page and settings, and
  restored its previous unchecked value after Clear filters.
- Relative-close commands were disabled when Music was the only filtered result.
  The implementation also limits filtered window/group close actions to matches.
  Single-click empty grid space cleared the selection while retaining selection
  mode; double-click exited it.
- Submitted searches appeared as history suggestions. `/` duplicated onto another
  action was rejected; recording `S` for Select tabs worked, and `/` returned focus
  to search outside editable fields. Category ArrowDown selected and focused the
  next vertical tab.
- Stop previews for Music's website changed its next menu to Allow previews. The
  exclusion appeared in settings; cache usage reflected stored previews. The
  cache/race tests use synthetic image data, never actual screenshots of user tabs.
- Stay-in-grid behavior retained the simulated TabGrid tab for root new-tab,
  group creation, and New tab in group. Switching mode activated the created root
  tab. New Tab After Selected activation/group placement is covered by action tests.
- Always-confirm opened a one-tab confirmation. Group deletion showed 32 affected
  tabs, relative-after close 34, window close 35 (excluding the pinned tab), and
  explicit Select all close 36 (including that selected pinned tab). Those dialogs
  were cancelled. Keyboard Delete/Undo closed/restored Music. Swipe recognition
  remains covered by gesture unit tests; physical gestures were not performed.
- Private fixture settings disabled normal history recording, screenshot capture,
  cache clearing, and backup import/export. Closing its two-member group stated
  that Incognito closes cannot be undone. This does not certify native split-mode
  storage isolation; service-level privacy guards have separate unit coverage.
- At 375 × 812, the settings dialog fit between x=17 and x=358; its content had zero
  horizontal overflow. The group panel also had zero overflow and retained a
  283.8 px scrolling area below its filters. The viewport override was reset.
- A rapid two-insertion reorder initially exposed a 23.5 px shift when the search
  header collapsed during a card gesture. Deferring that collapse until release
  fixed it. Retest: ghost opacity 0, two swaps, one interrupted slide, no animated
  outer slots, maximum insertion discontinuity **0 px**. With motion off, two
  reverse swaps restored order with no movement effects or animated slots; cards
  intentionally jump directly to their final slots in this mode. No animation
  owner or Sortable ordering change was introduced.
- Final inspected browser console logs had no warnings/errors.

### Offline fixture run and remaining limits

Loaded `?offline`, which seeds a bundled synthetic 640 px cached preview, under
`connect-src 'none'` and local-only asset rules. Stopped the fixture HTTP server
before testing: settings remained usable, preview usage showed one cached image,
search returned Research notes/Research, Music could close and Undo, and Export
created a version-1 JSON Blob with only `format`, `preferences`, and `version` at
the top level. The fixture observes Blob creation without changing export logic.
No server was available for these operations. This verifies the already-loaded
fixture's independence from its origin service; the computer's Internet connection
was not disabled and this is **not native disconnected-extension acceptance**.

Browser download completion could not be confirmed through the download event
(wait timed out). Import through the file chooser was explicitly blocked because
the browser-control extension lacks Allow access to file URLs. No permission was
changed or bypass attempted. Backup content, defaults, rejection, no-partial-write,
and explicit Apply semantics pass automated tests, but the full UI file round trip
remains pending.

Native `chrome-extension://` access remains blocked by the previously reported
browser URL policy. Outstanding native checks: the browser-wide command and its
actual assigned binding, screenshot capture and exclusion races with real pages,
service-worker suspension/restart, live tab/group persistence and cross-window
view restoration, real split-Incognito isolation, and a browser disconnected from
the network for management/settings/search/cached previews/backup. Physical touch
hold/swipe/scroll/multi-touch and trackpad behavior still require hardware testing.
OS reduced-motion-following and dark-mode runtime acceptance are not newly claimed.

Evidence: [settings](../output/personalization-2026-09-28/settings.png),
[narrow settings](../output/personalization-2026-09-28/settings-narrow.png),
[server-disconnected fixture](../output/personalization-2026-09-28/offline-fixture.png).
Existing user changes were preserved; no commit or push was made.


## Automated checks

Run `npm test`, `npm run check`, and `git diff --check`.

93 tests currently cover typed selection, scope/search, native API simulations,
close/undo failures and recovery, groups/windows/pinning, activity persistence,
Reading List, swipe intent, last-opened tracking, Undo focus restoration, and the UX refinements. New cases cover
click/hold/movement thresholds, selection drag eligibility, group-drop rejection,
size/idle preference migration, window ordering, timed/paused/dismissed Undo,
operation-specific restore, writable bookmark paths, folder validation, partial
writes, and failed destination-preference persistence.

## Browser fixture evidence — 2026-09-26

Start `node tests/preview-server.mjs` and open `http://127.0.0.1:4173`.
The fixture uses simulated Chrome data; actions do not affect real user tabs or
bookmarks. `?large` supplies a 32-tab group for scroll checks, and `?private`
previews the Incognito interface. Reload resets simulated tabs; fixture preferences/history persist locally and
view state persists in session storage.

Verified through browser interaction:

- All windows produces separate current-window/other-window sections with pinned
  cards inside their own window. Cross-window Select all counts seven fixture tabs.
- Selection shows Done selecting, count, Select all, Clear, and More; card action
  buttons disappear. More uses organized sections and disables invalid grouping.
- Dragging in selection mode leaves card order and selection unchanged. Leaving
  selection restores whole-card dragging.
- Dragging a tab preview changes order. Dragging a group preview moves its members
  together, preserves their order, and does not open the group.
- Bookmark destination offers writable paths, saves into the chosen folder, and
  remembers it the next time the picker opens.
- Idle defaults to Never. Card slider produces 450 × 337.5 px cards and responds
  to a one-pixel decrement with a 449 px width.
- Closing a tab inside a group displays the shared toast above the dialog; Undo
  restores it. Main-grid closes use the same toast. Dismiss + Refresh does not
  resurrect the notification.
- A 32-tab group scrolls to its bottom while the header remains fixed. Further
  scrolling leaves background scrollY unchanged at 226.5 px. Inside blank space
  keeps the dialog open; clicking the outside backdrop dismisses it, unlocks the
  page, and returns focus to its group card.

The browser checks caught an Illegal invocation from unbound timer functions in
UndoNotice. Default timers now use wrappers, and the modal/main-grid notification
checks passed after the fix. Node-only timers did not reveal this browser issue.

## Remaining acceptance checks

These are not confirmed by the fixture or unit tests:

1. Reload the unpacked extension in Chrome and use disposable tabs in a separate
   test window. Confirm whole-card tab/group moves persist in the native tab strip,
   keeping group names/colors/member order and pinned boundaries.
2. Confirm pointer holds, drag cancellation, and release outside do not activate
   native tabs; keyboard Enter/Space still activates normally.
3. On a physical touchscreen, verify 250 ms hold-to-drag versus quick swipe-to-close
   and vertical scrolling, including multi-touch cancellation and selection mode.
4. Exercise real optional bookmark permission denial/grant, writable and managed
   folder choices, destination removal during the picker, and native bookmark writes.
5. Close/Undo a disposable group and a cross-window selection. Verify restored
   native group metadata, positions, pinned/muted state, and session-history recovery
   after the five-second toast expires. Private closes never create Undo records.
6. Verify narrow/light/dark/reduced-motion layouts, keyboard focus, and scroll
   containment with trackpad and touch at both group scroll boundaries.
7. Confirm live external tab/group changes, last-opened markers across grid/worker
   recreation, and real split-Incognito isolation. Saved-group-library and remote
   session checks were retired when those features were removed.

Earlier attempts to automate Chrome's extension-management page were denied by
browser tooling. Do not bypass that restriction through another control channel;
the user must perform extension reload/setup when required. Record native results
separately, including any steps that still require user/device access.

## Follow-up verification — 2026-09-27

### Automated and simulated results

- Re-ran `npm test`: 46 passed, 0 failed. `npm run check` and
  `git diff --check` passed.
- Opened `http://127.0.0.1:4173/?large` in the connected Chrome browser. This
  still uses **simulated Chrome APIs**, not the installed extension.
- At a temporary 375 × 812 CSS-pixel viewport, the light-mode page had no
  horizontal overflow (`scrollWidth === innerWidth === 375`). Main-grid and
  pinned cards measured 220 × 165 px, preserving 4:3.
- The 32-tab group dialog fit inside that viewport (327 px wide), placed initial
  focus on Close group panel, and advanced Tab to New tab in group. Enter and
  Space on the group card opened it; Escape closed it and returned focus to the
  group card. These checks do not prove native tab activation or full focus-cycle
  behavior through browser chrome.
- Browser-generated scrolling reached both group-content boundaries (0 and
  5383.5 px). Additional scrolling at each boundary left background scrollY at
  951.5 px and the group header at y = 74.078125 px. Body overflow was hidden
  while the dialog was open and returned to visible when closed. This is not a
  physical trackpad or touchscreen test.
- Screenshot: [narrow fixture group](../output/verification-2026-09-27/fixture-narrow-group.png).
  The temporary viewport override was reset after testing.

### Native Chrome status: setup complete; extension-page access blocked

Ordinary Chrome page access works in this chat. The connected browser inventory
contained an IANA page and the temporary fixture page, but no native TabGrid page.
The user was asked to reload the unpacked extension and open it in a separate
window with disposable tabs. No extension-management restriction was bypassed.

After the user confirmed setup was ready, browser inventory showed the native
TabGrid page at `chrome-extension://jnoldienpoaboejiaffjjclafmojinfc/grid.html`
and a group named `testgroup`. Attempting to select the native grid was explicitly
rejected by the browser URL policy: only `http:` and `https:` are allowed. The
rejection also prohibits alternate control surfaces, indirect execution, or other
workarounds. No such workaround was attempted. Setup is no longer the blocker;
native acceptance now requires the user to operate Chrome and report results.
Inventory visibility confirms the page exists, not that its behavior works.

**No native-extension acceptance item is newly marked passed.** Native tab/group
ordering, pointer activation/cancellation, permission denial/grant and bookmark
writes, close/Undo and session recovery, live external changes, saved-group resume,
remote sessions, and split-Incognito isolation remain unverified. No real user
tabs, groups, bookmarks, or extension preferences were modified in these checks.
No production-code regression was established, so no speculative code fix was
made; existing working-tree changes were preserved.

Dark-mode and reduced-motion execution remain unverified (both media queries
were false during the fixture checks). Physical touch hold-to-drag, quick swipe,
vertical scrolling, multi-touch cancellation, selection-mode suppression, and
physical trackpad boundary behavior require user/device testing. A narrow
viewport and synthetic input cannot certify those hardware behaviors.


## Latest nine-refinement checks — 2026-09-27

This entry supersedes earlier feature descriptions of the removed saved-group
library and Other Devices view. Their three dedicated saved-library tests were
retired; seven new focus, preview, Undo, and event-propagation tests were added.
The current total is **50 tests**, all passing, with syntax and whitespace checks
also passing.

### Browser fixture results (simulated Chrome APIs)

- Reproduced first-click loss when moving focus from one card to another. The
  window blur listener was catching descendant element blur in capture mode.
  After changing it, one click activates a simulated tab, opens a different
  group, activates a group member, and selects each card in selection mode.
  A regression harness also checks that real window blur still cancels clicks.
- The complete page menu is reachable, New tab group creates a named group with
  one new tab, Select tabs reveals the toolbar, and single clicks select cards.
- Extension settings opens as a modal with Idle and gesture preferences. Changing
  Never to 7 days moves the old simulated group into Idle. Escape restores focus
  to the page-menu button. The private fixture omits the inactive/history views.
- Two-member groups render two previews and two empty cells. Five-member groups
  render three previews and `+2`; all four cells occupy the two-by-two layout.
  Group frames use blue/green native colors. Opening a group or member applies
  the last-opened frame; selecting another website restores the group's color.
- Dragging a group preview reordered its members as a block without opening the
  group or changing the highlighted website. SortableJS still owns the drag.
- Closing a simulated tab and using Undo restores it. Action tests simulate
  Chrome session activation and assert that the grid tab and its window regain
  focus, including partial restoration failure. Native focus behavior is pending.
- At 375 × 812, the 450 px size preference produced 343 × 257.25 px cards: 4:3,
  no horizontal overflow, and both header actions inside the viewport. The
  viewport override was reset afterward. Browser console showed no warnings or
  errors during the final private-fixture check.

Evidence: [grid and page menu](../output/refinements-2026-09-27/grid-and-menu.png),
[settings modal](../output/refinements-2026-09-27/settings.png).
These screenshots use simulated tabs and placeholder favicons, not user tabs.

### What is not certified

The native extension URL remains blocked by browser-tool policy. Native tab-strip
persistence, real permission prompts/bookmark writes, actual session activation
and return to the grid, service-worker lifecycle, native saved-group compatibility,
and split-Incognito isolation require user-operated Chrome checks after reloading
this version. Offline operation is supported by local dependencies/assets and
removal of remote-session calls; no real disconnected-Chrome run was performed.

Physical touchscreen hold/swipe/vertical scroll/multi-touch cancellation and
trackpad gesture behavior remain unperformed. Dark-mode and reduced-motion runtime
checks are also pending; the fixture checks above used light mode. Existing user
images and unrelated working-tree files were preserved.


## Eight further refinements — 2026-09-27

All 51 automated tests, syntax checks, and whitespace checks pass. The new test
covers six column levels, clamping, and migration from old pixel preferences.

Chrome-hosted HTTP fixture results below use **simulated Chrome APIs**:

- Search expands from 320 px to about 830 px at the tested desktop viewport.
  Search inside groups and Search groups appear on focus, remain available during
  checkbox clicks, and hide after focus leaves. A premature focusout collapse was
  caught and fixed by allowing the next control to receive focus first.
- Activating TabGrid project, opening/closing Research, and opening/closing its
  context menu leaves `tab:2` highlighted. No group inspection records activation.
- Top-left favicons appear in group tiles and member-card previews. Group member
  icons measured 6 px from the preview's top and left edges.
- Selected Research retains its blue native group tint; the selected last-opened
  tab retains dark blue (`rgb(79, 95, 152)`) while hovered.
- Context-menu opening retains the source-card frame and sets page overflow to
  hidden. Browser-generated scrolling leaves scrollY unchanged at 62 px. Menus
  inside group panels also set the group scrolling region's overflow to hidden.
  Escape closes menus, returns focus, and releases the appropriate scroll lock.
- Slider endpoints render six desktop columns and one full-width column. Three
  columns are shared by root and group grids. At 375 x 812, the responsive cap
  renders two columns; the page scrollWidth remains 375 px and group panel width
  is 327 px. Physical input is not inferred from this viewport simulation.
- Root group dragging reordered `[tab:2, group:7, tab:5, tab:6, group:200]` to
  `[tab:2, tab:5, tab:6, group:7, group:200]` without opening a dialog. Group-member
  dragging reordered `[tab:3, tab:4]` to `[tab:4, tab:3]`. Fixture DOM observation
  recorded ghost opacity `0` and transform animations on neighboring cards.
- Re-enabling drag animations exposed temporary Sortable copies retained by
  auto-animate during refresh. Copies now lack live identity where possible,
  reconciliation/order persistence require a real card model, and root fallback
  previews live outside the animated grid. Group fallback previews remain inside
  the modal so they are visible above its backdrop. Both drag checks passed with
  no status errors; the final console check reported no warnings/errors.

Evidence: [updated fixture](../output/further-refinements-2026-09-27/grid.png).
The temporary viewport was reset and the disposable fixture tab/server closed.
No native extension acceptance is claimed: extension-page access remains blocked
by browser-tool policy. Physical touchscreen/trackpad, real Chrome activation and
persistence, and dark/reduced-motion runtime checks remain unperformed.


## Drag animation stability — 2026-09-28

The prior eight-refinement checks established that animations ran, but did not
establish continuity during interrupted shifts. This follow-up addresses the
reported glitch rather than treating those earlier checks as sufficient.

Implementation now keeps Sortable hit boxes stationary and animates only inner
card surfaces through auto-animate's plugin API. Rapid insertions reuse current
visual offsets instead of restarting from a previous layout position. Temporary
copies, the placeholder, and the container are excluded. The inner surface also
survives card-content refreshes after native index updates. Sortable still owns
DOM reordering; auto-animate creates and controls all movement effects.

55 unit/action tests, syntax checks, and whitespace checks pass. Four new motion
cases cover temporary-copy exclusion, effects targeting surfaces rather than
slots, live reduced-motion preference handling, and interrupted-slide continuity.

Observed in Chrome using the **simulated HTTP fixture**:

- A fast rightward group drag moved Research across Music, Reading queue, and
  Design references. A reverse sweep restored the original ordering. Each sweep
  performed two insertions, including one while the preceding slide was active.
- A 32-tab group allowed a member to move across multiple cards and then into the
  next row, preserving all 32 card identities and their simulated native order.
- Fixture instrumentation recorded placeholder opacity 0, effects only on
  displaced surfaces, zero transformed outer slots, and a maximum discontinuity
  of 0 CSS px immediately across the observed insertions. The instrumentation
  panel now has fixed height so its changing diagnostics cannot move the grid.
- No dialog opened from dragging; no refresh error appeared. A normal click still
  activates a simulated tab, group panels still open, and a group context menu
  preserves the root last-opened marker, group tint, and scroll lock.
- The final browser console check reported no warnings/errors.

Evidence: [fixture after drag checks](../output/drag-stability-2026-09-28/fixture.png).
The disposable tab/server were closed and viewport reset. These observations do
not certify physical pointer smoothness, touch/trackpad behavior, or native Chrome
tab persistence. Native extension access remains blocked by browser-tool policy.
Dark/reduced-motion runtime checks remain pending; reduced-motion handling was
covered by a unit test only. Existing user changes were preserved; no commit/push.


## Icon and native-style menus — 2026-09-28

63 unit/action tests, syntax checks, and whitespace checks pass. Eight added
regression cases cover window labels, relative close boundaries, web-origin
filtering, grouped new-after placement, privacy/grid filtering for duplication,
site sound permission/state/failure/private-scope handling, and menu positioning.
The accepted Sortable/auto-animate movement implementation was not changed.

Observed in Chrome using the **HTTP fixture with simulated Chrome APIs**:

- Clicking New tab while a tab menu is open dismisses the menu and leaves the
  count at six. The equivalent group-panel click leaves Research at two members.
- Second clicks close card, Edit, and page menus. During testing a tall Edit menu
  covered its own opener and intercepted a second click as Ungroup. Placement now
  keeps that button exposed; the retest retained both selected cards and the
  intact Research group. Long menus scroll within the available space.
- Shift+Tab from the first action wraps to the last; Tab wraps back. Escape closes
  a window submenu while retaining its parent and focusing the submenu trigger.
- Right-clicking Research adds its two members to an existing one-tab selection.
  Right-click inside its group panel likewise adds a second member. Labels read
  Edit and Done. Existing selections remain checked after menu dismissal.
- New Tab After Selected inserts a new member between Research notes and
  Reference article, increasing the group from two to three members.
- Simulated Mute Site changes to Unmute Site on reopening. The mock records site
  settings; this does not prove native permission prompts or sound enforcement.
- Move Tab to Another Window contains New Window, a separator, and
  “Second window notes and 1 Other Tab”. Native-style menu sections omit the three
  excluded actions and retain existing extension link/selection actions.
- The icon preview decodes with natural dimensions 256 × 256. Direct navigation
  to the ICO was blocked as a non-page response; an image preview in the fixture
  verified decoding. This is not extension/action icon registration acceptance.
- At a confirmed 375 px viewport, menu bounds were left 47 / right 367 and
  top 8 / bottom 414.625 px. Page scrollWidth remained 375 px, and clicking the
  exposed opener dismissed the menu without changing the six-tab count.
- The browser console reported no warnings or errors during the desktop checks.

Evidence: [updated menus](../output/menu-refinements-2026-09-28/menus.png).
Disposable tabs/server were closed and viewport overrides reset. Native extension
access remains blocked by browser-tool policy. Real permission prompts, site
sound enforcement, window/tab persistence, icon registration, and physical
touchscreen/trackpad checks remain unperformed. No native result is inferred
from these fixture tests. No commit or push was made.

### Icon follow-up — unpacked-extension format correction

The prior HTTP image-decode test did not establish toolbar compatibility. Chrome's
[action API documentation](https://developer.chrome.com/docs/extensions/reference/api/action#icon)
requires PNG images for unpacked extensions, although packed extensions accept ICO.
The supplied ICO declares 256×256 but embeds a 512×472 PNG. That original PNG was
extracted byte-for-byte to `tileIcon.png`, with all PNG chunk checksums validated;
the source ICO and artwork were not altered. Manifest, page favicon, fallback,
and fixture references now use PNG. Syntax and whitespace checks pass. Native
icon appearance still needs confirmation after reloading the unpacked extension.


## Group panel actions — 2026-09-28

Chrome-hosted fixture checks (simulated Chrome APIs) verified:

- Header order is New tab in group, Group options, Close group panel.
- The options menu separates Edit Group, Select Tabs, and Delete Group.
- Outside clicks dismiss the menu without closing the group panel; the opener's
  second click closes it, and Shift+Tab wraps within its actions.
- Select Tabs reveals the group selection toolbar; Done hides it again.
- Edit Group saves the simulated group name/color and returns focus to Group
  options. Delete Group opens confirmation; Cancel preserves the group. New tab
  in group increased the simulated member count from two to three.
- At 375 px, panel clientWidth and scrollWidth both measured 325 px. All three
  header buttons remained in order within the panel; menu bounds were 47–367 px.
- No browser console warnings/errors were reported. The viewport was reset and
  the disposable tab/server closed.

Evidence: [group menu](../output/group-menu-2026-09-28/group-menu.png).
Syntax checks and the existing 63 tests pass. Native Chrome and physical touch
behavior remain unverified; the accepted reorder implementation is unchanged.

### 2026-10-08 — Idle visibility, Material icons, and window priority

- Automated: 132 tests pass; syntax/module checks and whitespace checks pass. Added coverage for current-window-first ordering while retaining other windows' creation order, numbering, empty destinations, and per-window card order.
- Chrome HTTP fixture (simulated Chrome APIs): Never hides Idle; enabling 7 days reveals it; changing back to Never while viewing Idle returns to Tabs. Show all windows renders This window first. Main-menu icons render locally; settings retain all seven accessible category names and ArrowDown navigation. Narrow settings rail has no horizontal overflow.
- Compared computed main/group New tab foreground/background colors in Classic, Flat, Glassmorphism, Neumorphism, and Claymorphism: matching in all five.
- Added SVG MIME support to the fixture server so bundled Material icons render in the fixture as they do when served as extension assets.
- Native extension execution was not verified in this pass. Screenshot evidence: `output/ux-icons/menu.png` (ignored local artifact).

### 2026-10-08 — Simplified drawer and motion controls

- Automated: 132 tests pass; module/syntax and whitespace checks pass. Updated docking tests cover the midpoint boundary, clamping, legacy placement migration and invalid offsets. Motion tests cover speed scaling and reduced motion; existing interrupted-reorder tests remain passing.
- Chrome HTTP fixture (simulated extension APIs): verified blank drawer handle, mouse dragging to the right half, keyboard expansion/collapse, 600 px viewport drawer width of 200 px with four wrapped rows and 212 px height, and no horizontal list overflow.
- Verified Reduce animations hides speed choices; turning it off reveals them; all three choices save. Smooth sets glass UI timing to 352 ms. Title/action bars remain visible while main and group content scroll. Search shortcuts scroll each search field below its header. Main sources follow filters; group previews have no corner favicon. Group panels still open and close with normal focus behavior.
- UI reveal/entry timing is covered by unit tests; exact transient animation frames and rapid manual pointer reorder were not recorded in this pass. Native Chrome extension APIs and physical touchscreen operation were not tested.
- Local screenshot: `output/drawer-motion/settings.png` (ignored artifact).

### 2026-10-09 — Context menus, settings search, and accordions

- Automated: 136 tests pass; module/syntax and whitespace checks pass. New tests cover submenu delay/cancellation/immediate switching, opacity-only menu reveals, stale geometry suppression on category return, and settings search matching.
- Chrome HTTP fixture with simulated extension APIs: page menu remains visible at a scrolled header; main-grid tab menu folds the header, while a menu inside the group panel leaves it visible. Menu computed transform is none. Full-width header background visually covers content behind it.
- Recently closed retains filters; applying Pinned = Yes redirects to Tabs and shows the matching pinned tab. Window headings collapse/expand with Enter, keep keyboard focus, retain This window first, and have distinct tints.
- Settings search finds labels and shortcuts, shows category names, and ArrowDown/Enter navigates to and focuses the matching control. At 600 px the dialog, sidebar, and panels have no horizontal overflow. No browser warnings/errors were recorded. Local screenshots: `output/menu-search/settings.png` and `output/menu-search/windows.png`.
- Exact transient animation frames, rapid manual reorder, and native Chrome extension execution were not verified in this pass. Animation behavior is covered by focused unit tests; simulated fixture results are not native API verification.

### 2026-10-10 — Header, drawer, and drag motion follow-up

- Automated: 145 tests pass. Added coverage for visible animation anchors, queued-effect cancellation, measured accordion collapse/reversal, serialized optimistic docking, fast releases without move events, drawer proximity, group-entry fades, compatible feedback targets, and reusable feedback anchors. Module/syntax and whitespace checks pass.
- Chrome HTTP fixture, verified in Classic: recorded actual browser keyframes for header folding at scrollY 713.5 (opacity 1→0 and upward translation), window collapse from 898.609 px to 0, and size-track progress 40%→60%. Group-to-group entry produced opacity-only card effects. The header has one continuous full-width border.
- Native pointer gestures on the simulated page docked the drawer left, then right; right placement and offset survived page reload. A single target row measured 62 px including the frame, instead of the old 128 px minimum. Final Classic inspection measured two rows at 112 px high and 410 px wide in a 1230 px viewport (one third of the page).
- Opt-in synthetic mouse sequences through the real Sortable handlers verified both tab/group reordering stays frozen near the drawer and resumes away from it. Grouping feedback reached scale .78; Ungroup was hidden for a single tab. Group ungrouping showed only Ungroup, transitioned the frame to transparent, and spread all four tiles by ±12 px with small opposing rotations. These are disposable fixture results, not native extension/tab API or physical drag-device acceptance.
- No browser warnings/errors were observed. `tests/motion-probe.mjs` is loaded only by the fixture's `motionProbe` flag; it records actual effects and provides clearly named synthetic gesture controls. Evidence: `output/motion-refinements/effects.json` and `output/motion-refinements/classic.png` (ignored local artifacts).
- Real Chrome extension execution and device-specific drag behavior remain pending. The existing stable-card reorder ownership is unchanged.

### 2026-10-10 — Control and popup interaction polish

- Automated: 149 tests pass; syntax/module and whitespace checks pass. New coverage includes host-timer receiver safety, duplicate mouse/pointer events and child boundaries, counterclockwise disclosure state, and cross-window new-group name/color preservation.
- Classic HTTP fixture: submenu hover remains closed at 70 ms, opens after the delay, and switches to another submenu immediately. This reproduces and fixes the previous browser `Illegal invocation` timer error. Hover was exercised through opt-in synthetic mouse events, not a physical pointing device.
- Recorded actual knob interpolation: progress 53.3502%, knob left 72.553 px in a 154 px range with an 18 px knob, matching the shared track value. Native Arrow keys continue to change size levels. Tint collapse recorded height 313.695 px to zero and opacity 1 to zero; the triangle rotates between zero and -180 degrees. Collapsed tint content is inert and omitted from accessibility navigation.
- New-group dialog opens after a synthetic drop on New group and from selected tabs in the drawer. Cancel restores the unchanged ungrouped tab; submission creates the chosen name and green color in the simulated API. A native pointer click outside the action dialog dismisses it. These are fixture checks, not native Chrome tab API verification.
- Final drag samples show no outer outline (`outline-style: none`); the 2 px inner outline follows the tab's .78 scale and becomes transparent with the group frame. Keyboard tint expansion and the Filters indicator both record a -180-degree rotation. Reduce animations hides speed choices. Final browser checks recorded no warnings/errors. Local evidence is in `output/interaction-polish/`, including the spacing screenshot `appearance.png`.

### 2026-10-10 — Hover-only submenu revision

- 148 automated tests pass, along with syntax/module and whitespace checks. Obsolete delay tests were replaced with immediate opening/closing and parent-to-popup hover-region coverage.
- Classic browser fixture synthetic hover sequence confirms immediate opening, retention on entering the submenu, immediate closure on leaving both regions, immediate switching, and no click-only opening. No browser warnings/errors were recorded. Native physical-pointer movement was not tested.

### 2026-10-10 — Submenu exit paint regression

- Reproduced the remaining bug in Classic with Smooth speed: the native popover state closed immediately, but measured opacity stayed at 1 until the 288 ms discrete display transition ended. The earlier hover-only check tested logical closure, not visible fading.
- After the fix, the Chrome HTTP fixture recorded opacity 0.58 at 50 ms, 0.30 at 97 ms, and 0.09 at 150 ms after leaving the combined hover region. No position animation is involved.
- Synthetic browser hover checks passed for quick-pass cancellation, keeping the submenu open across the parent/popup boundary, immediate logical dismissal, delayed first entry and switching (167 ms observed for each 150 ms timer), click not reopening a submenu, and cancellation when the parent menu closes. No browser warnings/errors.
- 151 automated tests pass; syntax/module and whitespace checks pass. Added regressions cover nested-observer opacity ownership, every-entry delay, duplicate compatibility events, leaving both hover regions, and pending-open cancellation.
- Evidence: `output/submenu-hover/results.json` and `output/submenu-hover/verified.png`. Browser checks used Classic with simulated extension APIs and synthetic hover events; native extension execution and physical-pointer movement were not tested.

### 2026-10-11 — Preview refresh scheduling

- 164 automated tests pass, including 13 new preview refresh regressions. Syntax/module and whitespace checks pass; the new isolated-world activity script is included in `npm run check`.
- The actual activity script runs in a VM fixture with controlled visibility, focus, preferences and time. Verified 400 ms settling, 2-second signal spacing, no idle polling, idempotent reinjection, cancellation when hidden/disabled/excluded, and signals containing only their message type.
- Mock Chrome API tests cover shared capture spacing across windows, latest-request retention, URL/activity/exclusion rechecks after waiting, private-mode isolation, sender/frame validation, request coalescing, final capture before opening, timeout with rejection of a late image, activation/load event wiring, and metadata-only eviction on frequent captures. Existing in-flight clear/navigation/private/cache tests remain passing.
- No live native Chrome screenshot or installed-extension run was performed for this change. In particular, screenshot latency and real-site event coverage remain to be checked after reloading the extension. Direct tab switches still intentionally use the last cached image.
- Current API contracts were checked against Chrome's [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs) and [content scripts documentation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts). No additional extension permissions or runtime libraries were added.

### 2026-10-11 — Faster pre-open preview path

- 170 automated tests and syntax/module checks pass. New regression cases cover fresh-preview reuse, immediate interaction revision changes before debounce, document replacement, age expiry, missing/malformed tracking, the default 250 ms budget including slow initialization, and opening while the storage queue is blocked.
- A simulated activation after confirmed capture still permits its detached save. Clear, exclusion, navigation and tab closure invalidate pending saves; late screenshots after the opening deadline remain rejected. Existing private-mode, rate-limit, input-signal and cache tests remain passing.
- The actual activity script is exercised in the VM fixture with the new state-query handler. Its document identity uses getRandomValues, which does not require an HTTPS page. Messages contain only a document token and revision, never keys or form values.
- These tests verify scheduling and state transitions using simulated Chrome APIs. No live installed-extension latency measurement was performed; the 250 ms value is the capture wait budget, not a claim about total Chrome tab-opening time. Reload the extension to test the new behavior on real pages.

### 2026-10-11 — Screenshot quality preference

- 173 automated tests pass, plus syntax/module and whitespace checks. New regressions verify legacy/default quality, valid/invalid presets, backup round-tripping, persistence across service recreation, Incognito write rejection, and current quality passed to the capture API without replacing existing images at preference-change time.
- Classic UI fixture verified Standard selected by default, switching to High, hiding the quality control when capture is off, retaining High when re-enabled, and finding the control through settings search. Restored Standard after checks. No browser warnings/errors were recorded.
- Evidence: `output/preview-quality/settings.png`. Browser checks use simulated extension APIs; native Chrome screenshot quality and real-world capture latency were not measured.

### 2026-10-12 — Final screenshot quality checks

- Classic browser fixture confirmed High persists after a full page reload. Keyboard Tab reaches the quality selector; Space opens it, Arrow Up and Enter select Standard, and Tab continues to the website field. Restored Standard after verification.
- Desktop settings panel has no horizontal overflow, visible focus remains intact, and no settings errors or browser warnings/errors were recorded. Final screenshot updated at `output/preview-quality/settings.png`.
- Full automated suite rerun: 173 tests pass; syntax/module and whitespace checks pass. These are fixture checks; native installed-extension capture latency remains unmeasured.

### 2026-10-12 — Custom background verification

- 179 automated tests pass, including bounded asset validation, upload rejection, aspect-preserving dimensions, adjustment ranges and defaults, settings backup exclusion, separate image persistence/removal, and Incognito write rejection. Syntax/module and whitespace checks pass.
- Classic browser fixture uploaded the repository's preview PNG, converted it to WebP, applied keyboard-controlled transparency and blur live, and preserved the image plus 30% transparency / 5 px blur after reload. Settings search finds Custom background. Removing the image cleared the decorative layer and hid dependent controls. No browser warnings/errors were recorded.
- Evidence: `output/custom-background/settings.png` (repository image used only as a test background). Browser checks use simulated extension APIs, not an installed native extension. The local manifest retained SHA-256 `e2cf71b2528b5b7ae6788ed50cd0fe5e8622b598ce24f3d706aa9c3056e41a54` throughout implementation.

### 2026-10-12 — Header branding consolidation

- Removed the separate icon/TabGrid brand row, moved the decorative icon beside the existing heading, and removed top page padding. The heading text node remains intact for Incognito labeling; existing header fold and menu handlers are unchanged.
- Classic browser fixture measured the header at y=0 initially and at scrollY=442; the More menu opened normally after scrolling. No browser warnings/errors. Evidence: `output/header-layout/header.png`. Syntax/module and whitespace checks pass; manifest SHA-256 remains unchanged from the custom-background work.

### 2026-10-12 — Top overscroll fill and filter collapse

- Extended the header's full-width background one viewport above its surface so the header color covers the top elastic-scroll gap. Computed fill top was -720 px in the 720 px fixture viewport. Native macOS trackpad rubber-band behavior cannot be reproduced by the browser fixture and remains a native visual check.
- Replaced native details/summary filters with a semantic disclosure button and a persistent content wrapper, using the existing auto-animate motion controller for both opening and closing. Main and group filters remove closed content from focus/accessibility immediately and close their open pickers. Expanded picker content remains unclipped.
- Browser frame sampling confirmed the root collapse progresses from 107 px to 73 px, 43 px, 26 px and finally zero while fading out over approximately 180 ms. Group collapse and keyboard activation were also exercised, plus the expanded website picker. The temporary frame recorder was removed from source afterward.
- Evidence: `output/filter-collapse/frames.json` and `output/filter-collapse/verified.png`. No browser warnings/errors. All 179 automated tests and syntax/module checks pass; user manifest edits remain unchanged.

### 2026-10-14 — Control and glass state refinements

- All 189 automated tests pass; module/syntax and whitespace checks pass. User manifest SHA-256 remains `e2cf71b2528b5b7ae6788ed50cd0fe5e8622b598ce24f3d706aa9c3056e41a54`. README credits were not changed in this pass.
- Browser fixture checked real WebGPU wallpaper rendering, full-width rounded glass header (1280 px and 390 px; no narrow horizontal overflow), all nine new-group color choices, transparent selected card hit surfaces, translucent drawer targets, and 16 px inset tint headings. Card tint transition events and advancing GPU frame counters were recorded by a temporary fixture probe, then the probe was removed.
- Website/group pickers open on focus; arrow clicks focus the same input. Keyboard selection closes the picker and keeps its chosen label. The same website behavior was exercised inside the group dialog. Grid focus outlines are suppressed outside selection mode; settings/dialog focus remains available.
- Collapsed windows expand after switching Show all windows off and on again. Flat selected-category hover resolves to dark text on a light surface. Filter pills retain rounded corners in Classic, Glass, Neumorphism, and Clay; collapsed glass filters return to their resting tint after leaving hover.
- CSS fallback was exercised with WebGPU deliberately unavailable, including dark mode. Reduce animations reports zero transition duration. These are simulated-extension browser checks, not native macOS GPU/energy measurements or a complete contrast audit over arbitrary user wallpapers.
- Evidence: `output/ui-tweaks/group-colors.png`, `drawer.png`, `hover-frames.json`. GPU sampling strategy and context-submenu hover logic were deliberately left unchanged; energy optimization and pointer-intent corridors are recommendations only.

### 2026-10-14 — Glass performance and crop follow-up

- Regression coverage includes wallpaper cache reuse/invalidation and required upload texture usage, clipping at texture edges, crop bounds, retired-style migration, and left/right submenu travel with immediate route cancellation. Existing submenu tests retain the 150 ms opening delay and immediate exit behavior.
- Real WebGPU browser fixture verified a shared cache of three textures (1x scrolling, 1.5x panels, 2x controls). A repeated 100-frame scroll run reached 600 px with no further wallpaper uploads (count remained 3), restored 1.5x/2x after settling, and stopped rendering while idle (frame count stayed 1411). A temporary fixture recorder was removed afterward. These are rendering counters, not a measurement of macOS energy use.
- Browser fixture exercised diagonal pointer travel into a left-opening submenu, restored red destructive actions, glass search/speed tint styles, 8 px search-result corners, crop dragging and keyboard adjustment, and crop persistence after reload. The crop preview uses scaled overscan/blur to match the page. Classic was selected during the final layout checks.
- Collapsed windows remained collapsed after toggling Show all windows off/on and after reload. With both windows collapsed, document/viewport heights were both 827 px; scrolling upward left scrollY and header top at 0. Native macOS trackpad rubber-band behavior remains a device check. Expanded window content computes to overflow: clip with a 6 px clip margin.
- Evidence: `output/glass-performance-crop/scroll-check.json`, `crop-controls.png`, and `short-page.png`. Browser tests use simulated extension APIs. No production Chrome tabs or groups were changed.
- Final checks: 195/195 automated tests pass; syntax/module and whitespace checks pass. Glass with 161% crop zoom and blur also rendered in dark mode without warnings/errors. The fixture was restored to Classic/Light. User-edited manifest SHA-256 remains `e2cf71b2528b5b7ae6788ed50cd0fe5e8622b598ce24f3d706aa9c3056e41a54`; existing README credits were preserved.

## 2026-10-15 — Gestures and menu checks

Automated coverage includes swipe direction/distance/time thresholds, input choices, preference defaults and backup round trips, grouping compatibility, hover dwell/re-entry cancellation, narrow panel margins, continuation, Escape cancellation, and independent native-popup animation ownership.

Browser checks used `tests/preview-server.mjs` and `?design&previews&gestureProbe`. The opt-in gesture probe synthesizes pointer/mouse/wheel events through the real UI handlers, Sortable, and the simulated Chrome tab API; it does not operate on real Chrome tabs.

- Tab → existing group: Research changed from 2 to 3 members; pending → ready feedback appeared before release.
- Tab → ungrouped tab: the New tab group dialog opened.
- An 80 ms pass over a grouping target remained pending and made no grouping change.
- Release outside a group before continuation ungrouped its member. Holding outside closed the group panel and continuing onto Design references transferred the member (5 → 6 members).
- Short mouse swipe kept Music open; a deliberate mouse swipe closed only Music. A sustained horizontal wheel sequence with trailing momentum also closed exactly one card and displayed Undo.
- First submenu opening: Classic parent opacity remained 1 across 24 frames; Flat remained visible with constant height (minimum 0.988 while its initial opening fade finished). No disappearance or parent replay was observed.
- Glass context menu inner scroll range stayed 0–339 px across repeated overscroll attempts (657 px contents, 318 px viewport). The last action ended at the inner viewport edge; scrolling back clamped to zero. The optical canvas remained a direct child of the fixed menu frame.
- Settings search jump highlight count changed from 1 to 0 after clicking the dialog heading. Tint gallery order and conditional battery note were checked in the settings UI.
- Dark-mode favicon backing computed to `rgb(245, 245, 245)` with 2 px padding.

These are automated and browser-fixture checks. Physical touchpad behavior, platform navigation gestures, and live Chrome extension drag operations still warrant device testing. Browsers expose touchpad swipes as horizontal wheel events, so horizontal wheel hardware follows the same setting.

The interaction model uses separate swipe, merge, and ungroup thresholds, informed by Chromium's mobile TabGrid callback, with desktop-specific values rather than claiming identical mobile thresholds: https://chromium.googlesource.com/chromium/src/+/refs/tags/135.0.7012.3/chrome/android/features/tab_ui/java/src/org/chromium/chrome/browser/tasks/tab_management/TabGridItemTouchHelperCallback.java

Final checks: `npm run check`, `npm test` (204/204 passing), and `git diff --check` passed. Classic settings screenshot: `output/gesture-menu-fixes/settings.png`. The existing local `manifest.json` SHA-256 remained `e2cf71b2528b5b7ae6788ed50cd0fe5e8622b598ce24f3d706aa9c3056e41a54`.

## 2026-10-15 — Touchpad swipe follow-up

- Deterministic controller tests cover content direction, pause/reversal, zero opacity at threshold, single-close momentum suppression, failure recovery, outside-click/vertical-scroll reset, and mouse hold versus quick swipe. Layout tests cover preserving a parked swipe during refresh.
- Classic and Glass browser fixtures: +45 horizontal wheel delta produced -45 px translation and 0.662542 opacity; both stayed unchanged after a 650 ms pause. Reversing 15 px produced -30 px and 0.775028 opacity. Swipe z-index was 50, pseudo indicator was absent, scrollX stayed 0, and document width stayed 1280 px (equal to viewport).
- Both styles reached computed opacity 0 before closing the front card. The neighboring card preview remained the same DOM node after removal. These checks validate behavior and reduced DOM churn, not a physical-device latency benchmark.
- Evidence: `output/swipe-followup/parked-classic.png` and `browser-checks.json`. Tests use synthetic wheel events and simulated Chrome APIs; physical trackpad momentum and browser navigation gestures still require device testing.
- Final checks: syntax/module validation, 210/210 automated tests, and whitespace validation passed. The manifest hash remains unchanged from the user's local edit. The test fixture was returned to Classic style.

## 2026-10-15 — Settings help and interrupted close motion

- Browser fixture: session tip appears beside Remember your place; Escape dismisses the tip while settings remain open. Clicking swipe help leaves its switch unchanged; clicking the settings heading dismisses help. Accessible setting names exclude info-icon text.
- Classic and Flat tips use their surface colors; Flat has 6 px corners and no shadow. Glass tip computes 86% surface fill with 12 px blur and contains no optical canvas. Background, preview, grouping, history, keyboard and backup tips have explicit related anchors.
- Recorded frame-by-frame close reproduction: Music moved from x=848.27 toward x=449.73, then jumped backwards from x=539.16 to x=1246.80 during a refresh. After fixing removal flow and stale captures, its Classic trajectory moved from 848.27 to 449.73 with a measured maximum backward jump of 0 px across 92 frames.
- Automated regressions cover retired-node layout, capture expiry and reported momentum restoring partial swipes without closing tabs. Native physical touchpad release is not claimed to be universally detectable.
- The Glass close recording also had a maximum backward jump of 0 px across 92 frames. Evidence: `output/settings-help-motion/close-traces.json` and `settings-help.png`. These recordings use simulated Chrome APIs.
- Final validation: syntax/module checks and 212/212 automated tests passed. The settings fixture was restored to Classic; drag grouping was researched but not changed in this follow-up.

## 2026-10-16 — Chrome-style grouping and consecutive swipes

- Regression tests cover strict 50% overlap (including unequal card sizes and off-center grab points), immediate highlighting without dwell, cancellation on leaving targets, bottom-only removal, re-entry, Escape, and disabled grouping.
- Browser fixture: an 80 ms overlap drop added a tab to Research (2 → 3 members). Dropping on an ungrouped tab opened name/color setup. Releasing outside the side left the group unchanged; entering the bottom removal area then returning cancelled removal. The remaining group stayed open after removing one member; the empty panel closed automatically after the final member was removed.
- Classic and Glass: three consecutive synthetic physical-input → momentum sequences on the same card each moved it -35 px, returned, and accepted the next swipe without clicks, cursor movement or a timer wait. Both settled to no translation and opacity 1. Automated tests also cover delayed lock cleanup and duplicate-close prevention while a close is pending.
- The removal label stays above the fallback card, with style-aware surfaces and Escape cancellation. Evidence: `output/chrome-grouping/removal-classic.png`, `removal-glass.png`, `browser-checks.json`, and `final-removal.json`.
- Syntax/module checks, 216/216 automated tests and whitespace validation pass. The preview was restored to Classic. Manifest SHA-256 remains `e2cf71b2528b5b7ae6788ed50cd0fe5e8622b598ce24f3d706aa9c3056e41a54`; README credits were preserved.
- These are browser-fixture checks with simulated Chrome APIs and synthetic wheel events, not physical trackpad validation. Pause-then-lift without momentum remains unobservable to the extension; no idle reset was added because it would also reset a card while fingers remain on the pad.

## 2026-10-16 — Help alignment and group continuation

- Syntax/module checks and 218/218 automated tests pass. Added coverage for the outside-hold timer, re-entry/release cancellation, continued group targeting, empty-space removal, and Escape cancellation.
- Browser fixture: holding Research notes outside its panel closed the panel without ending the drag; continuing to Design references transferred the member (5 → 6). Continuing the remaining Research member onto empty space ungrouped it and closed the empty panel.
- Classic tooltip measurements: button 18 × 18 px, caption gap 4 px, vertical center difference under 0.01 px; tooltip begins 8 px to the right. Glass also opens to the right and retains its 86% surface fill and 12 px blur. Escape dismisses help while settings remain open.
- The appearance gallery visibly places “Color tint: Calm editorial” directly under “Color tint.” Evidence: `output/settings-refinements/help-classic.png`, `help-glass.png`, and `tint-order.png`.
- Browser checks use simulated Chrome APIs and authored drag probes. The preview was restored to Classic. Root grouping detection was not changed; the restored continuation is a TabGrid desktop feature.

## 2026-10-16 — Group/reorder distinction

- Syntax/module checks and 223/223 automated tests pass. Boundary tests cover all four directions, exact-edge versus crossing, approach/overlap insertion blocking, reversed moves after stable slots change, and grouping when sorting/search prevents manual reorder.
- Real Sortable browser fixture: overlapping Research retained the original order and showed “Release to add to this group.” Moving 40 px beyond center crossed the far edge, changed order, and cleared the grouping state. Repeating in the reverse direction restored the original order. Release preserved each reordered sequence.
- The row-to-row fixture likewise retained order over Reading queue, then moved TabGrid project after it once the lower far edge was crossed. An initial probe was obstructed by its test toolbar; rerunning with that toolbar hidden verified the row transition.
- Releasing after an 80 ms overlap increased Research from 2 to 3 members. Holding a member outside its panel then continuing onto Design references transferred it (5 to 6 members). These checks use simulated Chrome APIs and synthetic pointer input, not an Android device comparison.
- Evidence: `output/group-reorder/overlap.png` and `browser-checks.json`. Existing visual motion ownership and the user's local manifest remain unchanged.

## 2026-10-17 — Prevent premature edge-entry reordering

- Reproduced a diagonal next-row approach where the pointer reached only 1 px inside the target's top edge, but crossing its unrelated side edge authorized a Sortable insertion. Before the fix, TabGrid project moved after Design references; the identical probe after the fix retained the original order.
- The corrected gate uses horizontal far edges within a row and vertical far edges between rows, with a 1 CSS px tolerance. Automated regressions cover diagonal approaches in both vertical directions, unequal heights, fractional positions, and the controller's pre-insertion decision.
- Browser fixture: deeper diagonal overlap highlighted Design references without moving neighbors; crossing its lower far edge reordered. Same-row overlap and horizontal far-edge reorder also passed. Releasing over Design references added a member (5 to 6); holding a Research member outside its panel and continuing onto Design references transferred it (6 to 7).
- Escape from the held diagonal overlap restored the initial order and cleared both the dragging class and target feedback. Evidence: `output/group-edge-fix/diagonal-grouping.png` and `browser-checks.json`.
- Syntax/module checks, 226/226 automated tests, and whitespace validation pass. Browser checks used the real Sortable integration with simulated Chrome APIs and authored pointer probes, not physical-device testing. Existing manifest edits and README credits were preserved.

## 2026-10-17 — Touchpad category navigation

- Removed obsolete touchpad-close regressions and added category navigation coverage: threshold, reversal, hidden categories, no wrapping, one transition per gesture, momentum suppression, header boundary, scrolling, modifiers, blocked UI, and legacy input-preference migration. Mouse close, hold-to-reorder, failed-close recovery, and duplicate-close protection remain covered.
- Browser fixture verified Tabs → Recently closed → Tabs with Idle disabled, then Tabs → Idle → Recently closed after enabling Idle. Fourteen-event horizontal bursts changed category once and never marked a card as swiped. Above-header and vertical probes did not prevent scrolling or change category.
- Short mouse drag returned Music to its original position; a full mouse drag closed it and showed Undo. Settings show Swipe to close cards with revised help and no Swipe using selector.
- Evidence: `output/category-swipe/settings.png` and `browser-checks.json`. Browser verification uses simulated Chrome APIs and authored wheel/pointer events; physical touchpad testing was not performed. Wheel events do not uniquely identify device type, so horizontal pixel-wheel input is the navigation signal.
- Final syntax/module validation, 226/226 automated tests, probe syntax, and whitespace checks passed. README credits and the user's manifest edits were preserved.

## 2026-10-17 — Category, settings and drag visual refinements

- Browser fixture recorded horizontal category motion in Classic, Flat and Glass, ending at opacity 1 and no transform. Reduced motion recorded no translation or fade throughout. Glass pill width settled to the selected button within 0.02 CSS px; unit coverage also checks fractional geometry and dragged pill sizing.
- Group entry recorded inner content translating from 12 px to rest while the dialog transform remained `none`. Native-entry regression verifies separate inner-content and outer-dialog effects.
- Classic appearance measurements: title-to-subtitle gap 16 px, subtitle-to-cards gap 16 px, tint indent 12 px. Filter radius measured 8 px for Classic and 6 px for Flat; Glass retains its material pill radius.
- Held overlap: target surface scale .9 with stationary 3 px slot outline. With swipe closing enabled, fallback scale .94; with it disabled, fallback scale and transform both `none`, while the target still scales .9. Escape removes the overlap state. Regression confirms tray grouping remains separate from overlap feedback.
- Evidence: `output/interaction-polish/appearance.png`, `overlap.png`, and `browser-checks.json`. Browser checks use simulated Chrome APIs and authored gesture probes, not physical touchpad validation.
- Final syntax/module checks, 231/231 automated tests, probe syntax, and whitespace validation passed. The preview was returned to Classic with animations enabled. Local manifest edits and README credits remain preserved.

## 2026-10-17 — Hold lift, source-card group morph, and cursor removal

- Syntax/module checks, 240/240 automated tests, and whitespace validation pass. New regressions cover hold-before-movement lift, release restoration, fallback scale continuity, source geometry, rapid reversal, source absence, reduced motion, actual animation completion, cursor-only removal bounds, and overhanging cards that must not trigger removal/continuation.
- Browser fixture recorded a source card shrinking smoothly from 1 to .94 after the hold threshold with no pointer movement and no fallback copy. Release restored its size and removed the lift marker. The help tooltip contains only the requested opening sentence.
- Classic, Flat, and Glass group close checks retained the native modal through the last animation frames, reached the source card bounds, then closed and restored focus to the group button (about 414–454 ms in standard speed). Opening returns to an untransformed panel; rapid reversal removes its temporary preview. Reduced animations leaves no group transform.
- Cursor probe: a card extended below the remove bar while its cursor remained 12 px above it; removal stayed inactive. Moving the cursor into the bar armed removal. The card's fallback layer is 100000 versus the bar's 25. In-panel status text measured transparent background, no shadow, and zero border.
- Holding outside the panel still closed it during the active drag, continued on the root grid, and releasing on empty space ungrouped the member. These checks use the real Sortable integration with simulated Chrome APIs and authored pointer probes, not physical Android/device validation.
- Evidence: `output/group-motion-followup/swipe-help.png`, `remove-bar.png`, and `browser-checks.json`. Existing README credits and user manifest edits were preserved.

## 2026-10-18 — Group animation refinements

- Full suite: 244/244 tests and syntax/module checks passed. Focused follow-up: 31/31 group-transition, tab-motion, and tab-focus tests passed, including frozen backdrop paint during native dismissal, canceled preview exclusion, and stale scaled layout baselines.
- Classic browser fixture recorded intermediate backdrop colors and blur values in both directions. The temporary snapshot border is 0 px. Smooth close retained the modal until about 430 ms and reached the source bounds before dismissal.
- A 35-frame drag-start probe kept the neighboring card at identical coordinates, opacity 1, and transform none.
- The animated handoff fixture kept the fallback card visible while a noninteractive panel copy reversed; the source preview immediately omitted Research notes. Canceling restored both original preview titles and reopened the group.
- Glass remove-bar ready state measured 64% tint opacity, blur(12px) saturate(1.35), and the existing glass sheen. Its layer remained 25 below the dragged card's 100000. Cursor-only removal boundaries still passed.
- Evidence: `output/group-motion-refinements/group-morph.png`, `glass-remove-bar.png`, and `browser-checks.json`. Browser checks use the local fixture, real Sortable integration, simulated Chrome APIs, and authored pointer probes; physical-device behavior has not been tested.


## 2026-10-18 — Confirmed audit corrections

- `npm test`: 245 passing; `npm run check` and `git diff --check` pass.
- Added regression coverage for pinned grouping eligibility, rejection before
  any mutation, and preserving pinned cross-window moves. The existing pinned
  rejection expectation now checks the specific unpin message.
- An isolated browser fixture exercised 12 checks against the real page handlers:
  effective columns at 650 px, restoring the preference at 1000 px, resize back,
  empty pinned areas at rest/during/after a synthetic Sortable drag, group drawer
  suppression/restoration, settings-search focus, and reset speed/state sync.
  All 12 passed. These are simulated tabs and synthetic drag events, not native
  Chrome tab operations or physical-device input.
- Visually checked the wallpaper readability changes in Glass dark, Flat light,
  and Classic light. Bright wallpaper is retained while the toolbar, window
  headings, and section labels get readable backings. Existing no-wallpaper
  layouts do not acquire the toolbar/section backings.
- Current behavior is documented in `docs/appearance.md` and
  `docs/chrome-grid-interaction-research.md`; Chromium is credited in README.
  Existing dependency/font/icon notices remain intact. No project-wide license
  was chosen, and no claim about ownership of project imagery was added.
- Native Chrome event timing, physical touchpad momentum, and GPU/battery
  measurements remain outside this verification. The iframe test harness emitted
  MutationObserver warnings on navigation; the normal top-level preview had no
  recorded runtime errors during these checks. This is not a claim that every
  animation edge case is resolved.


### 2026-10-19 — Filter bounds, bare toolbar captions, and wallpaper panning

- Supersedes the toolbar backing from the preceding audit fixes: removed that
  backing and added local wallpaper-dependent foreground colors to its captions
  and card-count output. Section label backings are unchanged.
- Separated filter option scrolling from the popover's decorative glass layer;
  horizontal overflow is clipped and vertical overscroll is disabled.
- Corrected both CSS image positioning and pointer-drag calculations to include
  the image cropped away by overscan. The centered crop is preserved.
- `npm test`: 247 passing; module/syntax and whitespace checks passed.
- Browser fixture: 24 passing checks covering black/white wallpaper caption
  colors, vertical endpoints at 100% zoom, preview/page crop agreement, toolbar
  transparency, and both picker kinds in Classic/Flat/Glass (30 options, repeated
  end/top scrolling, and filtering down to one option).
- Evidence: `output/background-filter-fixes/browser-checks.json`, `checks.html`,
  and `glass-toolbar.png`. The top-level preview recorded no runtime errors.
  Browser tests use simulated Chrome APIs; native macOS elastic trackpad scrolling
  and the user's original wallpaper file were not available for direct testing.

### 2026-10-19 — Minimum background crop at 100%

- Removed the fixed 192px image-box enlargement from the page and preview.
  100% now means the minimum cover fit; only aspect-ratio cropping remains.
  Removed the corresponding overscan offsets and drag calculations.
- Regression tests cover matching proportions (no crop/pan), portrait and wide
  images (pan only the overflowing axis), and preview/page drag scaling.
- 247 automated tests, module/syntax checks, and whitespace checks passed.
  The browser fixture passed 24 checks; a 1600×1200 image in an 1100×760 viewport
  now renders at 1100×825 instead of 1292×969. Its vertical pan range is 65px,
  exactly the aspect-ratio overflow. The settings Reset crop action displayed
  100% zoom and 50% positions.
- Evidence: `output/minimum-background-crop/browser-checks.json` and `preview.png`.
  These are fixture checks with simulated Chrome APIs.

## Localization, preview capture, packaging, and background updates — 2026-10-19

- `npm test`: 258 passing tests. Includes browser-language resolution, saved language/backup validation, matching Chinese/Japanese catalog keys and placeholders, static UI label coverage, literal interpolation of user content, restricted-page capture guards, thumbnail sizing and conversion, and the 1 GB upload boundary.
- `npm run check`: passed. `git diff --check`: passed.
- English, Simplified Chinese, and Japanese UI were exercised in the browser fixture. Changing the language persisted across reloads; Japanese and Chinese settings search found translated options. User-created fixture titles stayed unchanged. No horizontal page/settings overflow was observed at the tested desktop sizes.
- The Recently closed heading and description use the shared glass renderer. The browser fixture showed the GPU material with 16 px rounding, and the no-GPU fixture used translucent fill plus blur. Classic/Flat caption styling is unchanged.
- Actual browser image processing: a 28,666,586-byte PNG input (valid PNG plus trailing test padding) was accepted and resized to 2560 × 1536 WebP; a 4000 × 2400 screenshot became a 960 × 576 JPEG. Both were smaller than their inputs; malformed image data failed cleanly. These are real browser decode checks, not native extension captures.
- The 1,000,000,000-byte upload boundary and resource cleanup are covered by mocked unit tests. A full 1 GB image was not decoded during this run. Very large files remain subject to Chrome's decoder limits and available memory. Source files are unchanged; only a bounded, re-encoded WebP is sent to extension storage.
- Resizing uses the browser's documented [ImageBitmap resize options](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap). A local object URL avoids a full base64 copy of the original upload.
- `npm run package`: 107 runtime/notice files, approximately 1.56 MiB unpacked and 0.90 MiB zipped. ZIP CRC integrity, extracted contents, locale files, exclusion of test/output/source-map files, and bundled library/font/icon license notices were checked. No third-party extension code was copied.
- Native Chrome still needs a manual check: reload the extension, open a new-tab/Chrome/Web Store page, invoke TabGrid via its toolbar icon or assigned Chrome shortcut, and inspect the resulting preview. Confirm that denied captures retain the icon fallback, and that website exclusions and Incognito still prevent storage. The browser fixture cannot validate Chrome's real `activeTab` permission grant.


## 2026-10-20 — Preview lifecycle, notices, grouping Undo, and interface refinements

- 271 automated tests pass; syntax/module and whitespace checks pass. Regression coverage includes grouping and ungrouping Undo (original order, metadata, cross-window movement, partial failure, missing tabs, private isolation), card-return geometry, focused-page interval capture, and service-worker alarm scheduling.
- Reproduced the reported preview-script failure with a simulated extension invalidation: Chrome storage/runtime disappear and listener removal throws. Cleanup now uses captured event handles, guards removal, cancels timers, and permits clean reinjection without duplicate trackers. This test passes without an unhandled rejection.
- 33 browser fixture assertions passed across Classic, Flat, and Glassmorphism: bounded search-history scrolling, per-entry deletion without selecting a query, unmute action, shortcut placement and order, centered Undo, grouping Undo, stable window-collapse scroll position, and notifications above the group dialog.
- 10 additional browser assertions passed for inner-surface swipe return, Undo entry/exit animation completion, bounded page/filter menu scrolling, motion-off behavior, and adaptive text beyond toolbar captions. No browser console errors were recorded. Evidence: `output/oct20-check/glass-final.png`; the local test fixtures are excluded from release packages.
- Undo stays at the bottom center. Shared action feedback and drag tips use the bottom-left popover. Window/pinned glass headings use translucent materials. Search-history and action-dialog optical layers stay outside their scroll containers.
- Ordinary active pages refresh on activation, creation and completed loading, after settled activity, approximately every 15 seconds while visible/focused, and through a 30-second service-worker alarm fallback. Restricted pages still require explicit toolbar/Chrome-shortcut invocation; no background permission bypass is implemented.
- English, Simplified Chinese and Japanese documentation and interface messages were updated. Credits include the Material motion reference and the bundled Material volume-off icon; its existing Apache 2.0 license is retained.
- Release rebuilt: 110 files, 1.58 MiB unpacked, 0.91 MiB ZIP. Archive CRC and required runtime modules, locales, icon, and license notices verified. Development fixtures, screenshots and tests are excluded.
- Scope: browser tests use simulated Chrome APIs, plus real browser rendering and animation. Native installed-extension capture timing, real permission grants, physical drag/trackpad behavior, and battery consumption were not measured. Adaptive contrast estimates local wallpaper/surface colors; it does not guarantee contrast against every pixel in arbitrary imagery. Reload the extension and refresh already-open webpages once to replace old injected scripts; historical Chrome error entries require clearing separately.

## 2026-10-20 — Reorder return and Undo exit regressions

- Search-history delete buttons now use the bundled centered close icon with no border or circular backing. The action form has 6 px of internal clearance so group-name focus outlines are not clipped by its scroll viewport. Bottom-left status tips no longer move when centered Undo appears.
- Reorder return now starts synchronously at release, before persistence completes. The returning card reserves its inner surface while the grid's AutoAnimate observer continues to animate neighbors. Its starting geometry is painted immediately and only one return effect owns that surface.
- Undo exit holds its final transparent frame until the popover is hidden. Explicit notice lifecycle now disables the generic discrete display/overlay transition, avoiding a second close paint after the falling animation.
- 274 automated tests pass, including new return-ownership and notice-finish regressions. Syntax/module checks pass. Fifteen browser assertions passed across Classic, Flat and Glassmorphism, including actual grouping Undo and close Undo: opacity did not rebound and closed popovers did not reopen during the observed frames. Tip position and unclipped field outline were verified.
- Browser Sortable drag fixtures changed card order with an artificial 200 ms persistence delay in Classic and Glassmorphism (the latter with swipe-to-close/hold enabled). Each sampled 60 release frames; the returning surface had at most one running effect and zero backward movement toward its final slot. Fixture results: `output/oct20-check/reorder-trajectory.json`, `output/oct20-check/reorder-glass-trajectory.json`. Screenshot: `output/oct20-check/group-name-fixed.png`.
- New Tab capture remains a Chrome permission limitation, not fixed by adding timers. Chrome documents that internal pages require activeTab access, granted by an explicit extension invocation. Directly switching from New Tab to an existing TabGrid tab does not grant this access. The three README languages now spell out this exact scenario. No broader permissions or bypass were added. Native installed-extension restricted-page capture was not tested in this pass.


### Authorized internal-tab refresh follow-up

- Refinement of the restriction above: after a successful explicit restricted-page capture, the cache now records the exact tab ID and URL in session storage. Subsequent activation/periodic capture may retry that page using Chrome's existing grant; Chrome still enforces permissions on every call. This does not authorize untouched tabs, share a grant with another New Tab, or inject a script into an internal page.
- Session hints survive MV3 worker recreation but not a browser-session reset. Navigation, tab closure, preview clearing and rejected capture retire the hint. Long data URLs are not recorded. Capture-disabled, inactive, private, self-page and website-exclusion guards remain ahead of this path.
- 276 automated tests pass. New tests verify activation after an explicit capture, worker recreation, per-tab isolation, navigation, rejected capture, clear, and fresh-session behavior. Native Chrome's retained grant was not exercised here; the API remains the final authority. The supported first-grant actions remain the toolbar icon or a Chrome extension shortcut.
- References: [activeTab lifetime](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) and [captureVisibleTab restricted-page requirements](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab).

## 2026-10-20 — Single grid and optional close after switching

- Added a serialized grid lifecycle manager. Startup, creation/restoration, navigation and activation consolidate exact TabGrid pages within one regular/private context. Active restored instances are preferred; background duplicates retain the active grid. Toolbar invocations reuse the surviving grid across windows. Each removal rechecks the URL, pending navigation, privacy context, and survivor. Unrelated tabs are excluded.
- Added “Close TabGrid after switching to a tab” under Tabs & Groups → Opening and selection, off by default, with English/Chinese/Japanese help. It acts only on tab-card selection, not blur, group opening, manual tab changes or window switching. It preserves the grid while a visible/paused Undo or recent actionable journal entry remains. Failed activation or a focus change prevents closing.
- Before automatic close, a one-use, session-only snapshot preserves queries, filters, category, scroll positions, view options and the open group. It is isolated by regular/private context and consumed for restoration on the next opening. General remember-query settings remain unchanged; this snapshot belongs specifically to the optional quick-switch workflow.
- 286 automated tests pass, including 10 lifecycle tests covering restoration, focus preference, stale URL/pending navigation, concurrent toolbar requests, defaults, close/resume, Undo, failure and privacy. Syntax/module and whitespace checks pass.
- Eight real-browser fixture assertions pass: setting default/persistence, selecting the destination and removing only the simulated grid, preserving the pre-consume query, restoring it on a fresh page, consuming the snapshot once, Undo protection, and reopening a group with its search/filter state. No browser errors recorded. Evidence: `output/lifecycle-check/settings.png`.
- Release: 111 runtime/license files, 1.58 MiB unpacked, 0.91 MiB ZIP. Native Chrome restore-shortcut events and actual extension-tab removal still need an installed-extension acceptance check. Existing restricted-page preview permission limits are unchanged.

## 2026-10-20 — Stop the duplicate-grid restore loop

- Supersedes automatic consolidation described above. Removed startup/create/update/activation cleanup that closed duplicate grids. Closing one restored grid while retaining another adds a replacement recently-closed entry, so repeating Chrome's restore shortcut can loop indefinitely.
- Explicit toolbar/Chrome shortcut opening still serializes requests and reuses an existing grid in the same browsing context, preferring the focused active grid and rechecking navigation. Restored/manual duplicates stay open without automatic focus changes or closing. The optional close-after-card-selection setting is unchanged; it remains off by default and can create a recently-closed entry.
- Chrome's [tabs.remove](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-remove) has no history-exclusion option. Its [sessions API](https://developer.chrome.com/docs/extensions/reference/api/sessions) exposes query/restore operations but no API for deleting individual closed entries. This fix prevents the loop; it does not claim to exclude TabGrid from Chrome's history.
- 287 automated tests pass, with 11 lifecycle tests. The new regression closes a website and a grid, opens another grid, restores the old grid, invokes toolbar reuse repeatedly across worker recreation, then verifies that the next closed entry is still the website and can be restored. Privacy separation, navigation rechecks, optional close/resume, Undo protection, and concurrent opening remain covered. Syntax/module and whitespace checks pass.
- Validation uses simulated Chrome APIs. Native installed-extension restore-shortcut acceptance remains outstanding. English, Chinese, and Japanese READMEs now describe the history limitation and restored-duplicate behavior.

## 2026-10-25 — Fixed theme text colors and v1.1.0

- Removed the wallpaper contrast sampler, its DOM observers, adaptive text attributes/styles, and special caption color/shadow overrides. Text now uses the existing theme palette, including primary, muted, accent, and danger colors; light/dark mode and color-tint selection still determine that palette.
- Removed the retired sampler's unit test. All 286 remaining automated tests and syntax/module checks pass.
- Browser preview: glass style with a synthetic striped wallpaper shows the fixed light palette (`rgb(41, 46, 51)` headings and `rgb(98, 102, 106)` muted labels). Switching to dark mode shows `rgb(232, 234, 232)` and `rgb(190, 198, 196)`. These colors remain unchanged when background transparency moves from 15% to 100% and after scrolling. No adaptive text attributes or browser console warnings/errors were observed.
- Bumped the extension manifest from 1.0 to 1.1.0. Release notes are in `docs/releases/v1.1.0.md`. Native capture/restore behavior remains subject to the limits described above.

## 2026-10-26 — History, focus, glass captions, Undo highlight, and startup

- Recently closed now hides exact current grid URLs and older-installation entries
  matching the extension URL `/grid.html` plus the title `TabGrid`. This is only a
  presentation filter: live-tab identity and message authorization remain exact-ID
  checks. Similarly named HTTPS pages and other extension titles remain visible.
  Native Chrome history is not deleted or rewritten; mixed windows remain intact.
- Undo suppresses incidental activation tracking at event delivery, before those
  events can enter the worker action queue. Regression coverage preserves both a
  remembered tab and group, and confirms later intentional activation still works.
- Closing menus, animated group dialogs and filter disclosures releases contained
  focus before `aria-hidden`. Page-menu Escape restores its invoker; context-menu
  Escape does likewise. Animated modal closing still restores the group opener.
- Window glass tint now blends 40% of the window color into the surface at 70%
  opacity, rather than 10% at 28%. Fixed theme text colors are unchanged. Section
  caption optical layers are mounted only with a custom background and removed
  when it is removed, eliminating full-width caption strips without wallpaper.
- The toolbar capture budget was shorter than the 600ms shared capture-quota wait.
  It now allows up to 1500ms, cancels stale queued captures, and retains cancellation
  and post-capture source validation. A regression test uses the real delayed wait
  after an automatic capture. Confirmed pixels still save without blocking opening.
  Chrome's rate limit is documented at
  https://developer.chrome.com/docs/extensions/reference/api/tabs#property-MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND.
- Worker readiness reads only settings/migration keys and no longer waits for
  preview-cache reconciliation. Cleanup remains serialized with preview writes.
  A blocked-cleanup test confirms preferences become available independently.
  These are confirmed code defects; the user's intermittent reinstall incident
  was not reproduced end-to-end and is not claimed fully diagnosed.
- Validation: 294 tests passed; syntax/module checks and `git diff --check` passed.
  Rebuilt ZIP: 112 runtime/license files, 1.58 MiB unpacked, 0.91 MiB compressed.
  ZIP integrity and extracted imports/assets/locales/portable paths passed.
- Real Chrome on macOS rendered the extracted ZIP through the fixture server at
  port 4174 (Chrome extension APIs simulated). Checked light/dark glass window
  tints, removing wallpaper while running, Recently closed captions, group closing,
  page-menu switch dismissal and context-menu Escape. Both caption backgrounds
  were transparent without wallpaper; no focused element had an aria-hidden
  ancestor at completion; captured warning/error logs were empty.
  Screenshots: `output/verification-2026-10-26/window-tints.png` and
  `output/verification-2026-10-26/package-recent-no-wallpaper.png` (local, ignored).
- Fixed a Windows path conversion in the module-check script. Added a Windows,
  macOS and Linux CI matrix that builds and verifies the extracted ZIP. The
  workflow is local and has not run on Windows. No Windows VM or remote Windows
  session was available. Native capture permissions, reinstall/worker startup,
  GPU/input behavior on Windows remain unverified; see `docs/windows-validation.md`.
- No version bump, GitHub push or replacement of the published v1.1.0 asset was
  performed in this pass. `dist/TabGrid.zip` is the rebuilt local candidate.


## 2026-10-27 — MIT licensing and replacement release package

- Added the standard MIT License with copyright attributed to TabGrid contributors;
  set package metadata to MIT and documented scope in all three README languages.
- The ZIP now includes the root LICENSE alongside all existing dependency, font,
  and icon notices. Verified the bundled license matches the source byte-for-byte.
- 294 tests, syntax/module checks, ZIP integrity, and extracted-package checks pass.
  Artifact: 113 files, 958,036 bytes compressed; SHA-256:
  `feb5a6e6a9c8b55d0c26ae972116aeae08215ddbc8372702c7366c2b48ec9ef2`.
- The user requested a replacement asset on the existing latest release. Keep
  v1.1.0 and its existing tag; link the replacement ZIP's exact source commit in
  the hosted release notes so it is distinguishable from the original tag archive.

- Hosted run 40425058914 passed all 294 tests and syntax checks on Windows,
  macOS and Linux. Windows packaging then exposed a CRLF-sensitive README
  delimiter in credit extraction. Normalized line endings in the packager and
  added an end-to-end packaging regression for both newline formats (including
  a temporary project path containing spaces). The runtime ZIP is unchanged.
  This checks packaging on Windows, not native Chrome rendering or permissions.

## 2026-10-27 — Update all thumbnails and first-use walkthrough

- Added More options → Update all thumbnails, processing regular-window tabs sequentially through the existing quota-limited preview cache. The first-use dialog's Show me button opens this menu and focuses the command; dismissal persists locally. English, Simplified Chinese and Japanese are included.
- Background activations pause automatic captures and do not change TabGrid's last-opened highlight. Original window selections/focus are restored on completion. User tab/window changes cancel without stealing focus; the extension icon and menu stop command also cancel. Minimized windows are temporarily restored and re-minimized. Existing screenshot preferences, exclusions, privacy rules and Chrome permission checks remain in force. No extra permissions.
- Chrome browser UI fixture: Show me reached the correct menu item, a clean eight-tab run reported 8 updated / 0 skipped and stored all eight simulated previews, reload did not repeat the tutorial, and the stop command remained available. No console warnings/errors in that fixture. Classic and glass menu/dialog appearance inspected.
- This is a simulated-tab UI test plus mocked API regression coverage, not proof of real Chrome screenshot capture on every website or Windows. Chrome internal pages still require the applicable activeTab grant; the menu itself does not create such grants. A worker restart retires stale progress rather than resuming unwanted tab switching.

- Final validation: 308 tests passed; syntax/module checks and the 115-file package verification passed on macOS. The rebuilt local ZIP is about 0.92 MiB. Hanging capture calls are bounded and cannot hold up explicit cancellation.

## 2026-10-27 — Per-window TabGrid opening

- Toolbar opening now queries and reuses grids only in the source tab's current window; another window's grid remains open and is never focused by this lookup. Repeated requests serialize, and source/target window membership is rechecked after asynchronous lookup. Regular and private contexts remain separate.
- Optional close-after-switch quick-view snapshots are now keyed by both browsing context and source window. Another window cannot consume a saved query/filter/scroll snapshot. Window removal clears the corresponding snapshot. Restored duplicate tabs are still left alone to avoid feeding Chrome's native restore stack.
- Added regressions for concurrent two-window opening/reuse, moved source/target tabs, a source left during lookup, and independently consumed window snapshots. All 312 tests and syntax/package checks pass. These are mocked Chrome API tests, not native multi-window shortcut execution.
- Rechecked the public Chrome Sessions, History, Commands, Side Panel and Action references. Sessions exposes query/restore but no individual closed-tab exclusion or deletion API. A side panel or toolbar popup would avoid creating a normal tab, but requires a different UI; neither was substituted for the existing full-tab interface.
# Closed-window expansion (2026-10-30)

- Recently Closed windows have a keyboard-accessible disclosure button and an indented list of their tabs. Expansion survives search rerenders; restoring the window remains a separate action.
- Search filters individual child tabs using the existing title/URL and phrase/word preferences. Words from separate tabs cannot combine into a match. TabGrid entries remain excluded from the displayed children.
- Validation: 313 automated tests passed; syntax/module checks passed. Chrome browser preview with simulated session data (`grid.html?closed-windows`) verified expansion, Enter/Space toggling, one matching child during search, and all children returning when search is cleared. This was a UI fixture check, not a native closed-window restore test.

## Closed-window restore controls (2026-10-30)

- Each child tab now has a Restore tab action using its own saved session ID. Missing IDs disable the action, and the background rejects empty IDs rather than implicitly restoring an unrelated latest session.
- The title, metadata, header space, and non-interactive row area toggle expansion. Restore buttons do not toggle it. Keyboard focus returns to the window disclosure when a restored child disappears.
- Expansion/collapse animates height and opacity with the existing speed setting; the chevron rotates. CSS transitions can reverse mid-animation and honor motion-off/reduced-motion settings. Collapsed content becomes inert immediately.
- Validation: 315 automated tests passed, including partial window restoration and invalid session IDs; syntax/module and diff checks passed. Chrome UI fixture verified title/padding clicks, individual restoration leaving siblings and expansion intact, focus recovery, Enter/Space toggling, and intermediate expansion/collapse heights and opacity. Native session restoration was not exercised against user history.
- API reference: https://developer.chrome.com/docs/extensions/reference/api/sessions#method-restore

## Release package refresh (2026-11-01)

- Re-ran all 315 automated tests, JavaScript/module checks, and whitespace checks successfully.
- Rebuilt the 115-file runtime ZIP (965354 bytes). Verified ZIP integrity, required files, portable paths, locale/license inclusion, and byte-for-byte inclusion of the updated grid, session actions, thumbnail updater, and window lifecycle modules. Development tests are excluded.
- This refresh retains the v1.1.0 version and tag. The GitHub release notes identify the source commit used for the replacement asset.

## Returning-card drag lock (2026-11-01)

- Cards returning to their grid slot reject new Sortable drags and mouse swipes until their return animation finishes. Short/cancelled swipe returns use the same per-card lock. Other cards remain available.
- Completion releases the lock; an interrupted-animation fallback also clears it. Motion-off and reduced-motion swipe returns settle immediately.
- Validation: all 318 automated tests passed, along with syntax/module and whitespace checks. Added regressions for rejected repeat gestures, successful gestures after settling, interrupted-animation cleanup, and motion-off behavior.
- Chrome UI fixture exercised the real Sortable handler with synthetic input: return lock present at release, immediate repeat drag rejected (no chosen/dragging/swipe state), zero surface-to-slot displacement after settling, and a subsequent drag accepted. No browser console errors were recorded. This was isolated fixture validation, not native physical mouse testing against live tabs.

## Group thumbnail layouts (2026-11-01)

- Main-grid group menus offer a compact visual submenu with Grid (four tiles), Side by side (two), and Featured (one large plus two small). Radio-menu semantics expose selection; existing arrow-key submenu navigation remains available. Layouts are stored per group in Chrome session storage, separated for regular/private contexts.
- Previews & Storage now includes a default-on remaining-tab count switch. Overflow replaces the final tile only when the group exceeds the chosen layout's capacity. Turning it off shows a thumbnail in that slot instead. Labels are localized in English, Chinese, and Japanese.
- All 319 automated tests and module/syntax checks pass. Chrome UI fixture verified both alternative layouts apply immediately, three tiles for Featured, the selected radio item, and the default-on switch. Visual inspection caught and corrected a glass-style override hiding the layout diagrams. Fixture storage resets on reload, so native session persistence was not tested in this preview.

## GitHub refresh and Web Store preparation (2026-11-01)

- Group thumbnail ordering shares the main grid comparator and follows Tab order, Title, Website, or Last used before applying capacity/overflow. Render signatures include sort and member activity/order changes.
- All 320 tests, module/syntax checks, and whitespace checks passed. The rebuilt ZIP has 119 files / 985317 bytes; its entries match source files, required icons have exact square dimensions, and development fixtures are excluded.
- Removed unused `history` permission after checking runtime API calls; Recently closed continues to use `sessions`. Added 16/32/48/128 pixel icons with transparent padding.
- Prepared PRIVACY.md and docs/store/release-preparation.md with localized listing copy, permission justifications, reviewer steps, and explicit pending screenshot/console requirements. Developer-console browser access returned “Not allowed”; no console changes or store publication were performed.
