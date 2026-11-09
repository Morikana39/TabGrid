# Chrome action terminology

Verified against Chromium desktop resources on November 8, 2026. These are source-catalog matches, not a claim that every Chrome channel or operating system uses identical wording.

- [Message definitions](https://github.com/chromium/chromium/blob/main/chrome/app/generated_resources.grd)
- [Japanese translations](https://github.com/chromium/chromium/blob/main/chrome/app/resources/generated_resources_ja.xtb)
- [Simplified Chinese translations](https://github.com/chromium/chromium/blob/main/chrome/app/resources/generated_resources_zh-CN.xtb)

Native menu accelerator markers are omitted. ICU singular/plural branches are selected for the corresponding action. TabGrid retains its own labels for filtered closures, tab-order-relative actions, preview refresh, and other features whose behavior differs from Chrome. Mute tab and Unmute tab use TabGrid-specific wording because they affect only the selected tabs, unlike Chrome’s site-wide sound actions. Removing selected tabs from a group uses the removal label; acting on a whole group retains Ungroup.

| TabGrid message | Chromium resource |
| --- | --- |
| New tab (fallback page title) | `IDS_TOUCH_BAR_NEW_TAB_CUSTOMIZATION_LABEL` |
| + New tab | `IDS_TOOLTIP_NEW_TAB` |
| New regular window | `IDS_NEW_WINDOW` |
| New incognito window | `IDS_NEW_INCOGNITO_WINDOW` |
| New Window | `IDS_TAB_CXMENU_MOVETOANOTHERNEWWINDOW` |
| New group | `IDS_TAB_CXMENU_SUBMENU_NEW_GROUP` |
| New Group | `IDS_TAB_CXMENU_SUBMENU_NEW_GROUP` |
| New Tab in Group | `IDS_TAB_GROUP_HEADER_CXMENU_NEW_TAB_IN_GROUP` |
| + New tab in group | `IDS_TAB_GROUP_HEADER_CXMENU_NEW_TAB_IN_GROUP` |
| Add Tab to Group | `IDS_TAB_CXMENU_ADD_TAB_TO_GROUP` |
| Add Tabs to Group | `IDS_TAB_CXMENU_ADD_TAB_TO_GROUP` |
| Move Tab to Another Window | `IDS_TAB_CXMENU_MOVETOANOTHERWINDOW` |
| Move Tabs to Another Window | `IDS_TAB_CXMENU_MOVETOANOTHERWINDOW` |
| Add Tab to Reading List | `IDS_TAB_CXMENU_READ_LATER` |
| Add Tabs to Reading List | `IDS_TAB_CXMENU_READ_LATER` |
| Reload | `IDS_TAB_CXMENU_RELOAD` |
| Duplicate | `IDS_TAB_CXMENU_DUPLICATE` |
| Pin | `IDS_TAB_CXMENU_PIN_TAB` |
| Unpin | `IDS_TAB_CXMENU_UNPIN_TAB` |
| Close | `IDS_TAB_CXMENU_CLOSETAB` |
| Ungroup | `IDS_TAB_GROUP_HEADER_CXMENU_UNGROUP` |
| Remove from group | `IDS_TAB_CXMENU_REMOVE_TAB_FROM_GROUP` |
| Arrange split view | `IDS_TAB_CXMENU_ARRANGE_SPLIT` |
| Separate views | `IDS_SPLIT_VIEW_SEPARATE_VIEWS_ACTION_BUTTON` |
| Close left view | `IDS_SPLIT_TAB_CLOSE_LEFT_VIEW` |
| Close right view | `IDS_SPLIT_TAB_CLOSE_RIGHT_VIEW` |
