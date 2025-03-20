import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface RegistrationData {
  email?: string;
  password?: string;
  userId?: string;
  googleUser?: any;
  onboardingStarted?: boolean;
  onboardingStep?: number;
}

interface RegistrationStore {
  data: RegistrationData | null;
  setRegistrationData: (data: RegistrationData) => void;
  clearRegistrationData: () => void;
  updateRegistrationData: (updates: Partial<RegistrationData>) => void;
}

export const useRegistration = create<RegistrationStore>()(
  persist(
    (set) => ({
      data: null,
      setRegistrationData: (data) => set({ data }),
      clearRegistrationData: () => set({ data: null }),
      updateRegistrationData: (updates) =>
        set((state) => ({
          data: state.data ? { ...state.data, ...updates } : updates,
        })),
    }),
    {
      name: "registration-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
