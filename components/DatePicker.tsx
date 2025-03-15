import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, Modal } from 'react-native'
import { useTheme } from '@/context/ThemeContext'
import { MaterialIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MotiView } from 'moti'

interface CustomDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  customStyles?: any;
  error?: string;
  onValidationChange?: (isValid: boolean) => void;
}

export default function CustomDatePicker({ date, onDateChange, customStyles, error, onValidationChange }: CustomDatePickerProps) {
  const { colors } = useTheme()
  const [showPicker, setShowPicker] = useState(false)
  const [inputValue, setInputValue] = useState(formatDate(date))
  const [inputError, setInputError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(true)

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

  const handleInputChange = (text: string) => {
    setInputValue(text)
    setInputError(null)
    
    const parsedDate = parseDate(text)
    if (parsedDate) {
      onDateChange(parsedDate)
      setIsValid(true)
      onValidationChange?.(true)
      setInputValue(formatDate(parsedDate))
    } else if (text.length >= 8) {
      setInputError('Invalid date format')
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
  }, [date])

  // Update validation when date changes from picker
  useEffect(() => {
    const isDateValid = date instanceof Date && !isNaN(date.getTime());
    setIsValid(isDateValid);
    onValidationChange?.(isDateValid);
    if (isDateValid) {
      setInputValue(formatDate(date));
      setInputError(null);
    }
  }, [date]);

  // Update native picker handler
  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      onDateChange(selectedDate);
      // Validation will be handled by the useEffect above
    }
  };

  const styles = StyleSheet.create({
    container: {
      width: '100%',
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
    },
    pickerButton: {
      padding: 15,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: 5,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
      borderWidth: 1,
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    pickerContainer: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
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
    },
  })

  const renderDatePicker = () => {
    // Don't render the modal picker on web
    if (Platform.OS === 'web') {
      return null;
    }

    return (
      <Modal
        transparent
        animationType="fade"
        visible={showPicker}
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <MotiView
            from={{ translateY: 100, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: 'timing', duration: 300 }}
            style={[styles.pickerContainer, { backgroundColor: colors.surface }]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={handleDatePickerChange}
              style={{ backgroundColor: colors.surface }}
            />
          </MotiView>
        </TouchableOpacity>
      </Modal>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
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
        />
        
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[
              styles.pickerButton,
              (error || inputError) && styles.inputError
            ]}
            onPress={() => setShowPicker(true)}
          >
            <MaterialIcons name="calendar-today" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.hintContainer}>
        <Text style={styles.formatHint}>Format: MM/DD/YYYY</Text>
      </View>

      {(error || inputError) && (
        <Text style={styles.errorText}>{error || inputError}</Text>
      )}

      {showPicker && renderDatePicker()}
    </View>
  )
} 