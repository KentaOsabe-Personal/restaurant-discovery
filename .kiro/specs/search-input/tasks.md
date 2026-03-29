# 実装タスク: SearchInput

## Task Format

- [ ] Major task — 大きな作業単位
- [ ] N.M Sub-task — 1〜3時間の実装単位

---

- [ ] 1. SearchInput コンポーネントの骨格実装
- [ ] 1.1 Props 型とコンポーネントの基盤を確立する
  - `frontend/src/components/` ディレクトリを新設し、`SearchInput.tsx` を作成する
  - `onSubmit: (query: string) => void`（必須）と `isLoading?: boolean`（省略時 `false`）を持つ Props 型を定義し、コンポーネントファイルから名前付きエクスポートする
  - TypeScript strict モードに準拠し、`any` 型を使用しない
  - 関数コンポーネント（React FC 同等パターン）として定義する
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 1.2 テキスト入力フィールドとボタンを描画する
  - `<form>` 要素で `<input type="text">` と `<button>` をラップして描画する
  - テキストフィールドに入力例を示すプレースホルダーテキストを設定する（例: 「渋谷でイタリアンなど」）
  - ボタンに「探す」というラベルテキストを表示する
  - テキストフィールドに `aria-label` 属性を付与して入力目的をスクリーンリーダーに示す
  - _Requirements: 1.1, 1.2, 1.4, 6.1, 6.2_

- [ ] 2. 入力値の制御と送信ロジックの実装
- [ ] 2.1 テキスト入力の制御とボタン有効・無効制御を実装する
  - `useState<string>('')` で入力値を管理する Controlled Component パターンを実装する
  - `onChange` ハンドラで入力値をリアルタイムに state へ反映する
  - `query.trim() === ''` を条件とする派生値でボタンの `disabled` を制御する（空白のみ入力も disabled 対象）
  - テキスト全削除後にボタンが自動的に disabled 状態へ戻ることを確認する
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4_

- [ ] 2.2 フォーム送信コールバックを実装する
  - `<form>` の `onSubmit` イベントハンドラで `event.preventDefault()` を呼び出してページリロードを防ぐ
  - ボタンクリックと Enter キーの両方でフォーム送信を捕捉し、`onSubmit` コールバックを現在の入力値を引数として呼び出す
  - `isSubmitDisabled` が `true` のとき（空入力またはローディング中）は `onSubmit` を呼び出さないガード条件を実装する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3. ローディング状態の制御を実装する
  - `isLoading` prop が `true` の間はテキストフィールドと送信ボタンの両方を `disabled` にする
  - `isSubmitDisabled` 派生値に `isLoading` を含め、ローディング中は `onSubmit` が呼び出されないようにする
  - `isLoading` が `false` に変わった際、自動的に通常の操作可能状態へ復帰させる（prop のリアクティブな変化として React が自動処理）
  - `isLoading=true` 中は `aria-busy="true"` を付与しボタンラベルを「検索中...」へ変更し、視覚・セマンティックの両面でローディングを示す
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.3_

- [ ] 4. コンポーネントテストを実装する
- [ ] 4.1 表示と状態制御のテストを書く
  - `SearchInput.test.tsx` を `components/` 配下に作成し、`render` / `screen` で初期描画（input・button の存在）を検証する
  - プレースホルダーテキストと `aria-label` が正しく設定されていることを検証する
  - `fireEvent.change` で入力後にボタンが enabled になり、全削除後に disabled へ戻ることを検証する
  - 空白のみ入力時もボタンが disabled を維持することを検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 6.1, 6.2_

- [ ] 4.2 フォーム送信とコールバックのテストを書く
  - `vi.fn()` でモックした `onSubmit` を Props に渡し、ボタンクリック時に入力値を引数として呼ばれることを検証する
  - `fireEvent.submit` でフォーム送信（Enter キー相当）時に `onSubmit` が呼ばれることを検証する
  - ボタン disabled 状態（空入力時）でのクリックで `onSubmit` が呼ばれないことを検証する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4.3 ローディング状態とアクセシビリティのテストを書く
  - `isLoading=true` のとき input と button の両方が `disabled` であることを検証する
  - `isLoading=true` のときボタンクリックしても `onSubmit` が呼ばれないことを検証する
  - `isLoading=true` のとき `aria-busy="true"` が付与され、ボタンラベルが「検索中...」になることを検証する
  - `isLoading` を `false` に変更後、入力がある場合にボタンが enabled へ戻ることを検証する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.3_
