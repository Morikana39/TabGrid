# TabGrid privacy policy

TabGrid organizes Chrome tabs and tab groups in a visual grid. It operates locally, without a TabGrid account, analytics service, advertising service, or developer-operated server.

## Data used on your device

TabGrid reads tab titles, URLs, group membership, window information, and activity timestamps to display, search, sort, and manage tabs. It reads Chrome's available recently closed sessions when you use Recently closed. It does not request Chrome's full browsing-history API permission.

When previews are enabled, TabGrid captures visible tabs and stores reduced-size screenshots locally in Chrome. Screenshots can include personal or sensitive information visible on a page. A bundled page-activity script observes activity events to request preview refreshes; it does not read typed values or send keystrokes to a server. Updating all thumbnails temporarily activates eligible tabs to capture them.

Settings, optional search history, preview caches, and a background image you choose are stored locally in Chrome extension storage or its local database. Session-specific state, including group layout choices, uses session storage. The extension does not upload these data to the developer or third parties, sell them, or use them for advertising, creditworthiness, or lending decisions. Data is used only to provide the tab-management features described here, consistent with the Chrome Web Store User Data Policy's Limited Use requirements.

## Choices and retention

You can disable screenshot capture, exclude websites, and clear stored previews in Settings. Disabling capture retains existing previews until cleared; the configured storage limit removes older previews first. Tab closure and URL changes also trigger preview cleanup. Search history is off by default, can have an expiry, and can be cleared or removed item by item. Turning search history off does not delete saved entries. Remove a custom background through Appearance settings. Settings exports exclude tab URLs, browsing/search history, screenshots, and backgrounds.

Removing the extension removes its own locally stored data through Chrome. Bookmarks, Reading List entries, and browser-managed session history are managed separately by Chrome.

## Optional browser integrations

Bookmark, Reading List, and site-sound permissions are requested when those features are used. If you choose to add bookmarks or Reading List entries, Chrome stores them and may sync them according to your browser settings. Visiting websites, restoring tabs, and opening external project/help links involves those websites' normal network requests and privacy policies.

Incognito support must be enabled separately in Chrome. TabGrid separates private and regular contexts and does not save Incognito screenshots, search history, or Undo records.

## Questions

Contact the maintainer through https://github.com/Morikana39/TabGrid/issues. Avoid posting private URLs, screenshots, or other sensitive data in public issues.
