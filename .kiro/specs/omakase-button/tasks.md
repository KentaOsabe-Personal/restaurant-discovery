# 実装タスク

---

- [x] 1. プリセットクエリ設定ファイルを作成する
  - `OmakasePreset` 型（string エイリアス）と `omakasePresets` 定数配列を export する
  - 配列を `readonly` として定義し、実行時の変更を防止する
  - 初期値として「新潟市 今夜のおすすめ居酒屋」「古町 隠れ家的な店」「万代 コスパの良い飲み屋」「新潟駅前 〆のラーメン」の4件を含める
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. OmakaseButton コンポーネントを実装する
- [x] 2.1 ボタンの基本構造とスタイリングを実装する
  - `OmakaseButtonProps`（`presets`, `onSelect`, `isLoading`）を受け取る
  - `<button type="button">` 要素としてラベルに「おまかせ」と表示する
  - Tailwind CSS v4 を使用し、QuickSearchButtons と統一したデザイントーンでスタイリングする
  - タップ領域として最低 44×44px を確保する
  - _Requirements: 2.2, 2.3, 5.1, 5.3_

- [x] 2.2 クリック時のランダム選択ロジックを実装する
  - クリックハンドラー内で `Math.random()` を使いプリセット配列からインデックスを決定する
  - 選択されたクエリ文字列で `onSelect` を正確に1回呼び出す
  - _Requirements: 3.1_

- [x] 2.3 ローディング中および空プリセット時の無効化制御を実装する
  - `isLoading === true` または `presets.length === 0` のとき `disabled` 属性を付与する
  - 無効化状態で opacity 低下・カーソル変更を Tailwind CSS で表現する
  - _Requirements: 4.1, 4.2, 5.2_

- [x] 3. App.tsx に OmakaseButton を組み込む
  - `OmakaseButton` と `omakasePresets` を import する
  - 検索フォーム付近（QuickSearchButtons と同じセクション）に `<OmakaseButton presets={omakasePresets} onSelect={handleQuickSearch} isLoading={isLoading} />` をマウントする
  - 既存の `handleQuickSearch`・`handleSearch`・`isLoading` state は変更しない
  - _Requirements: 2.1, 3.2, 3.3, 3.4, 4.3_

- [x] 4. テストを実装する
- [x] 4.1 (P) OmakaseButton のユニットテストを実装する
  - `isLoading=false` かつ `presets` に要素があるとき、ボタンが enabled でレンダリングされることを検証する
  - `isLoading=true` のとき `disabled` 属性が付与されることを検証する
  - `presets` が空配列のとき `disabled` になることを検証する
  - `vi.spyOn(Math, 'random').mockReturnValue(0)` でモックし、クリック時に `onSelect` がインデックス0のクエリで1回呼ばれることを検証する
  - `disabled` 状態でクリックしても `onSelect` が呼ばれないことを検証する
  - ボタンラベルに「おまかせ」が表示されることを検証する
  - _Requirements: 2.2, 3.1, 4.1, 4.2, 5.1, 5.2_
