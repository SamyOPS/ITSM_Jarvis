export enum SupportLevel {
  N1 = 'N1',
  N2 = 'N2',
  N3 = 'N3',
}

export const DEFAULT_SUPPORT_LEVELS = [
  SupportLevel.N1,
  SupportLevel.N2,
  SupportLevel.N3,
] as const;
