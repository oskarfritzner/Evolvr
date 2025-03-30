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
    instructionText: {
      fontSize: 12,
      lineHeight: 20,
      marginBottom: 20,
    },
    searchContainer: {
      marginBottom: 16,
    },
    searchInput: {
      height: 40,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    categoryScroll: {
      marginBottom: 16,
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
    emptyText: {
      textAlign: "center",
      marginTop: 16,
      opacity: 0.7,
    },
    createTaskButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    createTaskText: {
      marginLeft: 8,
      fontSize: 14,
    },
    scrollContent: {
      paddingBottom: Platform.OS === "ios" ? 100 : 80,
    },
  });
