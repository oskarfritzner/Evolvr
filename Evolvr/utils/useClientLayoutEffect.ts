import { useEffect, useLayoutEffect } from "react";

// Properly detect if we're in a browser environment
const canUseDOM = !!(
  typeof window !== "undefined" &&
  window.document &&
  window.document.createElement
);

// Use useLayoutEffect on client, useEffect on server
export const useClientLayoutEffect = canUseDOM ? useLayoutEffect : useEffect;

export default useClientLayoutEffect;
