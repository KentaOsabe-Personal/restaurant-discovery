# 要件定義書

## Introduction

`SearchInput` は、ユーザーが自然文でレストラン検索条件を入力するためのフォームコンポーネントである。テキスト入力フィールドと送信ボタンで構成され、入力値のバリデーション・ローディング状態の制御・親コンポーネントへのコールバック通知を担う。app-design.md の Chunk 8 に対応する実装単位であり、Chunk 10（App.tsx 統合）のビルディングブロックとなる。

## Requirements

### Requirement 1: テキスト入力フィールドの表示

**Objective:** ユーザーとして、自然文でレストランの検索条件を入力できるテキストフィールドを持つフォームを使いたい。そうすることで「渋谷でイタリアン」のような自由なテキストで検索を開始できる。

#### Acceptance Criteria

1. The SearchInput コンポーネント shall テキスト入力フィールド（`<input type="text">`）を表示する。
2. The SearchInput コンポーネント shall 送信ボタン（`<button>`）を表示する。
3. When ユーザーがテキストフィールドに文字を入力した場合, the SearchInput コンポーネント shall 入力内容をリアルタイムにフィールドへ反映する。
4. The SearchInput コンポーネント shall プレースホルダーテキストをテキストフィールドに表示し、入力例をユーザーに示す。

---

### Requirement 2: 送信ボタンの有効・無効制御

**Objective:** ユーザーとして、入力が空のときに誤って送信できないようにしたい。そうすることで空クエリによる無駄なAPIコールを防げる。

#### Acceptance Criteria

1. While テキストフィールドが空文字または空白のみの場合, the SearchInput コンポーネント shall 送信ボタンを `disabled` 状態にする。
2. When ユーザーが1文字以上の有効な文字をテキストフィールドに入力した場合, the SearchInput コンポーネント shall 送信ボタンを `enabled` 状態にする。
3. When ユーザーが入力後にテキストをすべて削除した場合, the SearchInput コンポーネント shall 送信ボタンを再び `disabled` 状態に戻す。
4. If テキストフィールドの値が空白文字のみの場合, the SearchInput コンポーネント shall 送信ボタンを `disabled` 状態に保つ。

---

### Requirement 3: ローディング状態の制御

**Objective:** ユーザーとして、APIリクエスト処理中に入力・送信を無効化してほしい。そうすることで処理中の重複送信や誤操作を防げる。

#### Acceptance Criteria

1. While `isLoading` プロパティが `true` の場合, the SearchInput コンポーネント shall テキストフィールドを `disabled` 状態にする。
2. While `isLoading` プロパティが `true` の場合, the SearchInput コンポーネント shall 送信ボタンを `disabled` 状態にする。
3. When `isLoading` プロパティが `false` に変化した場合, the SearchInput コンポーネント shall テキストフィールドと送信ボタンを通常の操作可能状態に戻す（ただし入力値が空のときはボタンを disabled に保つ）。
4. The SearchInput コンポーネント shall `isLoading` プロパティをオプション（デフォルト `false`）として受け取る。

---

### Requirement 4: フォーム送信とコールバック通知

**Objective:** ユーザーとして、入力した検索クエリを親コンポーネントに渡したい。そうすることで App.tsx が検索処理を開始できる。

#### Acceptance Criteria

1. When ユーザーが送信ボタンをクリックした場合, the SearchInput コンポーネント shall `onSubmit` コールバックを現在のテキスト入力値（文字列）を引数として呼び出す。
2. When ユーザーがテキストフィールドにフォーカスした状態でEnterキーを押した場合, the SearchInput コンポーネント shall `onSubmit` コールバックを現在のテキスト入力値を引数として呼び出す。
3. The SearchInput コンポーネント shall `onSubmit(query: string) => void` 型のコールバックを必須プロパティとして受け取る。
4. If 送信ボタンが `disabled` の場合, the SearchInput コンポーネント shall `onSubmit` コールバックを呼び出さない。
5. If `isLoading` が `true` の場合, the SearchInput コンポーネント shall `onSubmit` コールバックを呼び出さない。

---

### Requirement 5: コンポーネントインターフェース（Props）

**Objective:** 開発者として、明確に型定義されたPropsで SearchInput を利用したい。そうすることで TypeScript の型チェックによって誤用を防げる。

#### Acceptance Criteria

1. The SearchInput コンポーネント shall 以下の Props インターフェースを持つ:
   - `onSubmit: (query: string) => void`（必須）
   - `isLoading?: boolean`（任意、デフォルト `false`）
2. The SearchInput コンポーネント shall TypeScript の `strict` モードに準拠した型定義を持つ。
3. The SearchInput コンポーネント shall React の関数コンポーネント（`React.FC` または同等）として実装される。

---

### Requirement 6: アクセシビリティ

**Objective:** ユーザーとして、スクリーンリーダーやキーボード操作でも SearchInput を使いたい。そうすることでアクセシビリティ要件を満たせる。

#### Acceptance Criteria

1. The SearchInput コンポーネント shall テキストフィールドに `aria-label` またはラベル要素を関連付ける。
2. The SearchInput コンポーネント shall 送信ボタンに意味のあるラベルテキストを表示する（例: 「探す」）。
3. While `isLoading` が `true` の場合, the SearchInput コンポーネント shall ローディング中であることをユーザーが認識できる視覚的またはセマンティックな表示を提供する（例: ボタンラベル変更、`aria-busy` 属性）。
