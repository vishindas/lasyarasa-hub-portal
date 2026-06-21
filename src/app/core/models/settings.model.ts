export interface DanceStyle {
  id?: number;
  name: string;
  description?: string;
  active: boolean;
  sortOrder: number;
}

export interface FeeTier {
  id?: number;
  label: string;
  amount: number;
  currency: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  active: boolean;
}

export interface AgeGroup {
  id?: number;
  label: string;
  minAge?: number;
  maxAge?: number;
  active: boolean;
  sortOrder: number;
}
