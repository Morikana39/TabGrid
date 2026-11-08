<p align="center">
  <img src="images/Preview image.png" alt="Preview Image" width="500">
</p>

# TabGrid

**English** · [简体中文](README.zh-CN.md) · [日本語](README.ja.md)

A local Chrome extension that displays tab and tab group thumbnails in one visual grid. Search, organize, and personalize your workspace.

## A closer look

![TabGrid overview with tab previews and color-coded groups](images/showcase/overview.png)

**Find your way through open tabs.** Browse page previews and groups in one grid, then search titles or URLs and narrow the results with filters.

![TabGrid search and filters for website, group, pinned tabs, playing audio, and muted tabs](images/showcase/search-filters.png)

**Make the workspace yours.** Choose Classic, Flat, or Glassmorphism, switch between light and dark, and personalize fonts, colors, and backgrounds.

<p align="center">
  <img src="images/showcase/appearance.png" alt="TabGrid glass appearance with Classic, Flat, and Glassmorphism style choices">
  <br>
  <sub><em>Illustrative showcases, not exact screenshots.<a href="https://github.com/Morikana39/TabGrid/blob/main/docs/showcase-artwork.md">Artwork details</a>.</em></sub>
</p>

## Install

Requires **Chrome 120 or later**. Visit [TabGrid’s official Chrome Web Store page](https://chromewebstore.google.com/detail/tabgrid/njanhklepohgnhaklnbijfmlclmjiahp) in Chrome and click **Add to Chrome**.

Alternatively, install it manually:

1. [**Click here**](https://github.com/Morikana39/TabGrid/releases/latest/download/TabGrid.zip) to download the latest version, or open the [Releases page](https://github.com/Morikana39/TabGrid/releases/latest) and choose **TabGrid.zip** under **Assets**.
2. Extract `TabGrid.zip` and keep the extracted folder somewhere permanent.
3. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
4. Click **Load unpacked** and select the extracted TabGrid folder.
5. Open Chrome’s Extensions menu and pin **TabGrid**.
6. Click the extension’s icon to open TabGrid.

For illustrated instructions, see [Chrome’s installation guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

**Updating:** If installed from the Chrome Web Store, TabGrid updates automatically in the background. For a manual installation, download the latest `TabGrid.zip` from the release link above, extract it, and replace the files in your existing installation folder. Click **Reload** for TabGrid at `chrome://extensions`, then reopen TabGrid.

The release package contains runtime files and license notices, excluding development fixtures, screenshots, source maps, and unused dependency files. To build it from source, see [Development](#development).

## Use TabGrid

- Click a tab to switch to it or a group to browse its tabs. Search titles or URLs, and use **Filters**, **Sort**, and **Card size** to adjust the view.
- Drag cards to reorder or group them. Reordering requires **Tab order** with text search and non-group filters cleared. Enable **Show all windows** to move cards between windows.
- Choose **⋮ → Select tabs** for bulk actions. Close cards with **×**, and use **Undo** or **Recently closed** to restore them in regular windows. Idle tabs are not automatically closed.
- Press **/** to search, **Ctrl+Z** (Windows/Linux) or **⌘Z** (Mac) to undo outside text fields, and **Escape** to dismiss menus. Optional swipe-to-close and tab-switch closing are available in settings.

## Make it yours

Open **⋮ → Extension settings**; changes save automatically. Choose a language, light or dark mode, visual style, colors, fonts, and a custom background. Adjust search, tab behavior, shortcuts, preview quality, and storage limits.

Settings can be exported or imported as JSON. Backups exclude browsing history, tab URLs, screenshots, and custom backgrounds.

## Privacy and offline use

The interface, settings, fonts, and tab organization work locally without a server or cloud sync. Websites still need their usual connectivity. Previews and browsing-related data stay in local Chrome storage; optional bookmark, Reading List, and site-muting permissions are requested when used.

The toolbar icon opens or reuses TabGrid in the current Chrome window. Each window can keep its own TabGrid tab.

**Recently closed windows:** click a window row to expand its tabs. Search shows only matching tabs inside expanded windows. Restore individual tabs or the whole window.

**Update all previews:** choose **⋮ → Update all thumbnails**. TabGrid briefly visits tabs across regular windows, then returns you to the grid. Switching tabs yourself or clicking the extension icon stops the update. A first-use walkthrough points out the command. Excluded, private, and inaccessible pages are skipped.

Chrome controls screenshot access. For restricted pages, open TabGrid through its toolbar icon or shortcut while the target page is active; capture may still be refused. Opening an existing TabGrid tab directly uses the latest saved preview. File pages need Chrome’s file-access permission.

Enable **Allow in Incognito** to use TabGrid in private windows. Regular and private tabs stay separate; Incognito does not save screenshots, search history, or Undo records. Chrome may still record TabGrid closures in Recently closed; restored duplicate grids remain open to avoid a close/restore loop.

## License

TabGrid is licensed under the [MIT License](LICENSE). Bundled third-party libraries, fonts, and icons retain their own licenses and copyright notices; see [Credits](#credits).

## Credits

Thank you to the open-source projects behind TabGrid:

- [Material Design motion](https://m3.material.io/styles/motion) — reference for restrained card-return motion, implemented through the existing AutoAnimate effects.
- [Google Material Design Icons](https://github.com/google/material-design-icons) — bundled menu and settings icons ([Apache 2.0](assets/icons/material/LICENSE)).
- [SortableJS](https://github.com/SortableJS/Sortable) — drag-and-drop ordering ([MIT](node_modules/sortablejs/LICENSE)).
- [AutoAnimate by FormKit](https://github.com/formkit/auto-animate) — interface and card animations ([MIT](node_modules/@formkit/auto-animate/LICENSE)).
- [Liquid DOM](https://github.com/AndrewPrifer/liquid-dom) — WebGPU wallpaper refraction for controls, filter panels, menus, dialogs, and slider surfaces, plus live springs and easing for Glassmorphism interactions ([MIT](assets/licenses/liquid-dom.txt)). Uses a local image texture, so the experimental HTML-in-Canvas flag is not required; CSS is used when WebGPU or a custom background is unavailable.
- [Geist / Geist Mono](https://github.com/vercel/geist-font), [Outfit](https://github.com/Outfitio/Outfit-Fonts), [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans), and [Newsreader](https://github.com/productiontype/Newsreader) — bundled fonts (SIL Open Font License).
- [Chromium / Chrome for Android](https://chromium.googlesource.com/chromium/src/) — reference for tab-overlap grouping, reorder boundaries, and group-panel animation. [Reference notes and desktop adaptations](docs/chrome-grid-interaction-research.md); [Chromium license](https://chromium.googlesource.com/chromium/src/+/main/LICENSE).
- [taste-skill by Leonxlnx](https://github.com/Leonxlnx/taste-skill) — frontend layout and styling ([MIT](assets/licenses/taste-skill.txt)).

The material styles draw visual inspiration from [Flat UI](https://github.com/designmodo/Flat-UI), [liquidGL](https://github.com/naughtyduk/liquidGL), [neumorphism](https://github.com/adamgiebl/neumorphism), and [clay.css](https://github.com/codeAdrian/clay.css). These styles are implemented in TabGrid’s own CSS; those projects’ runtimes are not bundled.

Keep the bundled dependency license files when packaging the extension, including the separate Liquid DOM layout notice. Third-party license notices are included with the libraries, [bundled fonts](assets/fonts/README.md), and [Material Design icons](assets/icons/material/README.md).

Restricted-page capture uses Chrome’s documented [captureVisibleTab](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab) and [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) APIs. [Tab Thumbnails](https://chromewebstore.google.com/detail/tab-thumbnails/adcmjkdmkpfdlhinedckkklaklijifpo) was inspected as a behavioral reference; no code or assets from it are included. Its inspected distribution did not contain a reuse license.

## Development

Run `npm test` and `npm run check`. For a local UI fixture, run `node tests/preview-server.mjs` and open `http://127.0.0.1:4173`. The fixture uses simulated tabs. See [verification notes](docs/verification.md) for tested behavior and remaining native-browser checks.

Run `npm run package` with Node.js 20 or later to create `dist/TabGrid/` and `dist/TabGrid.zip`. The packager follows local runtime imports and keeps third-party notices; no additional build dependencies are required. Translations live in `locales/`, with Chrome metadata in `_locales/`. Keep placeholder numbers aligned between languages and use translated text only for interface messages, never for user content.
