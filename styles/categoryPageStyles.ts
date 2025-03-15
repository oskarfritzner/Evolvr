import { StyleSheet, Platform, ViewStyle, TextStyle } from "react-native";

type Styles = {
  container: ViewStyle;
  header: ViewStyle;
  backButton: ViewStyle;
  iconContainer: ViewStyle;
  title: TextStyle;

  descriptionTitle: TextStyle;
  description: TextStyle;
  progressHeader: ViewStyle;
  levelText: TextStyle;
  xpText: TextStyle;
  progressBar: ViewStyle;
  tabContainer: ViewStyle;
  tab: ViewStyle;
  tabText: TextStyle;
  sectionTitle: TextStyle;
  resourceItem: ViewStyle;
  resourceIcon: ViewStyle;
  resourceContent: ViewStyle;
  resourceTitle: TextStyle;
  resourceDescription: TextStyle;
  contentWrapper: ViewStyle;
  listContent: ViewStyle;
  resourcesButton: ViewStyle;
  resourcesIcon: ViewStyle;
  resourcesText: TextStyle;
  menuContainer: ViewStyle;
  menuButton: ViewStyle;
  menuIcon: ViewStyle;
  menuText: TextStyle;
  headerRow: ViewStyle;
  titleGroup: ViewStyle;
  overlay: ViewStyle;
  resourcesContainer: ViewStyle;
  chartContainer: ViewStyle;
  heroSection: ViewStyle;
  heroContent: ViewStyle;
  iconWrapper: ViewStyle;
  progressWrapper: ViewStyle;
  content: ViewStyle;
  card: ViewStyle;
  cardTitle: TextStyle;
  cardText: TextStyle;
  section: ViewStyle;
  sectionHeader: ViewStyle;
  sectionTitleGroup: ViewStyle;
  resourcesGrid: ViewStyle;
  resourceCard: ViewStyle;
  webContainer: ViewStyle;
  scrollContent: ViewStyle;
} & {
  heroTitle: TextStyle;
  heroSubtitle: TextStyle;
};

export const categoryPageStyles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    width: "100%",
  },
  header: {
    padding: 16,
    alignItems: "center",
    paddingTop: 8,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 16,
  },
  card: {
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    width: "100%",
    ...(Platform.OS === "web"
      ? {
          maxWidth: 1200,
          marginHorizontal: 0,
        }
      : {
          maxWidth: "100%",
          marginHorizontal: 0,
        }),
    alignSelf: "center",
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  xpText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  progressBar: {
    marginVertical: 8,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    alignItems: "center",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 16,
    marginLeft: 16,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    ...(Platform.OS === "web"
      ? {
          maxWidth: 1200,
        }
      : {
          maxWidth: 600,
        }),
    alignSelf: "center",
    zIndex: 2,
    position: "relative",
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  contentWrapper: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    ...(Platform.OS === "web"
      ? {
          maxWidth: "100%",
          paddingHorizontal: 32,
        }
      : {
          padding: 16,
          paddingBottom: 32,
        }),
    zIndex: 2,
    position: "relative",
  },
  listContent: {
    width: "100%",
  },
  resourcesButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    position: "absolute",
    right: 16,
    top: 8,
  },
  resourcesIcon: {
    marginRight: 8,
  },
  resourcesText: {
    fontSize: 14,
    fontWeight: "600",
  },
  menuContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 16,
    marginBottom: 24,
    gap: 12,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    marginRight: 8,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 24,
    padding: 16,
    width: "100%",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    transform: [{ translateX: -28 }],
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  resourcesContainer: {
    marginBottom: 24,
    width: "100%",
    ...(Platform.OS === "web"
      ? {
          maxWidth: 1200,
        }
      : {
          maxWidth: 600,
        }),
    alignSelf: "center",
  },
  chartContainer: {
    width: "100%",
    marginVertical: 8,
    ...(Platform.OS === "web"
      ? {
          maxWidth: 1200,
        }
      : {
          maxWidth: "100%",
        }),
    alignSelf: "center",
    overflow: "hidden",
  },
  heroSection: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    width: "100%",
  },
  heroContent: {
    alignItems: "center",
    marginTop: 24,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
  },
  progressWrapper: {
    marginTop: 24,
  },
  content: {
    width: "100%",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resourcesGrid: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    flexWrap: "wrap",
    gap: 16,
  },
  resourceCard: {
    padding: 16,
    borderRadius: 12,
    ...(Platform.OS === "web"
      ? {
          flex: 1,
          minWidth: 280,
          width: "30%",
        }
      : {
          width: "100%",
        }),
  },
  webContainer: {
    width: "100%",
    alignSelf: "center",
    ...(Platform.OS === "web"
      ? {
          maxWidth: 1200,
          padding: 32,
        }
      : {
          padding: 16,
        }),
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: "100%",
  },
});
