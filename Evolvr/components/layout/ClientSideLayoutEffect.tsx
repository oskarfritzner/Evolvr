import React, { ReactNode, useEffect, useLayoutEffect } from "react";

const canUseDOM = !!(
  typeof window !== "undefined" &&
  window.document &&
  window.document.createElement
);

const useIsomorphicLayoutEffect = canUseDOM ? useLayoutEffect : useEffect;

interface Props {
  children: ReactNode;
  effect: () => void | (() => void);
  dependencies?: any[];
}

export function ClientSideLayoutEffect({
  children,
  effect,
  dependencies = [],
}: Props) {
  useIsomorphicLayoutEffect(effect, dependencies);
  return <>{children}</>;
}
