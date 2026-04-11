# Brief: search-result-map

## Problem
検索結果の店舗がどこにあるかを地図上で一目で把握できない。リスト表示のみでは空間的な位置関係が分からず、複数候補を比較して選ぶ際の判断材料が不足している。

## Current State
- 検索結果はリスト形式（PlaceCard）でのみ表示されている
- バックエンドのAPIレスポンスに座標情報（lat/lng）が含まれていない
- Google Maps JavaScript API ライブラリは未導入

## Desired Outcome
検索結果画面の右半分にGoogle Mapsが表示され、検索にヒットした全店舗がマーカーで表示される。リスト項目のクリックで対応マーカーがハイライトされ、マーカーのクリックで店舗情報のInfoWindowが開く。

## Approach
`@googlemaps/js-api-loader` を使って Google Maps JavaScript API を非同期ロードする。React コンポーネントは `useRef` + `useEffect` でネイティブの `google.maps.Map` を操作する。バックエンドは `places.location` をフィールドマスクに追加して lat/lng を返すよう変更する。

## Scope
- **In**:
  - バックエンド: `FIELD_MASK` に `places.location` を追加、`format_place` に `lat`/`lng` フィールドを追加
  - フロントエンド型定義: `Candidate` 型に `lat?`/`lng?` フィールドを追加
  - `GoogleMap` コンポーネント新規作成（マーカー表示・InfoWindow・選択連動）
  - `App.tsx` を左右2カラムレイアウトへ変更（表示幅拡大、PC専用）
  - リスト選択 ↔ マーカーハイライトの双方向連動
  - マーカークリック → InfoWindow（店舗名・評価・住所）表示
- **Out**:
  - 地図上からの新規検索
  - 経路案内・ルート表示
  - マーカークラスタリング
  - モバイル対応

## Boundary Candidates
- バックエンド: Google Places API フィールドマスクと JSON シリアライズの変更
- フロントエンド: 地図コンポーネントと既存リストコンポーネントの選択状態共有

## Out of Boundary
- 検索条件や検索フロー自体への変更
- 地図を起点にした検索機能
- モバイル・レスポンシブ対応

## Upstream / Downstream
- **Upstream**: `google-places-service`（座標データの取得元）、`frontend-api-client`（型定義の変更対象）
- **Downstream**: なし（現時点でこのスペックに依存する後続スペックはない）

## Existing Spec Touchpoints
- **Extends**: `google-places-service`（FIELD_MASK と format_place の変更）、`frontend-api-client`（Candidate 型の拡張）
- **Adjacent**: `place-card`（PlaceCard コンポーネントに選択状態の props が追加される可能性あり）

## Constraints
- PC専用（モバイルレイアウト不要）
- Google Maps JavaScript API キーは `VITE_GOOGLE_MAPS_API_KEY` 環境変数で管理
- TypeScript strict mode 準拠必須
- 月10,000マップロードまで無料（開発・小規模運用は無料枠内）
- APIコスト: `places.location` は Google Places API の基本データフィールドであり追加コストは最小限
