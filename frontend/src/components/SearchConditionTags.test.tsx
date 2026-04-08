import { render, screen } from '@testing-library/react';
import SearchConditionTags from './SearchConditionTags';
import type { ParsedConditions } from '../types/search';

const allFields: ParsedConditions = {
  area: '渋谷',
  genre: 'イタリアン',
  price_level: 'PRICE_LEVEL_MODERATE',
  keyword: 'テラス席',
};

const allNull: ParsedConditions = {
  area: null,
  genre: null,
  price_level: null,
  keyword: null,
};

describe('SearchConditionTags', () => {
  it('全フィールド非 null のとき4つのタグが全て表示される', () => {
    render(<SearchConditionTags parsedConditions={allFields} />);
    expect(screen.getByText('エリア: 渋谷')).toBeInTheDocument();
    expect(screen.getByText('ジャンル: イタリアン')).toBeInTheDocument();
    expect(screen.getByText('価格帯: 普通')).toBeInTheDocument();
    expect(screen.getByText('キーワード: テラス席')).toBeInTheDocument();
  });

  it('area が null のときエリアタグが表示されない', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, area: null }} />);
    expect(screen.queryByText(/エリア/)).toBeNull();
    expect(screen.getByText('ジャンル: イタリアン')).toBeInTheDocument();
  });

  it('genre が null のときジャンルタグが表示されない', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, genre: null }} />);
    expect(screen.queryByText(/ジャンル/)).toBeNull();
  });

  it('price_level が null のとき価格帯タグが表示されない', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, price_level: null }} />);
    expect(screen.queryByText(/価格帯/)).toBeNull();
  });

  it('keyword が null のときキーワードタグが表示されない', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, keyword: null }} />);
    expect(screen.queryByText(/キーワード/)).toBeNull();
  });

  it('全フィールド null のとき何も表示しない', () => {
    const { container } = render(<SearchConditionTags parsedConditions={allNull} />);
    expect(container.firstChild).toBeNull();
  });

  it('PRICE_LEVEL_FREE が "無料" に変換される', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, price_level: 'PRICE_LEVEL_FREE' }} />);
    expect(screen.getByText('価格帯: 無料')).toBeInTheDocument();
  });

  it('PRICE_LEVEL_INEXPENSIVE が "リーズナブル" に変換される', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, price_level: 'PRICE_LEVEL_INEXPENSIVE' }} />);
    expect(screen.getByText('価格帯: リーズナブル')).toBeInTheDocument();
  });

  it('PRICE_LEVEL_MODERATE が "普通" に変換される', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, price_level: 'PRICE_LEVEL_MODERATE' }} />);
    expect(screen.getByText('価格帯: 普通')).toBeInTheDocument();
  });

  it('PRICE_LEVEL_EXPENSIVE が "高め" に変換される', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, price_level: 'PRICE_LEVEL_EXPENSIVE' }} />);
    expect(screen.getByText('価格帯: 高め')).toBeInTheDocument();
  });

  it('PRICE_LEVEL_VERY_EXPENSIVE が "超高級" に変換される', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, price_level: 'PRICE_LEVEL_VERY_EXPENSIVE' }} />);
    expect(screen.getByText('価格帯: 超高級')).toBeInTheDocument();
  });

  it('未知の price_level 値はフォールバックで元の値が表示される', () => {
    render(<SearchConditionTags parsedConditions={{ ...allFields, price_level: 'UNKNOWN_LEVEL' }} />);
    expect(screen.getByText('価格帯: UNKNOWN_LEVEL')).toBeInTheDocument();
  });
});
