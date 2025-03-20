import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseError } from "firebase/app";

// Constants
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const MAX_SIGNIN_ATTEMPTS = 5;
const BASE_TIMEOUT = 30 * 1000; // 30 seconds base timeout
const ATTEMPT_INTERVAL = 1000; // 1 second between attempts

// Common password patterns to check against
const COMMON_PATTERNS = [
  /password/i,
  /12345/,
  /qwerty/i,
  /abc123/i,
  /admin/i,
  /letmein/i,
  /welcome/i,
  /monkey/i,
  /dragon/i,
  /football/i,
  /baseball/i,
  /\d{4}$/, // 4 digits at the end
  /(.)\1{2,}/, // Same character repeated 3+ times
  /^[a-zA-Z]+\d+$/, // Only letters followed by numbers
];

interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // Password strength score 0-4
  strengthLabel: "Very Weak" | "Weak" | "Moderate" | "Strong" | "Very Strong";
  color: string; // Color for UI feedback
}

interface SignInAttemptResult {
  canProceed: boolean;
  timeRemaining?: number;
}

export const authValidation = {
  validateEmail(email: string): boolean {
    // Enhanced email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  },

  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Initial validation
    if (!password) {
      return {
        isValid: false,
        errors: ["Password is required"],
        score: 0,
        strengthLabel: "Very Weak",
        color: "#FF4444",
      };
    }

    // Length checks
    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
      );
    } else {
      // Add score based on length
      score += Math.min(2, password.length / 10);
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
      errors.push(
        `Password must be less than ${PASSWORD_MAX_LENGTH} characters`
      );
    }

    // Character variety checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Required checks
    if (!hasUppercase)
      errors.push("Must contain at least one uppercase letter");
    if (!hasLowercase)
      errors.push("Must contain at least one lowercase letter");
    if (!hasNumbers) errors.push("Must contain at least one number");
    if (!hasSpecial) errors.push("Must contain at least one special character");

    // Add score for character variety
    if (hasUppercase) score += 1;
    if (hasLowercase) score += 1;
    if (hasNumbers) score += 1;
    if (hasSpecial) score += 1;

    // Check for common patterns
    let hasCommonPattern = false;
    for (const pattern of COMMON_PATTERNS) {
      if (pattern.test(password)) {
        hasCommonPattern = true;
        break;
      }
    }

    if (hasCommonPattern) {
      errors.push("Password contains common or easily guessable patterns");
      score -= 2;
    }

    // Additional complexity checks
    const hasMultipleNumbers = (password.match(/\d/g) || []).length > 2;
    const hasMultipleSpecial =
      (password.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length > 1;
    const hasMixedCharacters = /[A-Z].*[0-9]|[0-9].*[A-Z]/.test(password);

    if (hasMultipleNumbers) score += 0.5;
    if (hasMultipleSpecial) score += 0.5;
    if (hasMixedCharacters) score += 0.5;

    // Normalize score between 0 and 4
    score = Math.max(0, Math.min(4, score));

    // Determine strength label and color
    let strengthLabel: PasswordValidationResult["strengthLabel"];
    let color: string;

    if (score < 1) {
      strengthLabel = "Very Weak";
      color = "#FF4444";
    } else if (score < 2) {
      strengthLabel = "Weak";
      color = "#FFA700";
    } else if (score < 3) {
      strengthLabel = "Moderate";
      color = "#FFCC00";
    } else if (score < 4) {
      strengthLabel = "Strong";
      color = "#00CC66";
    } else {
      strengthLabel = "Very Strong";
      color = "#00AA44";
    }

    return {
      isValid: errors.length === 0 && score >= 2, // Require at least 'Moderate' strength
      errors,
      score,
      strengthLabel,
      color,
    };
  },

  async checkSignInThrottle(): Promise<SignInAttemptResult> {
    try {
      const attempts = await AsyncStorage.getItem("signInAttempts");
      const lastAttemptTime = await AsyncStorage.getItem("lastSignInAttempt");

      if (!attempts || !lastAttemptTime) {
        return { canProceed: true };
      }

      const attemptCount = parseInt(attempts);
      const lastAttempt = parseInt(lastAttemptTime);
      const now = Date.now();

      // Progressive timeout based on number of attempts
      if (attemptCount >= MAX_SIGNIN_ATTEMPTS) {
        const timeout =
          BASE_TIMEOUT * Math.pow(2, attemptCount - MAX_SIGNIN_ATTEMPTS);
        const timeElapsed = now - lastAttempt;

        if (timeElapsed < timeout) {
          return {
            canProceed: false,
            timeRemaining: Math.ceil((timeout - timeElapsed) / 1000),
          };
        }
        // Reset attempts after timeout
        await this.resetSignInAttempts();
        return { canProceed: true };
      }

      // Check minimum interval between attempts
      if (now - lastAttempt < ATTEMPT_INTERVAL) {
        return {
          canProceed: false,
          timeRemaining: Math.ceil(
            (ATTEMPT_INTERVAL - (now - lastAttempt)) / 1000
          ),
        };
      }

      return { canProceed: true };
    } catch (error) {
      console.error("Error checking sign-in throttle:", error);
      return { canProceed: true }; // Fail open for better UX
    }
  },

  async incrementSignInAttempts(): Promise<void> {
    try {
      const attempts = await AsyncStorage.getItem("signInAttempts");
      const count = attempts ? parseInt(attempts) + 1 : 1;
      await AsyncStorage.setItem("signInAttempts", count.toString());
      await AsyncStorage.setItem("lastSignInAttempt", Date.now().toString());
    } catch (error) {
      console.error("Error incrementing sign-in attempts:", error);
    }
  },

  async resetSignInAttempts(): Promise<void> {
    try {
      await AsyncStorage.removeItem("signInAttempts");
      await AsyncStorage.removeItem("lastSignInAttempt");
    } catch (error) {
      console.error("Error resetting sign-in attempts:", error);
    }
  },

  getFirebaseErrorMessage(error: FirebaseError): string {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/operation-not-allowed":
        return "Email/password accounts are not enabled. Please contact support.";
      case "auth/weak-password":
        return "Please choose a stronger password.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/user-not-found":
        return "No account found with this email. Please check your email or register.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again or use 'Forgot Password'.";
      case "auth/invalid-credential":
        return "Invalid login credentials. Please check your email and password.";
      case "auth/too-many-requests":
        return "Account temporarily locked due to too many failed attempts. Please try again later or reset your password.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection and try again.";
      case "auth/popup-closed-by-user":
        return "Authentication window was closed. Please try again.";
      case "auth/requires-recent-login":
        return "This action requires you to sign in again. Please sign out and sign back in.";
      default:
        return `Authentication error: ${error.message}`;
    }
  },
};
