export const RANKS = {
  CADET: 'Cadet',
  NAVIGATOR: 'Navigator',
  COMMANDER: 'Commander',
  HASHPILOT: 'Hashpilot',
} as const;

export const RANK_THRESHOLDS = {
  CADET: 0,
  NAVIGATOR: 101,
  COMMANDER: 501,
  HASHPILOT: 2001,
};

export function getRankFromHP(hp: number): string {
  if (hp >= RANK_THRESHOLDS.HASHPILOT) return RANKS.HASHPILOT;
  if (hp >= RANK_THRESHOLDS.COMMANDER) return RANKS.COMMANDER;
  if (hp >= RANK_THRESHOLDS.NAVIGATOR) return RANKS.NAVIGATOR;
  return RANKS.CADET;
}

export function getNextRankThreshold(hp: number): number | null {
  if (hp < RANK_THRESHOLDS.NAVIGATOR) return RANK_THRESHOLDS.NAVIGATOR;
  if (hp < RANK_THRESHOLDS.COMMANDER) return RANK_THRESHOLDS.COMMANDER;
  if (hp < RANK_THRESHOLDS.HASHPILOT) return RANK_THRESHOLDS.HASHPILOT;
  return null;
}

export function getRankProgress(hp: number): number {
  const currentLevelMin = hp < RANK_THRESHOLDS.NAVIGATOR ? 0 : 
                         hp < RANK_THRESHOLDS.COMMANDER ? RANK_THRESHOLDS.NAVIGATOR :
                         hp < RANK_THRESHOLDS.HASHPILOT ? RANK_THRESHOLDS.COMMANDER : RANK_THRESHOLDS.HASHPILOT;
  
  const nextLevelMin = getNextRankThreshold(hp);
  
  if (nextLevelMin === null) return 100;
  
  const range = nextLevelMin - currentLevelMin;
  const progress = hp - currentLevelMin;
  
  return Math.min(Math.floor((progress / range) * 100), 100);
}
