export type QuickSearchPreset = {
  label: string;
  query: string;
};

export const quickSearchPresets: readonly QuickSearchPreset[] = [
  { label: '駅前', query: '新潟駅前の居酒屋' },
  { label: '駅南', query: '新潟駅南の居酒屋' },
  { label: '古町', query: '古町の居酒屋' },
  { label: '友達', query: '新潟市で友達と飲み会' },
  { label: '一人飲み', query: '新潟市で一人飲み' },
  { label: 'デート', query: '新潟市で女性とデート' },
];
