import { levelService, setStreakService, setUserService } from "./levelService";
import { routineService, setXPService } from "./routineServices";
import { streakService } from "./streakService";
import { userService, setLevelService } from "./userService";

export function initializeServices() {
  // Set up circular dependencies
  setStreakService(streakService);
  setUserService(userService);
  setLevelService(levelService);
  setXPService(levelService);
}
