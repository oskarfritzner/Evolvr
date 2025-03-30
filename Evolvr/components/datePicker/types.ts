export interface CustomDatePickerProps {
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

export interface DatePickerHeaderProps {
  onCancel: () => void;
  onConfirm: () => void;
  label: string;
  colors: any;
}

export interface DatePickerInputProps {
  value: string;
  onChange: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  error?: string | null;
  customStyles?: any;
  colors: any;
  isFocused: boolean;
  onPickerPress: () => void;
}
