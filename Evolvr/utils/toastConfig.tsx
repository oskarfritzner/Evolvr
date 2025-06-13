import React from "react";
import Toast from "react-native-toast-message";
import { View, Text } from "react-native";

interface ToastProps {
  text1?: string;
  text2?: string;
  props: any;
}

export const toastConfig = {
  success: ({ text1, text2, ...props }: ToastProps) => (
    <View
      style={{
        width: "90%",
        backgroundColor: "#ECFDF3",
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: "#4CAF50",
        marginHorizontal: "5%",
      }}
    >
      {text1 && (
        <Text style={{ color: "#067647", fontSize: 15, fontWeight: "500" }}>
          {text1}
        </Text>
      )}
      {text2 && (
        <Text style={{ color: "#067647", fontSize: 13, marginTop: 4 }}>
          {text2}
        </Text>
      )}
    </View>
  ),
  error: ({ text1, text2, ...props }: ToastProps) => (
    <View
      style={{
        width: "90%",
        backgroundColor: "#FEF3F2",
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: "#FF5252",
        marginHorizontal: "5%",
      }}
    >
      {text1 && (
        <Text style={{ color: "#D92D20", fontSize: 15, fontWeight: "500" }}>
          {text1}
        </Text>
      )}
      {text2 && (
        <Text style={{ color: "#D92D20", fontSize: 13, marginTop: 4 }}>
          {text2}
        </Text>
      )}
    </View>
  ),
};
