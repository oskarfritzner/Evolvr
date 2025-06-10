import React, { ReactNode, useEffect } from "react";
import { View } from "react-native";

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
  useEffect(() => {
    if (typeof window !== "undefined") {
      return effect();
    }
  }, dependencies);

  return (
    <React.Fragment>
      <View style={{ flex: 1 }}>{children}</View>
    </React.Fragment>
  );
}
