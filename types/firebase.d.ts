import { Persistence, ReactNativeAsyncStorage } from "@firebase/auth";

declare module "firebase/auth" {
  export declare function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): Persistence;
}

declare module "firebase/firestore" {
  export declare function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): Persistence;
}
