import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeColors } from '../../styles/theme/colors';
import FormInput from '../common/FormInput';
import Button from '../common/Button';
import { text } from '../../styles/theme/text';

// Add global timer type declarations
declare const setTimeout: (callback: (...args: any[]) => void, ms: number) => number;
declare const clearTimeout: (id: number | null) => void;

// Get device dimensions
const { width, height } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalize = (size: number) => {
  return Math.round(scale * size);
};

interface BirthdayPickerProps {
  birthday: Date | null;
  age: number;
  birthdayValid: boolean;
  datePickerTouched: boolean;
  onDateChange: (date: Date) => void;
  formatBirthday: (date: Date | null) => string;
  onContinue: () => void;
  theme: ThemeColors;
}

const BirthdayPicker: React.FC<BirthdayPickerProps> = ({
  birthday,
  age,
  birthdayValid,
  datePickerTouched,
  onDateChange,
  formatBirthday,
  onContinue,
  theme
}) => {
  // Create a stable local date to prevent unnecessary renders
  const defaultDate = useMemo(() => new Date(2000, 0, 1), []);
  
  // Local state to track the date picker value
  const [localDate, setLocalDate] = useState<Date>(birthday || defaultDate);
  
  // Track if we're actively changing dates to prevent excessive updates
  const [isChangingDate, setIsChangingDate] = useState(false);
  
  // Use a timeout ref to debounce updates
  const updateTimeoutRef = useRef<number | null>(null);
  
  // Track when we last updated the parent to prevent rapid updates
  const lastUpdateTimeRef = useRef(Date.now());
  
  // Track if the component is mounted to prevent updates after unmount
  const isMountedRef = useRef(true);
  
  // Set isMounted to false on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clean up any pending timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Update local date only when the birthday prop changes from outside
  useEffect(() => {
    if (birthday && !isChangingDate) {
      setLocalDate(birthday);
    }
  }, [birthday ? birthday.getTime() : null, isChangingDate]);

  // Calculate if a date is different enough to warrant an update
  const isSignificantChange = (date1: Date | null, date2: Date): boolean => {
    if (!date1) return true;
    
    const diff = Math.abs(date1.getTime() - date2.getTime());
    return diff > 86400000; // Different by more than a day
  };

  // Handle date changes with robust error handling and debouncing
  const handleDateChange = (event: any, selectedDate?: Date) => {
    try {
      // Ignore any malformed dates
      if (!selectedDate || isNaN(selectedDate.getTime())) {
        return;
      }
      
      // Mark that we're actively changing dates
      setIsChangingDate(true);
      
      // Update local state immediately for UI responsiveness
      setLocalDate(selectedDate);
      
      // Clear any previous timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      
      // Throttle updates to parent - minimum 300ms between updates
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      
      // If we've updated recently, schedule a delayed update
      if (timeSinceLastUpdate < 300) {
        updateTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            lastUpdateTimeRef.current = Date.now();
            onDateChange(selectedDate);
            setIsChangingDate(false);
          }
        }, 300) as unknown as number;
      } else {
        // If it's been a while since last update, update immediately
        lastUpdateTimeRef.current = now;
        onDateChange(selectedDate);
        
        // We're done changing after a short delay
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsChangingDate(false);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error in date picker:', error);
      // End the changing state if there's an error
      setIsChangingDate(false);
    }
  };

  // Safely finalize date selection
  const finalizeDate = () => {
    // Ensure we're not in the middle of changing dates
    if (!isChangingDate && localDate) {
      onDateChange(localDate);
    }
  };

  // Display age suffix correctly
  const getAgeSuffix = (age: number): string => {
    if (age >= 12) {
      return text.components.birthdayPicker.ageDisplay.replace('{age}', age.toString());
    }
    return '';
  };

  // Determine if the birthday is valid for display purposes
  const getDisplayValidState = (): boolean | undefined => {
    if (!datePickerTouched) return undefined;
    return birthdayValid;
  };

  return (
    <View style={styles.expandedContainer}>
      <Text style={[styles.title, { color: theme.text.primary }]}>
        {text.components.birthdayPicker.title}
      </Text>
      <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
        {text.components.birthdayPicker.subtitle}
      </Text>
      
      {/* Birthday Input Field */}
      <View style={styles.formInputContainer}>
        <FormInput
          value={formatBirthday(localDate)}
          onChangeText={() => {}}
          placeholder={`${text.components.birthdayPicker.placeholder}${age > 0 ? ` (${getAgeSuffix(age)})` : ''}`} 
          isValid={getDisplayValidState()} 
          error={datePickerTouched && !birthdayValid ? text.components.birthdayPicker.ageRequirement : undefined}
          containerStyle={styles.formInputMargin}
          rightIcon={
            birthdayValid ? 
            <Icon name="check-circle-outline" size={normalize(18)} color={theme.success} /> :
            undefined
          }
          editable={false}
          disableAnimation={true}
        />
      </View>
      
      {/* Date Picker Container with better protection */}
      <View style={styles.datePickerSafeContainer}>
        {/* Add a static header to avoid layout shifts */}
        <View style={styles.datePickerHeader}>
          <Text style={[styles.datePickerHeaderText, { color: theme.text.secondary }]}>
            {isChangingDate ? 'Selecting...' : 'Select your birthday'}
          </Text>
        </View>
        
        {/* Date picker in a protected container */}
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            testID="birthdayDatePicker"
            value={localDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            style={styles.datePicker}
          />
        </View>
        
        {/* Add an apply button for explicit confirmation on iOS */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity 
            style={[styles.applyButton, { borderColor: theme.border }]} 
            onPress={finalizeDate}
          >
            <Text style={[styles.applyButtonText, { color: theme.primary }]}>
              Apply Selection
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Continue button */}
      <Button
        title={text.components.birthdayPicker.continueButton}
        onPress={onContinue}
        disabled={!birthdayValid || isChangingDate}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  expandedContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: '3%',
  },
  title: {
    fontSize: normalize(24),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: normalize(6),
    marginTop: normalize(20),
  },
  subtitle: {
    fontSize: normalize(15),
    marginBottom: normalize(14),
    marginTop: normalize(4),
    alignSelf: 'center',
    textAlign: 'center',
    width: '95%',
    flexWrap: 'wrap',
    lineHeight: normalize(20),
  },
  formInputContainer: {
    width: '100%',
    position: 'relative',
    marginTop: normalize(8),
  },
  formInputMargin: {
    marginBottom: normalize(4),
    width: '100%',
    alignSelf: 'stretch',
  },
  datePickerSafeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  datePickerHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: normalize(8),
    height: normalize(24),
  },
  datePickerHeaderText: {
    fontSize: normalize(14),
    fontWeight: '500',
  },
  datePickerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: normalize(180),
    overflow: 'hidden',
  },
  datePicker: {
    width: Platform.OS === 'ios' ? width : '80%',
    height: normalize(180),
  },
  applyButton: {
    paddingVertical: normalize(8),
    paddingHorizontal: normalize(16),
    borderRadius: normalize(8),
    borderWidth: 1,
    marginTop: normalize(8),
  },
  applyButtonText: {
    fontSize: normalize(14),
    fontWeight: '600',
  },
  button: {
    width: '100%',
    marginTop: normalize(10),
  }
});

export default React.memo(BirthdayPicker); // Use memo to prevent unnecessary re-renders 