export interface CategoryLevel {
  level: number;
  xp: number;
}

export interface OverallLevel {
  level: number;  // Overall level across all categories
  xp: number;     // Total XP across all categories
  prestige: number; // Prestige level overall
}

export interface InitialLevels {
  categories: Record<string, {
    level: number;
    xp: number;
  }>;
  overall: {
    level: number;
    xp: number;
    prestige: number;
  };
}

export interface UserLevels {
  categories: Record<string, {
    level: number;
    xp: number;
  }>;
  overall: {
    level: number;
    xp: number;
    prestige: number;
  };
}