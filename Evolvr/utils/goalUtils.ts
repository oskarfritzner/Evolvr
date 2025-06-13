import { GoalStep } from "../types/goals";

export function calculateProgressFromSteps(
  steps: GoalStep[] | undefined
): number {
  if (!steps || steps.length === 0) return 0;
  const completedSteps = steps.filter((step) => step.isCompleted).length;
  return Math.round((completedSteps / steps.length) * 100);
}
