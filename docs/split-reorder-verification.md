# Split-card reorder verification

TabGrid reorders a split card within its window by moving ordinary tabs (or entire native groups) around the split pair. It never passes a split member to `tabs.move`, and does not separate and recreate the pair. The planner checks the whole sequence before starting, then checks live tab order, group membership, pinned state and split IDs before and after every API call. A changed or unsupported state stops further moves.

Two ungrouped split pairs cannot pass each other using this technique. That destination is rejected before mutation. Cross-window moves of split cards remain blocked. Whole-group moves use `tabGroups.move`; they are distinct from moving individual split panes.

Split cards can now continue dragging from a group panel after the pointer remains outside for the existing delay. Both panes leave together. Both previews are omitted during the handoff, and canceling restores them. The existing group-close transition and Sortable slot ownership remain in place. Empty-space drops ungroup both panes; grid drops ungroup, then use the surrounding-tab reorder. Ungrouping remains undoable.

## Checked locally

- Automated permutations of a split pair and two single cards, in both starting and destination orders (36 combinations).
- Multiple split pairs, including rejection of reversed pair order before any mutation.
- Group-panel reorder with unrelated tabs before and after it.
- Reorder and drop after ungrouping both panes, plus grouping Undo.
- Failed moves, stale membership, and preservation of the original split ID in the Chrome fixture.
- Pointer dwell, Escape cancellation and omission of both panes from group previews.
- Browser interaction with synthetic tabs: split-card reorder in the main grid and inside the group panel.

## User-run native results (Chrome 157, macOS, November 6, 2026)

The second supplied report (2026-11-06T07:56:51.955Z, Chrome 157.0.0.0 on macOS) passed all eight checks:

- Pair to right, pair to left, and pair between ordinary tabs.
- Reorder within a native group.
- Ungroup both panes while preserving their original split ID.
- Place the pair after and before the remaining native group.
- Reject crossing two split pairs without mutation.

The original split ID stayed unchanged and the two panes remained adjacent after every recorded native move. The group cases used `tabs.ungroup` for both panes and `tabGroups.move` for the remaining group. No split member was passed to `tabs.move`, and no split was recreated during reorder.

The first run found a harness-only error: omitted `createProperties.windowId` made Chrome create the test group in the controller window. That was corrected before the successful second run. The production grouping code already specifies the destination window.

Direct native extension-page access was blocked by the browser tool's URL policy; the native results above are user-run evidence. Orientation and divider position are not exposed by Chrome's API, so they were not measured. The physical hold-outside drag still needs a manual native UI check; its state transitions and backend operations are covered separately by automated tests and the native report.

## Run the native test

1. Load or reload the unpacked project directory at `chrome://extensions`.
2. Open `chrome-extension://YOUR_EXTENSION_ID/tests/native-split/controller.html`.
3. Click **Run native tests**. It creates four disposable tabs in a separate window, checks left/right reorder, grouping, ungrouping, placement beside the remaining group, and rejection of two split pairs crossing. Only the test tabs/groups are changed.
4. Click **Download report** and share the JSON. Inspect split orientation and divider position visually; Chrome does not expose them to the API.
5. Click **Close test tabs** to clean up. This can add those test tabs to Chrome's Recently closed history. Tabs navigated away from their test URL are not closed by cleanup.

Then manually drag a split card out of a group panel: hold the pointer outside for about half a second, continue onto the grid, and release beside an ordinary card. Check both panes remain together, the original group previews update, and Escape cancels the handoff. Also check a group containing only the split pair.

The native harness is development-only and is not included by the release packaging script.
