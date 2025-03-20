# Jest Native Matchers Migration Guide

## Overview

We've updated our test setup to use the built-in Jest matchers from React Native Testing Library while maintaining backward compatibility with legacy Jest Native matchers. This follows the deprecation of `@testing-library/jest-native` package as mentioned in the npm warnings.

## How to Use

### Built-in Matchers

The following matchers are automatically available through `@testing-library/react-native` without any additional imports:

```js
// These work the same as before:
expect(element).toBeEmptyElement();
expect(element).toBeEnabled();
expect(element).toBeDisabled();
expect(element).toBeOnTheScreen();
expect(element).toBeVisible();
expect(element).toContainElement(childElement);
expect(element).toHaveAccessibilityValue({ min: 0, max: 10, now: 5 });
expect(element).toHaveDisplayValue("text");
expect(element).toHaveProp("someKey", "value");
expect(element).toHaveStyle({ color: "red" });
expect(element).toHaveTextContent("text");
```

### New Replacement Matchers

The following new matchers replace the deprecated `toHaveAccessibilityState()`:

```js
// Instead of:
// expect(element).toHaveAccessibilityState({ disabled: true });
// Use:
expect(element).toBeDisabled();

// Instead of:
// expect(element).toHaveAccessibilityState({ checked: true });
// Use:
expect(element).toBeChecked();
// or
expect(element).toBePartiallyChecked();

// Instead of:
// expect(element).toHaveAccessibilityState({ selected: true });
// Use:
expect(element).toBeSelected();

// Instead of:
// expect(element).toHaveAccessibilityState({ expanded: true/false });
// Use:
expect(element).toBeExpanded();
// or
expect(element).toBeCollapsed();

// Instead of:
// expect(element).toHaveAccessibilityState({ busy: true });
// Use:
expect(element).toBeBusy();
```

### Legacy Matchers

During the transition period, the legacy matchers are still available with the `legacy_` prefix:

```js
expect(element).legacy_toHaveAccessibilityState({ busy: true });
```

## Important Notes

1. The built-in matchers only support **host elements** (native platform components), not composite elements (your custom React components).

2. The `toBeEnabled()`/`toBeDisabled()` matchers check the disabled state for the element's ancestors as well, which differs from the old `toHaveAccessibilityState()` behavior.

3. Specific role requirements:

   - `toBeChecked()` only works with elements having 'checkbox', 'radio', or 'switch' roles
   - `toBePartiallyChecked()` only works with elements having 'checkbox' role

4. New matcher available: `toHaveAccessibleName()`

## Further Reading

For complete details, refer to the [official migration guide](https://callstack.github.io/react-native-testing-library/docs/migration/jest-matchers).
