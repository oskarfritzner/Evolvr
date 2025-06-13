import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface CustomDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  customStyles?: any;
  error?: string;
  onValidationChange?: (isValid: boolean) => void;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  required?: boolean;
}

export default function CustomDatePicker({
  date,
  onDateChange,
  customStyles,
  error,
  onValidationChange,
  minDate,
  maxDate,
  label = "Date",
  required = false,
}: CustomDatePickerProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [inputValue, setInputValue] = useState(formatDate(date));
  const [inputError, setInputError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [tempDate, setTempDate] = useState(date);

  // Format date for display
  function formatDate(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }

  // Parse date from string input
  function parseDate(dateStr: string): Date | null {
    const formats = [
      // MM/DD/YYYY
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        parse: (m: RegExpMatchArray) =>
          new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2])),
      },
      // YYYY-MM-DD
      {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        parse: (m: RegExpMatchArray) =>
          new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])),
      },
      // DD.MM.YYYY
      {
        regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
        parse: (m: RegExpMatchArray) =>
          new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])),
      },
    ];

    for (const format of formats) {
      const match = dateStr.match(format.regex);
      if (match) {
        const parsed = format.parse(match);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return null;
  }

  const validateDate = (date: Date): boolean => {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    setInputError(null);

    const parsedDate = parseDate(text);
    if (parsedDate && validateDate(parsedDate)) {
      onDateChange(parsedDate);
      setIsValid(true);
      onValidationChange?.(true);
      setInputValue(formatDate(parsedDate));
    } else if (text.length >= 8) {
      setInputError(
        parsedDate ? "Date is outside allowed range" : "Invalid date format"
      );
      setIsValid(false);
      onValidationChange?.(false);
    } else {
      setIsValid(false);
      onValidationChange?.(false);
    }
  };

  // Update input value when date prop changes
  useEffect(() => {
    setInputValue(formatDate(date));
    setTempDate(date);
  }, [date]);

  // Update validation when date changes
  useEffect(() => {
    const isDateValid =
      date instanceof Date && !isNaN(date.getTime()) && validateDate(date);
    setIsValid(isDateValid);
    onValidationChange?.(isDateValid);
    if (isDateValid) {
      setInputValue(formatDate(date));
      setInputError(null);
    }
  }, [date]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        if (validateDate(selectedDate)) {
          onDateChange(selectedDate);
        } else {
          setInputError("Date is outside allowed range");
        }
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    if (validateDate(tempDate)) {
      onDateChange(tempDate);
      setShowPicker(false);
    } else {
      setInputError("Date is outside allowed range");
    }
  };

  const handleCancel = () => {
    setTempDate(date);
    setShowPicker(false);
  };

  const styles = StyleSheet.create({
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
    labelContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 5,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
    },
    required: {
      fontSize: 16,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
        {required && (
          <Text style={[styles.required, { color: colors.error }]}>*</Text>
        )}
      </View>
      <View style={styles.inputRow}>
        {Platform.OS === "web" ? (
          <input
            type="date"
            value={date.toISOString().split("T")[0]}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              if (!isNaN(newDate.getTime())) {
                onDateChange(newDate);
              }
            }}
            min={minDate?.toISOString().split("T")[0]}
            max={maxDate?.toISOString().split("T")[0]}
            style={styles.webDateInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        ) : (
          <>
            <TextInput
              style={[
                styles.input,
                customStyles?.dateInput,
                (error || inputError) && styles.inputError,
                { flex: 1 },
              ]}
              value={inputValue}
              onChangeText={handleInputChange}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={colors.textSecondary}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />

            <TouchableOpacity
              style={[
                styles.pickerButton,
                (error || inputError) && styles.inputError,
              ]}
              onPress={() => setShowPicker(true)}
              testID="datePickerButton"
            >
              <MaterialIcons
                name="calendar-today"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {Platform.OS === "ios" ? (
              <Modal
                transparent
                visible={showPicker}
                animationType="slide"
                onRequestClose={handleCancel}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.header}>
                      <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleCancel}
                      >
                        <Text
                          style={[
                            styles.headerButtonText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.headerTitle}>Select {label}</Text>
                      <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleConfirm}
                      >
                        <Text
                          style={[
                            styles.headerButtonText,
                            { color: colors.secondary },
                          ]}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.pickerContainer}>
                      <DateTimePicker
                        testID="datePicker"
                        value={tempDate}
                        mode="date"
                        display="spinner"
                        onChange={handleDateChange}
                        minimumDate={minDate}
                        maximumDate={maxDate}
                        textColor={colors.textPrimary}
                        style={{ backgroundColor: colors.surface }}
                      />
                    </View>
                  </View>
                </View>
              </Modal>
            ) : (
              showPicker && (
                <DateTimePicker
                  testID="datePicker"
                  value={date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={minDate}
                  maximumDate={maxDate}
                />
              )
            )}
          </>
        )}
      </View>

      {Platform.OS !== "web" && (
        <View style={styles.hintContainer}>
          <Text style={styles.formatHint}>Format: MM/DD/YYYY</Text>
        </View>
      )}

      {(error || inputError) && (
        <Text style={styles.errorText}>{error || inputError}</Text>
      )}
    </View>
  );
}
