# 4エリアおまかせ機能 実装計画

## Context

Restaurant Discovery（新潟の夜の店探し個人アプリ）の「おまかせ」機能を強化する。現行の `OmakaseButton` は `frontend/src/config/omakasePresets.ts` にハードコードされた4つの固定クエリ文字列（「新潟市 今夜のおすすめ居酒屋」「古町 隠れ家的な店」「万代 コスパの良い飲み屋」「新潟駅前 〆のラーメン」）からランダムに1つ選んで既存 `/api/search` に投げるだけの実装で、すぐにパターンが読めて飽きる。

### 目標
「完全お任せ」体験を実現する。偶然性を最大化し、知らない店との出会いを毎回提供する。ただし新潟県全域はノイズが多すぎるので、ユーザーが普段行く4つのエリアに絞る。

### 機能要件（ユーザーと確定済み）
- **4つのエリア別おまかせボタン**:
  - 新潟駅前でおすすめ（新潟駅北側の万代・弁天・花園等）
  - 新潟駅南でおすすめ（新潟駅南側のけやき通り・米山等）
  - 古町でおすすめ（萬代橋を渡った古町地区全般）
  - 長岡でおすすめ（長岡駅周辺）
- **件数**: 最大5件（既存 `RecommendationList` に合わせる）
- **AI推薦理由**: 生成する（既存 `RecommendationService` = OpenAI gpt-5-nano を流用）
- **ジャンル**: 夜向きで固定（`"居酒屋 バー"`）
- **毎回違う結果**: 各ボタンに紐づくサブエリア配列からランダム抽選し、Places検索 → 結果からさらにランダム5件抽選

### 非機能要件
- 自然文パース用の `QueryParserService` はおまかせでは**使わない**（Claude 呼び出しではなく OpenAI だが、いずれにせよ AI 呼び出し1回分を節約）
- 既存 `/api/search` は自然文検索用として変更せず残す
- 既存の `RecommendationService` は破壊的変更を避け、オプション引数で拡張

---

## 設計概要

### 全体アーキテクチャ

```
[おまかせボタン押下]
   ↓
  POST /api/omakase { area: "ekimae" | "ekinan" | "furumachi" | "nagaoka" }
   ↓
[Api::OmakaseController#create]
   ↓
[OmakaseService#call(area_id)] — サブエリアをランダム抽選して conditions を返す
   ↓
[GooglePlacesService#call(conditions)] — 既存サービス流用、20件取得
   ↓
[places.sample(5)] — コントローラー内でランダム5件抽選
   ↓
[RecommendationService#call(sampled, query, min_count: 5, max_count: 5)]
   ↓ (OpenAI gpt-5-nano 呼び出し1回)
[レスポンス: 既存 /api/search と同構造 + omakase メタ情報]
   ↓
[フロント: handleOmakase が state に反映]
   ↓
[既存 RecommendationList で表示]
```

### バックエンド設計

#### 1. ルーティング追加
`backend/config/routes.rb` の `namespace :api` 内に1行追加:
```ruby
namespace :api do
  post "search",  to: "search#create"
  post "omakase", to: "omakase#create"  # 新規
end
```

#### 2. `OmakaseService`（新規, `backend/app/services/omakase_service.rb`）
エリアID → `GooglePlacesService` に渡せる `conditions` Hash に変換する純粋関数。Places呼び出しや抽選は含めない（単体テスト容易性）。

```ruby
class OmakaseService
  UnknownArea = Class.new(StandardError)

  NIGHT_GENRE = "居酒屋 バー"

  SUB_AREAS = {
    "ekimae" => {
      prefix: "新潟市中央区",
      names: %w[万代 弁天 花園 東大通 万代シテイ 天神 明石]
    },
    "ekinan" => {
      prefix: "新潟市中央区",
      names: %w[けやき通り 米山 笹口 天神尾 南笹口 鐙]
    },
    "furumachi" => {
      prefix: "新潟市中央区",
      names: %w[古町通 西堀 東堀 本町 上古町 古町8番町 古町9番町]
    },
    "nagaoka" => {
      prefix: "長岡市",
      names: %w[大手通 殿町 表町 城内町 坂之上町]
    }
  }.freeze

  def initialize(random: Random.new)
    @random = random
  end

  def call(area_id)
    entry = SUB_AREAS[area_id]
    raise UnknownArea, "unknown area_id: #{area_id}" unless entry

    sub_area = entry[:names].sample(random: @random)
    {
      area: "#{entry[:prefix]} #{sub_area}",
      genre: NIGHT_GENRE,
      price_level: nil,
      keyword: nil,
      sub_area: sub_area,
      area_id: area_id
    }
  end
end
```

**サブエリア裏取り済み** (Plan agent の WebSearch 結果):
- 駅前側（万代エリア）: 万代、弁天、花園、東大通 等
- 駅南側: けやき通り、米山、笹口、天神尾 等
- 古町: 古町通、西堀、東堀、本町、上古町、古町8-9番町 等
- 長岡: 大手通、殿町、表町、城内町 等

**Places Text Search クエリ精度の設計判断**: `build_text_query` は `[area, genre, keyword].compact.join(" ")` で結合される（`google_places_service.rb:56-60`）ので、`area` に `"新潟市中央区 万代"` と行政区まで含めると同名地名混入リスクを最小化できる。全国の「万代」で検索するリスクを回避。

#### 3. `Api::OmakaseController`（新規, `backend/app/controllers/api/omakase_controller.rb`）
`SearchController` と同じ `rescue_from` パターンを踏襲。

```ruby
module Api
  class OmakaseController < BaseController
    rescue_from StandardError do |e|
      Rails.logger.error("#{e.class}: #{e.message}")
      render json: { error: "内部エラーが発生しました" }, status: :internal_server_error
    end

    rescue_from GooglePlacesError, RecommendationError do |e|
      Rails.logger.error("#{e.class}: #{e.message}")
      render json: { error: "外部サービスとの通信に失敗しました" }, status: :bad_gateway
    end

    rescue_from OmakaseService::UnknownArea do |e|
      Rails.logger.error("#{e.class}: #{e.message}")
      render json: { error: "area must be one of ekimae/ekinan/furumachi/nagaoka" }, status: :unprocessable_content
    end

    def create
      area_id = params[:area]
      unless area_id.is_a?(String) && !area_id.strip.empty?
        render json: { error: "area must be a non-empty string" }, status: :unprocessable_content
        return
      end

      conditions = OmakaseService.new.call(area_id)
      places = GooglePlacesService.new.call(conditions.slice(:area, :genre, :price_level, :keyword))

      if places.empty?
        render json: build_response([], conditions), status: :ok
        return
      end

      sampled = places.sample(5)
      query_for_recommendation = "#{conditions[:sub_area]}で夜の居酒屋・バーおまかせ"
      recommendations = RecommendationService.new.call(sampled, query_for_recommendation, min_count: 5, max_count: 5)

      render json: build_response(recommendations, conditions), status: :ok
    end

    private

    def build_response(recommendations, conditions)
      {
        recommendations: recommendations,
        other_candidates: [],
        parsed_conditions: {
          area: conditions[:area],
          genre: conditions[:genre],
          price_level: nil,
          keyword: nil
        },
        omakase: {
          area_id: conditions[:area_id],
          sub_area: conditions[:sub_area]
        }
      }
    end
  end
end
```

#### 4. `RecommendationService` の拡張
プロンプト内の「3〜5件」を `min_count`/`max_count` オプション引数で可変化。既存呼び出しはデフォルト値（`min_count: 3, max_count: 5`）で互換性維持。

```ruby
SYSTEM_PROMPT_TEMPLATE = <<~PROMPT
  あなたはレストラン推薦アシスタントです。
  ユーザーのクエリと候補店リスト（candidates）を受け取り、最も適した %<min>d〜%<max>d 件を選んでください。
  # ... 以下同じ
PROMPT

def call(places, query, min_count: 3, max_count: 5)
  return [] if places.empty?
  prompt = format(SYSTEM_PROMPT_TEMPLATE, min: min_count, max: max_count)
  # ... messages の system content に prompt を使う
end
```

**5件固定 vs 最大5件**: `min_count: 5, max_count: 5` を渡してもLLMが5件未満に絞る可能性がある（候補名不一致で弾くケース等）。実用上は「最大5件」として許容する。

### フロントエンド設計

#### 1. 設定ファイル置き換え
- **削除**: `frontend/src/config/omakasePresets.ts`
- **新設**: `frontend/src/config/omakaseAreas.ts`

```ts
export type OmakaseAreaId = 'ekimae' | 'ekinan' | 'furumachi' | 'nagaoka';

export type OmakaseArea = {
  id: OmakaseAreaId;
  label: string;
};

export const omakaseAreas: readonly OmakaseArea[] = [
  { id: 'ekimae',    label: '新潟駅前でおすすめ' },
  { id: 'ekinan',    label: '新潟駅南でおすすめ' },
  { id: 'furumachi', label: '古町でおすすめ' },
  { id: 'nagaoka',   label: '長岡でおすすめ' },
];
```

#### 2. 型定義追加（`frontend/src/types/search.ts`）
```ts
export type OmakaseMeta = { area_id: string; sub_area: string };
export type OmakaseResponse = SearchResponse & { omakase: OmakaseMeta };
```

#### 3. API関数追加（`frontend/src/api/omakase.ts`）
```ts
import type { OmakaseResponse } from '../types/search';
import type { OmakaseAreaId } from '../config/omakaseAreas';

export async function fetchOmakase(areaId: OmakaseAreaId): Promise<OmakaseResponse> {
  const response = await fetch('/api/omakase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area: areaId }),
  });
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  return response.json() as Promise<OmakaseResponse>;
}
```

#### 4. コンポーネント置き換え
- **削除**: `frontend/src/components/OmakaseButton.tsx`, `frontend/src/components/OmakaseButton.test.tsx`
- **新設**: `frontend/src/components/OmakaseButtons.tsx`（複数形）、`OmakaseButtons.test.tsx`

`QuickSearchButtons` の構造を踏襲（`frontend/src/components/QuickSearchButtons.tsx` を参考にする）。4ボタンを `flex flex-wrap gap-2` で横並び、`min-h-[44px]` でタップサイズ確保。

```tsx
export interface OmakaseButtonsProps {
  areas: readonly OmakaseArea[];
  onSelect: (areaId: OmakaseAreaId) => void;
  isLoading: boolean;
}
```

#### 5. `App.tsx` の改修
- import を `omakaseAreas` / `OmakaseButtons` / `fetchOmakase` に差し替え
- 新ハンドラ `handleOmakase(areaId: OmakaseAreaId)` を追加:
  ```ts
  async function handleOmakase(areaId: OmakaseAreaId): Promise<void> {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    setOtherCandidates(null);
    setShowOtherCandidates(false);
    setParsedConditions(null);
    setQuery('');  // 自然文入力欄はクリア
    try {
      const response = await fetchOmakase(areaId);
      setRecommendations(response.recommendations);
      setOtherCandidates(response.other_candidates);
      setParsedConditions(response.parsed_conditions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'おまかせ取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }
  ```
- `addToHistory` は**呼ばない**（検索履歴は自然文の再実行が目的なので、エリアIDを混ぜない）
- JSX: `<OmakaseButton ...>` を `<OmakaseButtons areas={omakaseAreas} onSelect={handleOmakase} isLoading={isLoading} />` に置き換え

---

## 実装タスク（順序・独立検証可能）

### Task 1: `RecommendationService` の拡張
**目的**: プロンプトの「3〜5件」を `min_count`/`max_count` で動的化、既存呼び出しとの後方互換維持。

**触るファイル**:
- `backend/app/services/recommendation_service.rb` — `SYSTEM_PROMPT` を `SYSTEM_PROMPT_TEMPLATE` にし `format` 経由で組み立てる、`call` に `min_count: 3, max_count: 5` キーワード引数追加
- `backend/spec/services/recommendation_service_spec.rb` — 既存 context 無改変、新 context「min_count/max_count 指定時はプロンプトに反映される」追加

**検証**: `docker compose exec backend bundle exec rspec spec/services/recommendation_service_spec.rb` で既存テスト全通過 + 新テスト通過

### Task 2: `OmakaseService` 実装とテスト
**目的**: エリアID → conditions 変換を純粋関数として実装。

**触るファイル**:
- `backend/app/services/omakase_service.rb`（新規）
- `backend/spec/services/omakase_service_spec.rb`（新規）

**テストケース**:
- 既知の4エリアIDそれぞれで `area:` / `genre:` / `sub_area:` / `area_id:` が組み立てられる
- 未知エリアIDで `OmakaseService::UnknownArea` を raise
- `Random.new(42)` をコンストラクタ注入して再現可能性を確認
- 4エリア全ての `SUB_AREAS` 配列が非空、`prefix` が設定済み

**検証**: `docker compose exec backend bundle exec rspec spec/services/omakase_service_spec.rb`

### Task 3: ルーティング追加 + ルーティングspec
**触るファイル**:
- `backend/config/routes.rb` — `namespace :api` 内に `post "omakase", to: "omakase#create"` 追加
- `backend/spec/routing/api/omakase_routing_spec.rb`（新規、`search_routing_spec.rb` を参考）

**検証**:
- `docker compose exec backend bundle exec rspec spec/routing/api/omakase_routing_spec.rb`
- `docker compose exec backend bin/rails routes | grep omakase` で出力確認

### Task 4: `Api::OmakaseController` 実装 + リクエストspec
**触るファイル**:
- `backend/app/controllers/api/omakase_controller.rb`（新規）
- `backend/spec/requests/api/omakase_spec.rb`（新規、`search_spec.rb` のパターンを踏襲）

**テストケース**（`allow_any_instance_of(GooglePlacesService)` / `allow_any_instance_of(RecommendationService)` モック戦略）:
- 4エリア各IDで 200 OK、レスポンスに `recommendations` / `other_candidates: []` / `parsed_conditions` / `omakase` を含む
- Places 20件モック → `RecommendationService` に渡される件数 ≤ 5 を検証
- Places 0件モック → `recommendations: []` で 200
- Places 3件モック → RecommendationService に3件渡る（件数不足時は全件）
- `area` が未知値（`"unknown"`）→ 422 + エラーメッセージ
- `area` が nil / 空文字 / 数値 → 422
- `GooglePlacesError` / `RecommendationError` → 502
- 未分類例外 → 500
- **`QueryParserService` が呼ばれないこと**を `expect_any_instance_of(QueryParserService).not_to receive(:call)` で検証

**検証**: `docker compose exec backend bundle exec rspec spec/requests/api/omakase_spec.rb`

### Task 5: バック統合動作確認（手動）
**検証**:
```bash
docker compose up
curl -X POST http://localhost:3001/api/omakase \
  -H 'Content-Type: application/json' \
  -d '{"area":"ekimae"}'
```
→ 実 Google Places API + OpenAI API が呼ばれて 5件以下の推薦が返ること。4エリアそれぞれで疎通確認。ジャンル/エリアバイアスが狙い通りかを目視確認し、必要なら `SUB_AREAS` 配列を微調整。

### Task 6: フロント型定義とAPI関数
**触るファイル**:
- `frontend/src/types/search.ts` — `OmakaseMeta`, `OmakaseResponse` 追加
- `frontend/src/api/omakase.ts`（新規）
- `frontend/src/api/omakase.test.ts`（新規、`search.test.ts` のパターン踏襲 = `vi.stubGlobal('fetch', ...)` or `vi.spyOn(global, 'fetch')`）

**テストケース**: 正常系（200+JSON）、4xx、5xx、ネットワークエラー

**検証**: `docker compose exec frontend pnpm test -- omakase.test`

### Task 7: `omakaseAreas` 設定と `OmakaseButtons` コンポーネント新設
**触るファイル**:
- `frontend/src/config/omakaseAreas.ts`（新規）
- `frontend/src/components/OmakaseButtons.tsx`（新規）
- `frontend/src/components/OmakaseButtons.test.tsx`（新規）

**テストケース**:
- 4ボタンのラベルが正しく描画される
- `isLoading=true` で全ボタンが disabled
- 各ボタンクリックで `onSelect` が対応する `areaId` で呼ばれる
- disabled 時のクリックで `onSelect` が呼ばれない

**検証**: `docker compose exec frontend pnpm test -- OmakaseButtons`

### Task 8: `App.tsx` 差し替えと旧ファイル削除
**触るファイル**:
- `frontend/src/App.tsx` — import 差し替え、`handleOmakase` 追加、JSX のボタン置き換え
- `frontend/src/App.test.tsx` — 既存テストが旧 `OmakaseButton` に触れていたら修正（実装時に内容確認）
- **削除**: `frontend/src/components/OmakaseButton.tsx`
- **削除**: `frontend/src/components/OmakaseButton.test.tsx`
- **削除**: `frontend/src/config/omakasePresets.ts`

**検証**:
- `docker compose exec frontend pnpm test` で全テスト通過
- `docker compose exec frontend pnpm build` で tsc + vite build 通過
- dev server で実際に4ボタン表示、クリック動作を目視確認

### Task 9: End-to-End 手動確認
**検証**:
- Docker Compose フル起動
- 4エリア × 2〜3回ずつクリックして以下を確認:
  - 異なるサブエリアの店が毎回出る
  - 推薦理由が各店に付与されている
  - ローディング中はボタン全部 disabled
  - エラー時のハンドリング（バックを落とした状態でクリック → エラー表示）
- ブラウザ devtools の Network タブで `/api/omakase` のリクエスト/レスポンス形状を確認

---

## 変更対象ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `backend/app/services/recommendation_service.rb` | 修正 | `min_count`/`max_count` オプション引数追加、プロンプトをテンプレート化 |
| `backend/spec/services/recommendation_service_spec.rb` | 修正 | 新context追加、既存は無改変 |
| `backend/app/services/omakase_service.rb` | 新規 | サブエリア定数 + 純粋関数 |
| `backend/spec/services/omakase_service_spec.rb` | 新規 | 単体テスト |
| `backend/config/routes.rb` | 修正 | `post "omakase"` 追加 |
| `backend/spec/routing/api/omakase_routing_spec.rb` | 新規 | ルーティングテスト |
| `backend/app/controllers/api/omakase_controller.rb` | 新規 | エンドポイント実装 |
| `backend/spec/requests/api/omakase_spec.rb` | 新規 | リクエストspec |
| `frontend/src/types/search.ts` | 修正 | `OmakaseMeta`, `OmakaseResponse` 型追加 |
| `frontend/src/api/omakase.ts` | 新規 | `fetchOmakase` 関数 |
| `frontend/src/api/omakase.test.ts` | 新規 | API関数テスト |
| `frontend/src/config/omakaseAreas.ts` | 新規 | 4エリア定義 |
| `frontend/src/components/OmakaseButtons.tsx` | 新規 | 4ボタンコンポーネント |
| `frontend/src/components/OmakaseButtons.test.tsx` | 新規 | コンポーネントテスト |
| `frontend/src/App.tsx` | 修正 | `handleOmakase` 追加、JSX差し替え |
| `frontend/src/App.test.tsx` | 修正（可能性） | `OmakaseButton` 参照があれば更新 |
| `frontend/src/components/OmakaseButton.tsx` | **削除** | 旧単一ボタン |
| `frontend/src/components/OmakaseButton.test.tsx` | **削除** | 旧テスト |
| `frontend/src/config/omakasePresets.ts` | **削除** | 旧プリセット |

---

## 既存コードの再利用

- `backend/app/services/google_places_service.rb` — **そのまま流用**。`PAGE_SIZE=20`, `FIELD_MASK` 最小化済みの設計を変更せず利用
- `backend/app/services/recommendation_service.rb` — オプション引数追加のみで既存呼び出し影響なし
- `backend/app/controllers/api/base_controller.rb` — 基底継承
- `frontend/src/components/RecommendationList.tsx` — おまかせ結果表示に流用
- `frontend/src/components/OtherCandidateSection.tsx` — おまかせは `other_candidates: []` 固定なので空表示（既存ロジック自然動作）
- `frontend/src/components/SearchConditionTags.tsx` — おまかせレスポンスの `parsed_conditions.area`（例: `"新潟市中央区 万代"`）を表示 → ユーザーがどのサブエリアで引かれたか分かる UX 副次効果

---

## 意図的に採用しない方針

- **検索履歴へのおまかせ結果追加**: 履歴は自然文クエリ再実行用なのでエリアIDは混ぜない
- **YAML によるサブエリア管理**: 4エリア×数件、個人利用、変更頻度低 → Ruby定数で十分
- **ジャンルのランダム化**: ユーザー決定で「夜向け固定」
- **Places API の `locationBias` 追加**: 今回は行政区プレフィックス方式で十分、オーバーエンジニアリング回避
- **`QueryParserService` の呼び出し**: おまかせではユーザーが自然文を打たない、OpenAI 呼び出し1回節約

---

## 未確定の論点（実装時に判断）

1. **`App.test.tsx` の修正範囲**: 現状未読。旧 `OmakaseButton` への参照があれば Task 8 内で更新
2. **Places Text Search のヒット質**: Task 5 の実疎通で確認し、サブエリア配列の微調整（`SUB_AREAS` への追加/削除）を判断
3. **`sub_area` のフロント表示強化**: 本計画では `SearchConditionTags` 経由で間接的に表示される形。「今回のおまかせ: 万代エリア」のような専用表示は今回スコープ外とし、必要なら後続タスクで追加
4. **5件固定 vs 最大5件**: `min_count: 5, max_count: 5` を渡しても LLM が絞る可能性あり。実装上は許容（最大5件）

---

## Appendix: 過去の検討記録（参考用）

### iOS対応の検討と見送り（2026-04-10）
当初、feature-proposal.md の項目7・8を見送った代わりに iOS 対応を検討したが、以下の結論で見送った。

- **PWA + Mac常時稼働 + ngrok**: バッテリー長期劣化・持ち運び制約で不採用
- **PWA + Hetzner Cloud + Kamal (月600円)**: 個人利用の利用頻度に対して費用対効果が合わず不採用
- **Capacitor でサーバーレス化**: Rails ロジック全TS移植の工数がこの規模に過大で不採用
- **React Native 書き直し**: オーバーキル

iOS 対応は将来、使用頻度が週数回以上になったり、据え置き機を別用途で買うことになった場合に再検討する。詳細な比較メモは本ファイル旧版の履歴参照。

### 今回のブレストで得た知見
- ユーザーは「リアルタイム検索不要・下調べ用途」を明言 → `currentOpeningHours` 除外方針と整合
- 「完全にお任せ」は偶然性・予測不能性の最大化と解釈 → A案（Places広取得→ランダム）に着地
- 新潟県全域は広すぎ、普段行くエリア（新潟駅前・駅南・古町・長岡）に絞ることで検索効率と偶然性のバランスを取る
