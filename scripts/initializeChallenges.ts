import { challengeService } from "@/backend/services/challengeService";
import { SEVENTY_FIVE_HARD } from "./initializeChallenge";

async function initializeChallenges() {
  try {
    await challengeService.initializeChallenge(SEVENTY_FIVE_HARD);
    console.log("Successfully initialized 75 Hard Challenge");
  } catch (error) {
    console.error("Error initializing challenges:", error);
  }
}

// Run this function once to set up the challenge
initializeChallenges();
