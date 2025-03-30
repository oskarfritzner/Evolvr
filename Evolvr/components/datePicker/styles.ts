import { StyleSheet, Platform } from "react-native";

export const createStyles = (colors: any, isFocused: boolean) =>
  StyleSheet.create({
    container: {
      width: "100%",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    input: {
      padding: 15,
      borderRadius: 12,
      fontSize: 16,
      marginBottom: 5,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      borderWidth: 2,
      borderColor: isFocused ? colors.secondary : "transparent",
      flex: 1,
    },
    pickerButton: {
      padding: 15,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: 5,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: isFocused ? colors.secondary : "transparent",
    },
    hintContainer: {
      marginLeft: 5,
      gap: 2,
    },
    formatHint: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 5,
    },
    webDateInput: Platform.select({
      web: {
        WebkitAppearance: "none",
        backgroundColor: colors.surface,
        color: colors.textPrimary,
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 5,
        borderWidth: 2,
        borderColor: isFocused ? colors.secondary : "transparent",
        flex: 1,
        cursor: "pointer",
      },
    }) as any,
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      paddingBottom: Platform.OS === "ios" ? 20 : 0,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.1)",
    },
    headerButton: {
      paddingHorizontal: 8,
    },
    headerButtonText: {
      fontSize: 17,
      fontWeight: "600",
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    pickerContainer: {
      height: 216,
      backgroundColor: colors.surface,
    },
  });
