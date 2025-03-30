import React, { useState, useEffect } from 'react';
import { View, Modal, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CustomDatePickerProps } from './types';
import { createStyles } from './styles';
import { DatePickerHeader } from './DatePickerHeader';
import { DatePickerInput } from './DatePickerInput';

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
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [inputValue, setInputValue] = useState(formatDate(date));
  const [inputError, setInputError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [tempDate, setTempDate] = useState(date);

  // Format date for display
  function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
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
        parsedDate 
          ? 'Date is outside allowed range' 
          : 'Invalid date format'
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
    const isDateValid = date instanceof Date && !isNaN(date.getTime()) && validateDate(date);
    setIsValid(isDateValid);
    onValidationChange?.(isDateValid);
    if (isDateValid) {
      setInputValue(formatDate(date));
      setInputError(null);
    }
  }, [date]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        if (validateDate(selectedDate)) {
          onDateChange(selectedDate);
        } else {
          setInputError('Date is outside allowed range');
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
      setInputError('Date is outside allowed range');
    }
  };

  const handleCancel = () => {
    setTempDate(date);
    setShowPicker(false);
  };

  const styles = createStyles(colors, isFocused);

  return (
    <View style={styles.container}>
      <DatePickerInput
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        error={error || inputError}
        customStyles={customStyles}
        colors={colors}
        isFocused={isFocused}
        onPickerPress={() => setShowPicker(true)}
      />

      {Platform.OS === 'ios' ? (
        <Modal
          transparent
          visible={showPicker}
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DatePickerHeader
                onCancel={handleCancel}
                onConfirm={handleConfirm}
                label={label}
                colors={colors}
              />
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
    </View>
  );
} 