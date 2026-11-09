# Chrome Web Store draft preparation

Status: prepared locally; developer-console access was blocked. No store item was created, uploaded, submitted for review, or published during this preparation. Account contact information, distribution choices, current package version, and existing listing status could not be inspected.

## Package and links

- Upload: `dist/TabGrid.zip` (no date in filename; manifest version 1.1.0).
- If an existing store item has already accepted version 1.1.0, increase the manifest version and rebuild before uploading. Do not create a duplicate item to bypass version checks.
- Project: https://github.com/Morikana39/TabGrid
- Support: https://github.com/Morikana39/TabGrid/issues
- Privacy policy: https://github.com/Morikana39/TabGrid/blob/main/PRIVACY.md
- Store icon: `assets/icons/extension/icon-128.png`.
- Suggested category: Productivity / Workflow & Planning, if offered by the dashboard.
- No sign-in or paid account is required to use TabGrid.

## English listing

Name: TabGrid

Short description: A desktop Chrome extension that brings your tabs and tab groups into one visual grid.

Detailed description:

Find and organize your Chrome tabs in a visual grid. TabGrid brings tab previews, groups, search, and recently closed tabs into one place.

• Search tab titles and URLs, filter your tabs, and choose a sort order.
• Drag to reorder or group tabs, with optional mouse swipe-to-close and Undo.
• Open groups in a larger panel and choose a thumbnail arrangement for each group card.
• Refresh eligible tab thumbnails from the More menu.
• Expand recently closed windows and restore individual tabs.
• Customize the visual style, background, card size, shortcuts, and interface language.

Available in English, Simplified Chinese, and Japanese. Settings and previews stay on your device. No account or TabGrid cloud service is needed.

Chrome restricts screenshot capture on some pages. Certain Chrome pages require clicking the extension icon or invoking its shortcut while that page is active, and capture can still be refused. Incognito previews are not stored. Updating all thumbnails temporarily switches through eligible tabs.

## Localized listing copy

### Simplified Chinese

名称：TabGrid

简短描述：以可视化网格集中查看和管理 Chrome 标签页与标签组。

详细描述：
以可视化网格查找和整理 Chrome 标签页，将标签预览、标签组、搜索和最近关闭的标签集中在一处。

• 搜索标题和网址，筛选标签并选择排序方式。
• 拖动排序或分组，可选鼠标滑动关闭，并支持撤销。
• 在更大面板中打开标签组，为每个组选择缩略图布局。
• 从更多菜单刷新符合条件的标签缩略图。
• 展开最近关闭的窗口，单独恢复其中的标签。
• 自定义外观、背景、卡片大小、快捷键和界面语言。

支持英语、简体中文和日语。设置和预览保存在本机，无需账户或 TabGrid 云服务。

Chrome 限制部分页面的截图。某些 Chrome 页面需要在该页面处于活动状态时点击扩展图标或使用快捷键，且仍可能无法截图。无痕预览不会保存。更新所有缩略图会临时切换符合条件的标签。

### Japanese

名前：TabGrid

短い説明：Chrome のタブとタブグループを一つのビジュアルグリッドで表示・整理します。

詳細説明：
Chrome のタブをビジュアルグリッドで探して整理。プレビュー、グループ、検索、最近閉じたタブを一か所にまとめます。

• タイトルや URL を検索し、タブを絞り込んで並べ替え。
• ドラッグで並べ替えやグループ化。マウスのスワイプで閉じる機能と元に戻す操作にも対応。
• グループを大きなパネルで開き、グループごとにサムネイル配置を選択。
• その他メニューから対象タブのサムネイルを更新。
• 最近閉じたウィンドウを展開し、個別のタブを復元。
• 外観、背景、カードサイズ、ショートカット、表示言語をカスタマイズ。

英語、簡体字中国語、日本語に対応。設定とプレビューは端末内に保存され、アカウントや TabGrid のクラウドサービスは不要です。

Chrome は一部のページの撮影を制限します。Chrome 内部ページでは、そのページを表示中に拡張機能アイコンやショートカットを使う必要がある場合があり、それでも撮影できない場合があります。シークレットモードのプレビューは保存しません。一括更新では対象タブが一時的に切り替わります。

## Privacy practices and permission explanations

Single purpose: Help users find, preview, organize, and restore their Chrome tabs and tab groups through a local visual grid.

Remote code: No. JavaScript, libraries, and fonts are bundled locally. Custom backgrounds are images, not executable code.

| Permission | Explanation for reviewer |
| --- | --- |
| tabs | Read titles, URLs, window membership, and tab state to display/search the grid and manage tabs. |
| activeTab | Capture the active page when the user invokes TabGrid, including restricted pages where Chrome permits capture following a user gesture. |
| tabGroups | Read, create, rename, recolor, and manage Chrome tab groups from the grid. |
| storage | Save preferences, preview metadata/cache, optional search history, and session-specific state locally. |
| scripting | Inject the bundled preview-activity script into eligible regular web pages to request preview refresh after page activity. |
| favicon | Show Chrome-provided favicons in tab cards and preview fallbacks. |
| unlimitedStorage | Store user-selected custom backgrounds and the configurable local preview cache beyond the normal storage quota. |
| sessions | Display and restore Chrome's available recently closed tabs/windows and support restoration workflows. |
| alarms | Refresh the eligible visible tab preview periodically while the background worker may otherwise suspend. |
| <all_urls> | Capture previews across arbitrary user-opened websites and inject the local activity notifier on eligible HTTP(S) pages. Pages are not predetermined; browser restrictions, site exclusions, and capture preferences still apply. |
| bookmarks (optional) | Save user-selected tabs as Chrome bookmarks when requested. |
| readingList (optional) | Add user-selected tabs to Chrome Reading List when requested. |

Data-handling review notes: tab URLs/titles and recently closed entries are browsing-related data; screenshots contain website content and may incidentally include sensitive information. Activity event signals are used for local capture scheduling. Optional search queries and user-selected backgrounds are stored locally. No developer telemetry, transmission endpoint, sale, or advertising use was found. The maintainer must review the dashboard's exact category definitions and certify the disclosures; do not claim the extension never accesses user data simply because it does not transmit it.

## Reviewer test instructions

1. Open several non-sensitive public web pages. Click TabGrid's toolbar icon to open the grid in that window.
2. Search, sort, and group tabs. Open a group card's menu → Thumbnail layout; select each visual option. Verify Settings → Previews & Storage → remaining-tab count starts enabled.
3. Try More → Update all thumbnails. Allow temporary tab activation; verify progress/cancellation and updated previews.
4. Drag and release a card. Try dragging it again during snap-back: it should remain above neighbors and reject the new drag until settled.
5. Close a disposable window containing test pages. In Recently closed, expand it and restore a single child tab. Search within the closed-window results.
6. Open TabGrid from a second Chrome window; it should reuse/create a grid in that window rather than redirecting to the first window.

## Remaining console steps — do not publish

- Inspect whether this is a new item or an update, and compare its accepted version before uploading.
- Upload the ZIP to a draft; complete localized descriptions, category, support/privacy URLs, and permission explanations.
- Review data-use certifications personally; verify publisher contact/account requirements and distribution choices.
- Add at least one actual product screenshot (1280×800 or 640×400). Use non-sensitive demo tabs. The README illustrations and debug-overlay fixture screenshots are not suitable as store screenshots. A suggested set is the grid, open group/layout menu, and recently closed window expansion.
- Store icon is prepared. Optional promotional graphics are not prepared.
- Save the draft. Do not submit for review, schedule publication, or publish.
- Native Windows Chrome validation is still outstanding; do not describe automated/fixture checks as Windows execution.

Official references checked during preparation:
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/publish
