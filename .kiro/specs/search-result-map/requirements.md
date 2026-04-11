# Requirements Document

## Introduction

検索結果画面にGoogle Mapsを統合し、ヒットした全店舗を地図上にマーカーで表示する機能。PC環境において、現在のリスト表示の右半分に地図パネルを追加し、リスト項目とマーカーの双方向選択連動・マーカークリックによるInfoWindow表示を提供する。バックエンドはGoogle Places APIのレスポンスに座標情報（lat/lng）を追加して返す。

## Boundary Context

- **In scope**: 検索APIへの座標フィールド（`lat`/`lng`）追加、検索結果画面の左右2カラムレイアウト（PC専用）、地図上への全候補マーカー表示、リスト↔マーカーの双方向選択ハイライト、マーカークリックによるInfoWindow（店舗名・評価・住所）表示、地図読み込み失敗時のエラー表示
- **Out of scope**: 地図上からの新規検索・絞り込み、経路案内・ルート表示、マーカークラスタリング、モバイル・レスポンシブ対応
- **Adjacent expectations**: バックエンドのGoogle Places APIフィールドマスク変更・`format_place`の座標出力はこの機能が担当する。フロントエンドの`Candidate`型拡張（`lat?`/`lng?`フィールド追加）はこの機能が所有する。`PlaceCard`コンポーネントに選択状態が伝播する可能性があるが、PlaceCard内部の表示ロジックの変更はこの機能のスコープ外。

## Requirements

### Requirement 1: バックエンドの座標データ提供

**Objective:** 開発者として、検索APIが各レストランの緯度・経度を返すことを求める。それにより、フロントエンドが正確な位置に地図マーカーを配置できるようにするため。

#### Acceptance Criteria
1. When `/api/search` エンドポイントの呼び出しが成功した場合, the Restaurant Discovery System shall レスポンス内の各候補オブジェクトに `lat` および `lng` の数値フィールドを含める。
2. When `/api/omakase` エンドポイントの呼び出しが成功した場合, the Restaurant Discovery System shall レスポンス内の各候補オブジェクトに `lat` および `lng` の数値フィールドを含める。
3. If Google Places API からレストランの位置情報が取得できない場合, the Restaurant Discovery System shall レスポンス全体を失敗させることなく `lat` および `lng` フィールドに `null` を返す。

### Requirement 2: 検索結果・地図の分割レイアウト

**Objective:** ユーザーとして、デスクトップ環境で検索結果リストと地図を横並びに表示することを求める。それにより、レストランの空間的な分布を一目で把握できるようにするため。

#### Acceptance Criteria
1. When デスクトップブラウザで検索結果が表示された場合, the Restaurant Discovery System shall 左半分にレストランリスト、右半分に地図パネルを配置した2カラムレイアウトを描画する。
2. While 最初の検索が完了する前（初期状態）は, the Restaurant Discovery System shall 地図パネルを表示しない。
3. If 検索が0件のレストランを返した場合, the Restaurant Discovery System shall 地図パネルを表示しない。
4. The Restaurant Discovery System shall 2カラムレイアウトをデスクトップ環境専用で表示する。モバイルやレスポンシブへの対応は不要。

### Requirement 3: 地図上の店舗マーカー表示

**Objective:** ユーザーとして、検索にヒットした全レストランを地図上にマーカーで表示することを求める。それにより、位置と空間的な分布を一目で把握できるようにするため。

#### Acceptance Criteria
1. When 有効な座標を持つ検索結果が読み込まれた場合, the Restaurant Discovery System shall `lat`/`lng` が非nullの各レストランに1つのマーカーを配置したGoogle Mapsビューを表示する。
2. When マーカーが描画された場合, the Restaurant Discovery System shall 全マーカーが収まるようにマップビューポートを調整する。
3. If レストランの `lat`/`lng` が null の場合, the Restaurant Discovery System shall そのレストランを地図から除外し、他のマーカーの表示には影響を与えない。

### Requirement 4: リスト↔マーカーの双方向選択連動

**Objective:** ユーザーとして、リスト上のレストランを選択すると対応する地図マーカーがハイライトされること（およびその逆）を求める。それにより、リスト項目と地図上の位置を直感的に対応付けられるようにするため。

#### Acceptance Criteria
1. When ユーザーがリスト内のレストランをクリックした場合, the Restaurant Discovery System shall 地図上の対応するマーカーを、未選択マーカーと区別できるよう視覚的にハイライトする。
2. When ユーザーが地図上のマーカーをクリックした場合, the Restaurant Discovery System shall リスト内の対応するレストランを視覚的にハイライトする。
3. When リストクリックまたはマーカークリックにより別のレストランが選択された場合, the Restaurant Discovery System shall 直前に選択されていたアイテムのハイライトを解除し、新たに選択されたアイテムにハイライトを適用する。
4. The Restaurant Discovery System shall リストと地図の両方にわたって、同時に選択できるレストランを常に1件のみとする。

### Requirement 5: マーカークリック時のInfoWindow表示

**Objective:** ユーザーとして、地図マーカーをクリックするとレストランの主要情報がポップアップ表示されることを求める。それにより、リストに戻ることなく詳細を確認できるようにするため。

#### Acceptance Criteria
1. When ユーザーが地図上のマーカーをクリックした場合, the Restaurant Discovery System shall そのレストランの名前・評価・住所を含むInfoWindowを表示する。
2. When InfoWindowが開いている状態でユーザーが別のマーカーをクリックした場合, the Restaurant Discovery System shall 現在のInfoWindowを閉じ、クリックされたマーカーの新しいInfoWindowを開く。
3. When ユーザーがInfoWindowの閉じるコントロールを操作した場合, the Restaurant Discovery System shall 現在選択中のレストランを変更せずにInfoWindowを閉じる。

### Requirement 6: 地図読み込みエラーの処理

**Objective:** ユーザーとして、地図の読み込みに失敗した場合に通知を受けることを求める。それにより、地図が表示されない理由を把握しながらレストランリストを使い続けられるようにするため。

#### Acceptance Criteria
1. If Google Maps APIの読み込みが失敗した場合, the Restaurant Discovery System shall 地図パネルエリアに地図が利用できない旨のエラーメッセージを表示する。
2. If Google Maps APIの読み込みが失敗した場合, the Restaurant Discovery System shall レストランリストの表示を中断せず継続する。
