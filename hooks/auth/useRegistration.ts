import { create } from "zustand";

interface RegistrationData {
  email?: string;
  password?: string;
  userId?: string;
  googleUser?: any;
  onboardingStarted?: boolean;
}

interface RegistrationStore {
  data: RegistrationData | null;
  setRegistrationData: (data: RegistrationData) => void;
  clearRegistrationData: () => void;
}

export const useRegistration = create<RegistrationStore>((set) => ({
  data: null,
  setRegistrationData: (data) => set({ data }),
  clearRegistrationData: () => set({ data: null }),
}));
