<p align="center"><img src="images/Preview image.png" alt="TabGrid 预览" width="500"></p>

# TabGrid

[English](README.md) · **简体中文** · [日本語](README.ja.md)

一个本地运行的 Chrome 扩展，在同一网格中展示标签页和标签页分组的缩略图。搜索、整理并自定义你的工作空间。

## 界面一览

![TabGrid 标签页网格：页面预览与彩色分组](images/showcase/overview.png)

**轻松找到打开的标签页。** 在同一个网格中浏览页面预览和分组，搜索标题或网址，再通过筛选缩小范围。

![TabGrid 搜索与筛选：网站、分组、固定状态、播放音频和静音状态](images/showcase/search-filters.png)

**打造自己的工作空间。** 选择经典、扁平或玻璃拟态风格，切换浅色与深色模式，并自定义字体、颜色和背景。

<p align="center">
  <img src="images/showcase/appearance.png" alt="TabGrid 玻璃拟态外观，以及经典、扁平和玻璃拟态风格选项">
  <br>
  <sub><em>示意展示图，并非精确截图。<a href="https://github.com/Morikana39/TabGrid/blob/main/docs/showcase-artwork.md">图片说明</a>.</em></sub>
</p>

## 安装

需要 **Chrome 120 或更新版本**。

1. [**点击这里**](https://github.com/Morikana39/TabGrid/releases/latest/download/TabGrid.zip)下载最新版本，或打开[发布页面](https://github.com/Morikana39/TabGrid/releases/latest)，在 **Assets** 中选择 **TabGrid.zip**。
2. 解压 `TabGrid.zip`，并将解压后的文件夹放在长期保留的位置。
3. 在 Chrome 中打开 `chrome://extensions`，开启**开发者模式**。
4. 点击**加载已解压的扩展程序**，选择解压后的 TabGrid 文件夹。
5. 打开 Chrome 的扩展程序菜单，固定 **TabGrid**。
6. 点击扩展图标打开 TabGrid。

图文说明见 [Chrome 安装指南](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)。

**更新**：从上方发布链接下载最新的 `TabGrid.zip`，解压并替换现有安装文件夹。然后在 `chrome://extensions` 中为 TabGrid 点击**重新加载**，再重新打开 TabGrid。

发布包包含运行文件及许可声明，不包含开发测试素材、截图、源码映射和未使用的依赖文件。如需从源码打包，请参阅[开发](#开发)。

## 使用

- 点击标签页切换到对应页面，点击分组浏览其中的标签页。搜索标题或网址，使用**筛选**、**排序**和**卡片大小**调整视图。
- 拖动卡片可排序或分组。排序需使用**标签页顺序**，并清除文字搜索及非分组筛选。开启**显示所有窗口**可在窗口之间移动卡片。
- 通过 **⋮ → 选择标签页**批量操作。用 **×** 关闭卡片，在普通窗口中使用**撤销**或**最近关闭**恢复。闲置标签页不会自动关闭。
- 按 **/** 搜索，在文本框外按 **Ctrl+Z**（Windows/Linux）或 **⌘Z**（Mac）撤销，按 **Escape** 关闭菜单。可在设置中启用滑动关闭和切换标签页后关闭 TabGrid。

## 自定义

打开 **⋮ → 扩展程序设置**，更改会自动保存。可选择语言、浅色或深色模式、视觉风格、颜色、字体及自定义背景，并调整搜索、标签页行为、快捷键、预览画质和存储上限。

设置支持导出或导入 JSON 文件。备份不包含浏览历史、标签页网址、截图或自定义背景。

## 隐私与离线使用

界面、设置、字体和标签页整理均在本地运行，无需服务器或云同步。访问网站仍需要相应网络连接。预览及浏览相关数据保存在本地 Chrome 存储中；书签、阅读清单和网站静音等可选权限会在使用时请求。

点击工具栏图标会在当前 Chrome 窗口中打开或复用 TabGrid。每个窗口都可以保留自己的 TabGrid 标签页。

**最近关闭的窗口：** 点击窗口条目可展开其中的标签页。搜索时只显示匹配的标签页，可单独恢复标签页或恢复整个窗口。

**更新全部预览：**选择 **⋮ → 更新所有标签页缩略图**。TabGrid 会短暂切换到所有普通窗口中的标签页，完成后返回网格。手动切换标签页或点击扩展图标即可停止。首次使用时会显示按钮位置引导。排除的网站、无痕标签页及无法访问的页面会被跳过。

截图权限由 Chrome 控制。对于受限页面，请在目标页面处于活动状态时，通过工具栏图标或快捷键打开 TabGrid；Chrome 仍可能拒绝截图。直接切换到已有的 TabGrid 页面会使用最近保存的预览。文件页面需开启 Chrome 的文件访问权限。

启用**在无痕模式下启用**后可在无痕窗口使用。普通与无痕标签页保持分离；无痕模式不保存截图、搜索历史或撤销记录。Chrome 仍可能将 TabGrid 的关闭记录加入“最近关闭”；恢复出的重复网格会保持打开，以避免关闭与恢复循环。

## 许可证

TabGrid 采用 [MIT 许可证](LICENSE)。随附的第三方库、字体和图标保留各自的许可证及版权声明，详见下方致谢。

## 致谢

感谢以下开源项目：

- [Material Design 动效](https://m3.material.io/styles/motion)：卡片平稳回弹的参考，通过现有 AutoAnimate 动效实现。
- [Google Material Design Icons](https://github.com/google/material-design-icons)：菜单和设置图标（[Apache 2.0](assets/icons/material/LICENSE)）。
- [SortableJS](https://github.com/SortableJS/Sortable)：拖放排序（[MIT](node_modules/sortablejs/LICENSE)）。
- [FormKit AutoAnimate](https://github.com/formkit/auto-animate)：界面和卡片动画（[MIT](node_modules/@formkit/auto-animate/LICENSE)）。
- [Liquid DOM](https://github.com/AndrewPrifer/liquid-dom)：玻璃拟态控件、筛选面板、菜单、对话框及滑块的 WebGPU 背景折射和弹簧动画（[MIT](assets/licenses/liquid-dom.txt)）。使用本地图片纹理，无需实验性 HTML-in-Canvas 标志；无 WebGPU 或自定义背景时使用 CSS 回退。
- [Geist / Geist Mono](https://github.com/vercel/geist-font)、[Outfit](https://github.com/Outfitio/Outfit-Fonts)、[Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans)、[Newsreader](https://github.com/productiontype/Newsreader)：离线字体（SIL Open Font License）。
- [Chromium / Android 版 Chrome](https://chromium.googlesource.com/chromium/src/)：标签页重叠分组、排序边界及分组面板动画的行为参考。见[参考与桌面适配说明](docs/chrome-grid-interaction-research.md)及 [Chromium 许可](https://chromium.googlesource.com/chromium/src/+/main/LICENSE)。
- [Leonxlnx 的 taste-skill](https://github.com/Leonxlnx/taste-skill)：前端布局及样式参考（[MIT](assets/licenses/taste-skill.txt)）。

视觉灵感来自 [Flat UI](https://github.com/designmodo/Flat-UI)、[liquidGL](https://github.com/naughtyduk/liquidGL)、[neumorphism](https://github.com/adamgiebl/neumorphism) 和 [clay.css](https://github.com/codeAdrian/clay.css)。风格由 TabGrid 自有 CSS 实现，未包含这些项目的运行库。

打包时请保留依赖许可文件，包括单独的 Liquid DOM layout 声明。许可随依赖、[字体](assets/fonts/README.md)及 [Material 图标](assets/icons/material/README.md)一同提供。

受限页面捕获独立使用 Chrome 文档中的 [captureVisibleTab](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab) 和 [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) API。[Tab Thumbnails](https://chromewebstore.google.com/detail/tab-thumbnails/adcmjkdmkpfdlhinedckkklaklijifpo) 仅作为行为参考，其代码和资源未包含在本项目中；所检查的发行文件中未找到再利用许可。

## 开发

运行 `npm test` 和 `npm run check`。本地界面测试可运行 `node tests/preview-server.mjs`，然后打开 `http://127.0.0.1:4173`。测试页面使用模拟标签页。已验证行为和仍需原生浏览器检查的内容见[验证说明](docs/verification.md)。

使用 Node.js 20 或更新版本运行 `npm run package`，生成 `dist/TabGrid/` 和 `dist/TabGrid.zip`。打包器会跟踪本地运行时依赖并保留第三方声明，无需新增构建依赖。界面翻译位于 `locales/`，Chrome 元数据翻译位于 `_locales/`。各语言的占位符编号必须对应；只翻译界面消息，不翻译用户内容。
