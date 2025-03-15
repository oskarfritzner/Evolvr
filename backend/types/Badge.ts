import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps } from "react";

type IconNames = ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: IconNames;
  iconSet:
    | "MaterialCommunityIcons"
    | "Ionicons"
    | "FontAwesome"
    | "MaterialIcons";
  category?: string;
  requirement: {
    type: "level" | "streak" | "completion" | "prestige";
    threshold: number;
    category?: string;
  };
}

export interface UserBadge {
  badgeId: string;
  earnedAt: Date;
}

export interface BadgeProgress {
  badge: Badge;
  progress: number;
  isEarned: boolean;
}

export interface BadgeCheckParams {
  taskType: "routine" | "normal" | "challenge" | "habit";
  categories: string[];
  xpGained: number;
}
