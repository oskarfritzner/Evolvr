// This file is just to validate that the matchers are correctly set up.
// It can be deleted after verification.

import React from "react";
import { View, Text } from "react-native";
import { render } from "@testing-library/react-native";

describe("Jest Matchers Migration Test", () => {
  it("verifies built-in matchers are available", () => {
    const { getByTestId } = render(
      <View testID="parent">
        <Text testID="child">Test Content</Text>
      </View>
    );

    const parent = getByTestId("parent");
    const child = getByTestId("child");

    // Test that built-in matchers work
    expect(parent).toBeOnTheScreen();
    expect(child).toHaveTextContent("Test Content");

    // Test that legacy matchers work with prefix
    expect(parent).legacy_toBeOnTheScreen();

    // This test simply verifies that the matchers are available
    // No need to test all of them
  });
});
