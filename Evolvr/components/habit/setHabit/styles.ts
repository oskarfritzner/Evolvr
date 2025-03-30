import { StyleSheet, Platform } from "react-native";

export const createStyles = (colors: any, isDesktop: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContainer: {
      width: "100%",
      maxWidth: 600,
      maxHeight: "85%",
      margin: 20,
      borderRadius: 15,
      overflow: "visible",
      position: "relative",
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    modalContainerDesktop: {
      maxWidth: 1000,
      maxHeight: "80%",
    },
    desktopLayout: {
      flexDirection: "row",
      gap: 24,
    },
    desktopColumn: {
      flex: 1,
    },
    closeButton: {
      position: "absolute",
      right: 16,
      top: 16,
      zIndex: 1,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      justifyContent: "center",
      alignItems: "center",
    },
    scrollView: {
      padding: 16,
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: "bold",
      letterSpacing: 1.6,
    },
    infoButton: {
      marginLeft: 8,
      padding: 4,
    },
    instructionText: {
      fontSize: 12,
      lineHeight: 20,
      marginBottom: 20,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 8,
    },
    input: {
      marginBottom: 12,
      fontSize: 14,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    taskItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 8,
      marginVertical: 4,
    },
    taskText: {
      marginLeft: 12,
      flex: 1,
      fontSize: 14,
    },
    buttonContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingBottom: Platform.OS === "ios" ? 32 : 16,
      borderTopWidth: 1,
      backgroundColor: "transparent",
      marginTop: 20,
      zIndex: 1,
    },
    button: {
      borderRadius: 8,
      paddingVertical: 8,
    },
    categoryScroll: {
      marginBottom: 8,
      flexGrow: 0,
    },
    categoryChip: {
      margin: 4,
      borderRadius: 20,
    },
    chipLabel: {
      fontSize: 12,
    },
    tasksContainer: {
      borderWidth: 1,
      borderRadius: 12,
      marginVertical: 8,
      maxHeight: 320,
    },
    tasksScroll: {
      padding: 8,
    },
    emptyText: {
      textAlign: "center",
      marginTop: 16,
      opacity: 0.7,
    },
    inputContainer: {
      marginBottom: 16,
    },
    infoOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    infoContainer: {
      borderRadius: 12,
      padding: 20,
      maxHeight: "80%",
      width: "100%",
      maxWidth: 600,
    },
    infoScroll: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 16,
      textAlign: "center",
      paddingRight: 40,
    },
    infoButtonContainer: {
      padding: 16,
      borderTopWidth: 1,
      marginTop: 16,
    },
    infoSection: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 20,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 12,
    },
    scrollContent: {
      paddingBottom: Platform.OS === "ios" ? 100 : 80,
    },
    selectedTaskContainer: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    selectedTaskTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
    },
    changeTaskButton: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      alignItems: "center",
    },
    changeTaskText: {
      fontSize: 14,
    },
    selectTaskButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 16,
    },
    selectTaskContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    selectTaskText: {
      fontSize: 14,
    },
    selectedTaskDescription: {
      fontSize: 14,
      marginBottom: 12,
      lineHeight: 20,
    },
    taskHeader: {
      gap: 12,
    },
    taskTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    taskMetadata: {
      marginTop: 8,
      gap: 8,
    },
    metadataItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metadataText: {
      fontSize: 12,
    },
    xpContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    xpBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    xpText: {
      fontSize: 12,
      fontWeight: "500",
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
    },
  });
