import { Alert } from "react-native";

export const showMessage = (type: "success" | "error", message: string) => {
  Alert.alert(type === "success" ? "Success" : "Error", message, [
    { text: "OK" },
  ]);
};
