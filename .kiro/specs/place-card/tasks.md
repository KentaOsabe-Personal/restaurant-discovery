# 実装計画

- [ ] 1. `Recommendation` 型から不要フィールドを削除してバックエンド API と型を一致させる
  - `frontend/src/types/search.ts` の `Recommendation` 型から `photo_url: string | null` フィールドを削除する
  - `Recommendation` 型から `opening_hours: OpeningHours | null` フィールドを削除する
  - `OpeningHours` 型定義を削除する
  - `pnpm build` を実行し、既存コンシューマーへの影響がないことを TypeScript コンパイルで確認する
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 2. PlaceCard コンポーネントの実装
- [ ] 2.1 price_level 変換ユーティリティと Props 型定義を実装する
  - `PRICE_LEVEL_*` 文字列を `¥` 記号に変換する `formatPriceLevel` 純粋関数を `PlaceCard.tsx` に実装する（マッピング: INEXPENSIVE→¥ / MODERATE→¥¥ / EXPENSIVE→¥¥¥ / VERY_EXPENSIVE→¥¥¥¥、null→null、未知の値→入力値をそのまま返すフォールバック）
  - クリーンアップ済みの `Recommendation` 型を `PlaceCardProps` として利用する Props 型定義を実装する（6フィールド、`rating: number | null`・`price_level: string | null` はnull許容）
  - React 関数コンポーネントの骨格を実装し、TypeScript strict モードに準拠させる
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

- [ ] 2.2 全フィールドの表示 JSX とアクセシビリティ対応を実装する
  - 店舗名（`name`）を `<h3>` 見出し要素でレンダリングする
  - `address`（住所）と `reason`（推薦理由）を適切な要素で表示する
  - `rating` の null 条件分岐を実装する（数値の場合は表示、null の場合は非表示）
  - `price_level` を `formatPriceLevel` で変換して条件分岐表示する（null の場合は非表示）
  - Google Maps リンクを `<a href>` に `target="_blank"` と `rel="noopener noreferrer"` を付与して実装し、「Google Maps で見る」等の意味のあるラベルテキストを表示する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2_

- [ ] 3. PlaceCard テストの実装
- [ ] 3.1 基本表示・null 条件分岐テストを実装する
  - `name`、`address`、`reason` が同時にレンダリングされることを確認するテストを実装する
  - `rating` が数値の場合は表示、null の場合は非表示になることを確認するテストを実装する
  - `price_level` が文字列の場合は変換後に表示、null の場合は非表示になることを確認するテストを実装する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2_

- [ ] 3.2 Google Maps リンク・アクセシビリティテストを実装する
  - `google_maps_url` が `<a>` の `href` に設定されることを確認するテストを実装する
  - `target="_blank"` と `rel="noopener noreferrer"` が付与されることを確認するテストを実装する
  - リンクに意味のあるラベルテキストが表示されることを確認するテストを実装する
  - 店舗名が heading level 3（`<h3>`）としてレンダリングされることを確認するテストを実装する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2_

- [ ]* 3.3 formatPriceLevel ユニットテストを実装する（任意）
  - 各 `PRICE_LEVEL_*` 値が正しい `¥` 記号に変換されることを確認するテストを実装する
  - `null` 入力が `null` を返すことを確認するテストを実装する
  - 未知の入力値がフォールバックとして入力値をそのまま返すことを確認するテストを実装する
  - _Requirements: 3.1, 3.2_
