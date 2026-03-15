# Research & Design Decisions

## Summary
- **Feature**: `search-controller-stub`
- **Discovery Scope**: Simple Addition
- **Key Findings**:
  - 既存の `ApplicationController` は `ActionController::Base` を継承。API コントローラには API 専用の基底クラスが必要
  - ルーティングに API 名前空間がまだ存在しない。`namespace :api` ブロックを新規追加
  - Jbuilder が Gemfile に含まれており、JSON レスポンスの構築に利用可能

## Research Log

### API コントローラの基底クラス設計
- **Context**: `Api::SearchController` の継承元をどうするか
- **Sources Consulted**: steering `structure.md`（API コントローラは `Api::` 名前空間）、既存 `ApplicationController`
- **Findings**:
  - `ApplicationController` は `ActionController::Base` を継承しており、CSRF保護やセッション管理を含む
  - API コントローラでは CSRF トークン検証が不要（JSON API のため）
  - `Api::BaseController < ActionController::API` を導入することで、API 向けの軽量なベースを提供できる
- **Implications**: API 名前空間専用の基底コントローラを作成し、後続 Chunk でも再利用する

### レスポンス構築方法
- **Context**: 固定スタブレスポンスの返却方法
- **Sources Consulted**: steering `tech.md`（Jbuilder 利用）
- **Findings**:
  - スタブ段階では固定構造のため、`render json:` で十分
  - 後続 Chunk でサービス層統合時に Jbuilder テンプレートへ移行可能
- **Implications**: 初期スタブは `render json:` を使用。Chunk 6 統合時に Jbuilder 化を検討

## Design Decisions

### Decision: API 基底コントローラの導入
- **Context**: API エンドポイントに適した基底クラスが必要
- **Alternatives Considered**:
  1. `ApplicationController` をそのまま継承 — CSRF 保護が API リクエストをブロックする
  2. `Api::BaseController < ActionController::API` を新設 — 軽量で API に最適
- **Selected Approach**: `Api::BaseController < ActionController::API` を新設
- **Rationale**: API コントローラに不要なミドルウェア（CSRF、セッション）を除外し、後続の API コントローラ（Chunk 6 等）でも再利用できる
- **Trade-offs**: コントローラが1つ増えるが、API 設計の一貫性が保たれる
- **Follow-up**: Chunk 6 統合時にエラーハンドリングの共通化を検討

## Risks & Mitigations
- API モードと通常モードの混在 — `Api::BaseController` で名前空間を明確に分離することで回避
