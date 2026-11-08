<p align="center"><img src="images/Preview image.png" alt="TabGrid のプレビュー" width="500"></p>

# TabGrid

[English](README.md) · [简体中文](README.zh-CN.md) · **日本語**

タブとタブグループのサムネイルをひとつのグリッドに表示する、ローカルで動作する Chrome 拡張機能です。ワークスペースを検索、整理、カスタマイズできます。

## インターフェースを見る

![TabGrid のタブ一覧：ページプレビューと色分けされたグループ](images/showcase/overview.png)

**開いているタブをすばやく見つける。** ページプレビューとグループをひとつのグリッドで確認し、タイトルや URL の検索とフィルターで絞り込めます。

![TabGrid の検索とフィルター：サイト、グループ、固定、音声再生、ミュート](images/showcase/search-filters.png)

**自分に合った外観に。** クラシック、フラット、グラスモーフィズムから選び、ライト・ダークモード、フォント、色、背景をカスタマイズできます。

<p align="center">
  <img src="images/showcase/appearance.png" alt="TabGrid のガラス調の外観と、クラシック、フラット、グラスモーフィズムの選択肢">
  <br>
  <sub><em>紹介用のイメージであり、正確なスクリーンショットではありません。<a href="https://github.com/Morikana39/TabGrid/blob/main/docs/showcase-artwork.md">画像の詳細</a>.</em></sub>
</p>

## インストール

**Chrome 120 以降**が必要です。Chrome で [TabGrid の Chrome ウェブストア公式ページ](https://chromewebstore.google.com/detail/tabgrid/njanhklepohgnhaklnbijfmlclmjiahp)を開き、**Chrome に追加**をクリックしてください。

手動でインストールする場合は、次の手順に従ってください。

1. [**こちら**](https://github.com/Morikana39/TabGrid/releases/latest/download/TabGrid.zip)から最新版をダウンロードするか、[リリースページ](https://github.com/Morikana39/TabGrid/releases/latest) の **Assets** から **TabGrid.zip** を選びます。
2. `TabGrid.zip` を展開し、フォルダを継続して使用する場所に保存します。
3. Chrome で `chrome://extensions` を開き、**デベロッパーモード**を有効にします。
4. **パッケージ化されていない拡張機能を読み込む**をクリックし、展開した TabGrid フォルダを選びます。
5. Chrome の拡張機能メニューを開き、**TabGrid** を固定します。
6. 拡張機能のアイコンをクリックして TabGrid を開きます。

画像付きの手順は [Chrome のガイド](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)をご覧ください。

**更新**：Chrome ウェブストアからインストールした TabGrid は、バックグラウンドで自動更新されます。手動でインストールした場合は、上のリリースリンクから最新の `TabGrid.zip` をダウンロードして展開し、既存のインストール先フォルダ内のファイルを置き換えてください。`chrome://extensions` で TabGrid の**再読み込み**をクリックし、TabGrid を開き直してください。

リリースパッケージには実行用ファイルとライセンス通知が含まれ、開発用のテスト素材、スクリーンショット、ソースマップ、未使用の依存ファイルは含まれません。ソースから作成する場合は[開発](#開発)をご覧ください。

## 使い方

- タブをクリックするとそのページに切り替わり、グループをクリックすると中のタブを表示します。タイトルや URL を検索し、**フィルター**、**並べ替え**、**カードサイズ**で表示を調整できます。
- カードをドラッグして並べ替えたり、グループ化したりできます。並べ替えには**タブの順序**を選び、文字検索とグループ以外のフィルターを解除してください。**すべてのウィンドウを表示**を有効にすると、ウィンドウ間でカードを移動できます。
- **⋮ → タブを選択**で一括操作できます。**×** でカードを閉じ、通常のウィンドウでは**元に戻す**や**最近閉じたタブ**で復元できます。アイドルタブは自動的には閉じません。
- **/** で検索、テキスト欄以外で **Ctrl+Z**（Windows/Linux）または **⌘Z**（Mac）で取り消し、**Escape** でメニューを閉じます。スワイプで閉じる操作や、タブへの切り替え後に TabGrid を閉じる機能は設定で有効にできます。

## カスタマイズ

**⋮ → 拡張機能の設定**を開きます。変更は自動保存されます。言語、ライト・ダークモード、スタイル、色、フォント、カスタム背景を選び、検索、タブの動作、ショートカット、プレビュー画質、保存容量の上限を調整できます。

設定は JSON ファイルで書き出し・読み込みできます。バックアップには閲覧履歴、タブの URL、スクリーンショット、カスタム背景は含まれません。

## プライバシーとオフライン利用

インターフェース、設定、フォント、タブの整理はローカルで動作し、サーバーやクラウド同期を必要としません。ウェブサイトの閲覧には通常どおり接続が必要です。プレビューと閲覧関連データは Chrome のローカルストレージに保存されます。ブックマーク、リーディングリスト、サイトのミュートなどの追加権限は使用時に要求します。

ツールバーアイコンは、現在の Chrome ウィンドウ内で TabGrid を開くか、既存の TabGrid を再利用します。各ウィンドウで個別の TabGrid タブを保持できます。

**最近閉じたウィンドウ：** ウィンドウの行をクリックするとタブを展開できます。検索中は一致するタブだけを表示し、タブを個別に復元するか、ウィンドウ全体を復元できます。

**すべてのプレビューを更新：** **⋮ → すべてのサムネイルを更新**を選択します。TabGrid がすべての通常ウィンドウのタブを一時的に表示し、完了後にグリッドへ戻ります。自分でタブを切り替えるか、拡張機能アイコンをクリックすると停止します。初回はボタンの場所を案内します。除外したサイト、シークレットタブ、アクセスできないページはスキップします。

撮影権限は Chrome が管理します。制限付きページでは、対象のページがアクティブな状態でツールバーアイコンやショートカットから TabGrid を開いてください。それでも撮影が拒否される場合があります。既存の TabGrid ページに直接切り替えた場合は、最後に保存したプレビューを使用します。ファイルのページには Chrome のファイルアクセス許可が必要です。

**シークレットモードでの実行を許可する**を有効にすると、プライベートウィンドウでも利用できます。通常タブとシークレットタブは分離され、シークレットモードではスクリーンショット、検索履歴、取り消し記録を保存しません。TabGrid を閉じると Chrome の「最近閉じたタブ」に記録される場合があります。復元された重複グリッドは、終了と復元のループを避けるため開いたままにします。

## ライセンス

TabGrid は [MIT ライセンス](LICENSE) で公開しています。同梱する第三者のライブラリ、フォント、アイコンには、それぞれのライセンスと著作権表示が適用されます。以下のクレジットをご覧ください。

## クレジット

以下のオープンソースプロジェクトに感謝します。

- [Material Design のモーション](https://m3.material.io/styles/motion)：カードが自然に戻る動きの参考。既存の AutoAnimate で実装しています。
- [Google Material Design Icons](https://github.com/google/material-design-icons)：メニューと設定のアイコン（[Apache 2.0](assets/icons/material/LICENSE)）。
- [SortableJS](https://github.com/SortableJS/Sortable)：ドラッグによる並べ替え（[MIT](node_modules/sortablejs/LICENSE)）。
- [FormKit AutoAnimate](https://github.com/formkit/auto-animate)：画面とカードのアニメーション（[MIT](node_modules/@formkit/auto-animate/LICENSE)）。
- [Liquid DOM](https://github.com/AndrewPrifer/liquid-dom)：グラスモーフィズムのコントロール、フィルター、メニュー、ダイアログ、スライダーに使う WebGPU 背景屈折とスプリングアニメーション（[MIT](assets/licenses/liquid-dom.txt)）。ローカル画像を使い、実験的な HTML-in-Canvas フラグは不要です。WebGPU または背景画像がない場合は CSS に切り替わります。
- [Geist / Geist Mono](https://github.com/vercel/geist-font)、[Outfit](https://github.com/Outfitio/Outfit-Fonts)、[Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans)、[Newsreader](https://github.com/productiontype/Newsreader)：同梱フォント（SIL Open Font License）。
- [Chromium / Android 版 Chrome](https://chromium.googlesource.com/chromium/src/)：重なりによるグループ化、並べ替えの境界、グループパネルのアニメーションの動作参考。[調査とデスクトップ向けの調整](docs/chrome-grid-interaction-research.md)、[Chromium ライセンス](https://chromium.googlesource.com/chromium/src/+/main/LICENSE)。
- [Leonxlnx の taste-skill](https://github.com/Leonxlnx/taste-skill)：レイアウトとスタイルの参考（[MIT](assets/licenses/taste-skill.txt)）。

外観は [Flat UI](https://github.com/designmodo/Flat-UI)、[liquidGL](https://github.com/naughtyduk/liquidGL)、[neumorphism](https://github.com/adamgiebl/neumorphism)、[clay.css](https://github.com/codeAdrian/clay.css) から着想を得ています。TabGrid 独自の CSS で実装しており、これらのランタイムは同梱していません。

パッケージには依存ライブラリのライセンス通知を残してください。Liquid DOM layout の個別通知も必要です。通知はライブラリ、[フォント](assets/fonts/README.md)、[Material アイコン](assets/icons/material/README.md)に同梱されています。

制限付きページの撮影は、Chrome の公式 [captureVisibleTab](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab) と [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) API を使用して独立に実装しています。[Tab Thumbnails](https://chromewebstore.google.com/detail/tab-thumbnails/adcmjkdmkpfdlhinedckkklaklijifpo) は動作の参考として調査しましたが、コードや素材は含めていません。調査した配布物には再利用ライセンスが見つかりませんでした。

## 開発

`npm test` と `npm run check` で検証します。画面のローカルテストには `node tests/preview-server.mjs` を実行し、`http://127.0.0.1:4173` を開きます。テスト画面は模擬タブを使用します。確認済みの動作と実際のブラウザでの確認事項は[検証メモ](docs/verification.md)をご覧ください。

Node.js 20 以降で `npm run package` を実行すると、`dist/TabGrid/` と `dist/TabGrid.zip` を作成します。パッケージ処理はローカルの実行時依存関係をたどり、第三者の通知を保持します。追加のビルド依存は不要です。画面の翻訳は `locales/`、Chrome のメタデータは `_locales/` にあります。プレースホルダーの番号を各言語で一致させ、ユーザーの内容ではなく画面のメッセージだけを翻訳してください。
