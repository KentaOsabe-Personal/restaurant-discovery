export type OmakaseAreaId = 'ekimae' | 'ekinan' | 'furumachi' | 'nagaoka';

export type OmakaseArea = {
  id: OmakaseAreaId;
  label: string;
};

export const omakaseAreas: readonly OmakaseArea[] = [
  { id: 'ekimae', label: '新潟駅前でおすすめ' },
  { id: 'ekinan', label: '新潟駅南でおすすめ' },
  { id: 'furumachi', label: '古町でおすすめ' },
  { id: 'nagaoka', label: '長岡でおすすめ' },
];
