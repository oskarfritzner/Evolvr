import { levelService, setStreakService } from "./levelService";
import { routineService, setXPService } from "./routineServices";
import { streakService } from "./streakService";

export function initializeServices() {
  setStreakService(streakService);
  setXPService(levelService);
}
