import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, Modal, Pressable } from 'react-native'
import { useTheme } from '@/context/ThemeContext'
import { MaterialIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MotiView, AnimatePresence } from 'moti'

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
  required = false
}: CustomDatePickerProps) {
  const { colors } = useTheme()
  const [showPicker, setShowPicker] = useState(false)
  const [inputValue, setInputValue] = useState(formatDate(date))
  const [inputError, setInputError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(true)
  const [isFocused, setIsFocused] = useState(false)
  const [tempDate, setTempDate] = useState(date)

  // Format date for display
  function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
  }

  // Parse date from string input
  function parseDate(dateStr: string): Date | null {
    const formats = [
      // MM/DD/YYYY
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        parse: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[1])-1, parseInt(m[2]))
      },
      // YYYY-MM-DD
      {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        parse: (m: RegExpMatchArray) => new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]))
      },
      // DD.MM.YYYY
      {
        regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
        parse: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[2])-1, parseInt(m[1]))
      }
    ]

    for (const format of formats) {
      const match = dateStr.match(format.regex)
      if (match) {
        const parsed = format.parse(match)
        if (!isNaN(parsed.getTime())) {
          return parsed
        }
      }
    }
    
    return null
  }

  const validateDate = (date: Date): boolean => {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };

  const handleInputChange = (text: string) => {
    setInputValue(text)
    setInputError(null)
    
    const parsedDate = parseDate(text)
    if (parsedDate && validateDate(parsedDate)) {
      onDateChange(parsedDate)
      setIsValid(true)
      onValidationChange?.(true)
      setInputValue(formatDate(parsedDate))
    } else if (text.length >= 8) {
      setInputError(
        parsedDate 
          ? 'Date is outside allowed range' 
          : 'Invalid date format'
      )
      setIsValid(false)
      onValidationChange?.(false)
    } else {
      setIsValid(false)
      onValidationChange?.(false)
    }
  }

  // Update input value when date prop changes
  useEffect(() => {
    setInputValue(formatDate(date))
    setTempDate(date)
  }, [date])

  // Update validation when date changes from picker
  useEffect(() => {
    const isDateValid = date instanceof Date && !isNaN(date.getTime()) && validateDate(date);
    setIsValid(isDateValid);
    onValidationChange?.(isDateValid);
    if (isDateValid) {
      setInputValue(formatDate(date));
      setInputError(null);
    }
  }, [date]);

  // Handle native picker change
  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || tempDate;
    
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      setTempDate(currentDate);
      if (validateDate(currentDate)) {
        onDateChange(currentDate);
      } else {
        setInputError('Date is outside allowed range');
      }
    }
  };

  const handleConfirm = () => {
    if (validateDate(tempDate)) {
      onDateChange(tempDate);
      setShowPicker(false);
    } else {
      setInputError('Date is outside allowed range');
    }
  };

  const handleCancel = () => {
    setTempDate(date);
    setShowPicker(false);
  };

  const styles = StyleSheet.create({
    container: {
      width: '100%',
    },
    labelContainer: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    label: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    required: {
      color: colors.error,
      marginLeft: 4,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
      borderColor: isFocused ? colors.secondary : 'transparent',
    },
    pickerButton: {
      padding: 15,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: 5,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: isFocused ? colors.secondary : 'transparent',
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
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    pickerContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    pickerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    modalButton: {
      padding: 10,
      borderRadius: 8,
      minWidth: 100,
      alignItems: 'center',
    },
    confirmButton: {
      backgroundColor: colors.secondary,
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    confirmButtonText: {
      color: colors.primary,
    },
    cancelButtonText: {
      color: colors.textPrimary,
    },
    webDateInput: Platform.select({
      web: {
        '-webkit-appearance': 'none',
        backgroundColor: colors.surface,
        color: colors.textPrimary,
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 5,
        borderWidth: 2,
        borderColor: isFocused ? colors.secondary : 'transparent',
        flex: 1,
        cursor: 'pointer',
      }
    }) as any,
  })

  const renderDatePicker = () => {
    if (Platform.OS === 'web') {
      return (
        <input
          type="date"
          value={date.toISOString().split('T')[0]}
          onChange={(e) => {
            const newDate = new Date(e.target.value);
            if (!isNaN(newDate.getTime())) {
              onDateChange(newDate);
            }
          }}
          min={minDate?.toISOString().split('T')[0]}
          max={maxDate?.toISOString().split('T')[0]}
          style={styles.webDateInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      );
    }

    if (!showPicker) return null;

    return (
      <Modal
        transparent
        visible={showPicker}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCancel}
        >
          <Pressable>
            <MotiView
              from={{ translateY: 100, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              exit={{ translateY: 100, opacity: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              style={styles.pickerContainer}
            >
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  Select {label}
                </Text>
              </View>
              
              <DateTimePicker
                testID="datePicker"
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDatePickerChange}
                style={{ backgroundColor: colors.surface }}
                minimumDate={minDate}
                maximumDate={maxDate}
                textColor={colors.textPrimary}
              />

              {Platform.OS === 'ios' && (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleCancel}
                  >
                    <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleConfirm}
                  >
                    <Text style={[styles.buttonText, styles.confirmButtonText]}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              )}
            </MotiView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {Platform.OS === 'web' ? (
          renderDatePicker()
        ) : (
          <>
            <TextInput
              style={[
                styles.input, 
                customStyles?.dateInput,
                (error || inputError) && styles.inputError,
                { flex: 1 }
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
                (error || inputError) && styles.inputError
              ]}
              onPress={() => setShowPicker(true)}
              testID="datePickerButton"
            >
              <MaterialIcons name="calendar-today" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </View>
      
      {Platform.OS !== 'web' && (
        <View style={styles.hintContainer}>
          <Text style={styles.formatHint}>Format: MM/DD/YYYY</Text>
        </View>
      )}

      {(error || inputError) && (
        <Text style={styles.errorText}>{error || inputError}</Text>
      )}

      {renderDatePicker()}
    </View>
  )
} 