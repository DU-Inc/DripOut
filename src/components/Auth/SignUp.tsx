import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../styles/themeprovider'; // Assuming your ThemeProvider is in the same folder
import { lightTheme, darkTheme } from '../../styles/themes'; // Import your themes
import DateTimePicker from '@react-native-community/datetimepicker'; // Import the DateTimePicker
import { Platform } from 'react-native';


interface SignUpProps {
  handleSignUp: () => void;
  errorMessage: string;
  email: string;
  password: string;
  firstName: string;  // Add firstName as a prop
  lastName: string;   // Add lastName as a prop
  username: string;   // Add username as a prop
  dateOfBirth?: string; // Add dateOfBirth as a prop (optional)
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setFirstName: (firstName: string) => void;  // Setter for first name
  setLastName: (lastName: string) => void;    // Setter for last name
  setUsername: (username: string) => void;    // Setter for username
  setDateOfBirth?: (dateOfBirth: string) => void; // New setter for dateOfBirth
}

const SignUp: React.FC<SignUpProps> = ({
  handleSignUp,
  errorMessage,
  email,
  password,
  firstName,
  lastName,
  username,
  dateOfBirth,
  setEmail,
  setPassword,
  setFirstName,
  setLastName,
  setUsername,
  setDateOfBirth,
}) => {
  const { isDarkMode } = useTheme(); // Access the dark mode boolean from your context
  const theme = isDarkMode ? darkTheme : lightTheme; // Select the appropriate theme based on dark mode

  const isFormValid = firstName && lastName && username && email && password;

  const screenWidth = Dimensions.get('window').width;

  const [showDatePicker, setShowDatePicker] = useState(false); // For showing date picker
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // To store selected date

  // Handle date selection
  const handleDateChange = (event: any, selected: Date | undefined) => {
    setShowDatePicker(false); // Close the date picker after selection
    if (selected) {
      setSelectedDate(selected);
      setDateOfBirth?.(selected.toDateString()); // Convert to string and store
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.transparent }]}>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.h2.fontSize }]}>
        Sign Up
      </Text>

      {errorMessage ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorMessage}</Text> : null}

      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            { 
              marginRight: 5, 
              minWidth: screenWidth * 0.3, 
              maxWidth: screenWidth * 0.5, 
              borderColor: theme.colors.border, 
              color: theme.colors.text, 
              backgroundColor: theme.colors.background, 
              fontSize: theme.typography.body.fontSize 
            }
          ]}
          value={firstName} // First name field
          placeholder="First Name"
          placeholderTextColor={theme.colors.placeholder}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <TextInput
          style={[
            styles.input,
            { 
              marginLeft: 5, 
              minWidth: screenWidth * 0.3, 
              maxWidth: screenWidth * 0.5, 
              borderColor: theme.colors.border, 
              color: theme.colors.text, 
              backgroundColor: theme.colors.background, 
              fontSize: theme.typography.body.fontSize 
            }
          ]}
          value={lastName} // Last name field
          placeholder="Last Name"
          placeholderTextColor={theme.colors.placeholder}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
      </View>

      <TextInput
        style={[
          styles.input,
          { 
            minWidth: screenWidth * 0.5, 
            maxWidth: screenWidth * 0.7, 
            borderColor: theme.colors.border, 
            color: theme.colors.text, 
            backgroundColor: theme.colors.background, 
            fontSize: theme.typography.body.fontSize 
          }
        ]}
        value={username} // Username field
        placeholder="Username"
        placeholderTextColor={theme.colors.placeholder}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={[
          styles.input,
          { 
            minWidth: screenWidth * 0.5, 
            maxWidth: screenWidth * 0.7, 
            borderColor: theme.colors.border, 
            color: theme.colors.text, 
            backgroundColor: theme.colors.background, 
            fontSize: theme.typography.body.fontSize 
          }
        ]}
        value={email} // Email field
        placeholder="Email"
        placeholderTextColor={theme.colors.placeholder}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[
          styles.input,
          { 
            minWidth: screenWidth * 0.5, 
            maxWidth: screenWidth * 0.7, 
            borderColor: theme.colors.border, 
            color: theme.colors.text, 
            backgroundColor: theme.colors.background, 
            fontSize: theme.typography.body.fontSize 
          }
        ]}
        value={password} // Password field
        placeholder="Password"
        placeholderTextColor={theme.colors.placeholder}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Date of Birth Field with DatePicker */}
      <TouchableOpacity
        style={[styles.input, { justifyContent: 'center', borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: theme.colors.text }}>
          {selectedDate ? selectedDate.toDateString() : 'Select Date of Birth'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()} // Set maximum date to current date
        />
      )}

      {isFormValid ? (
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handleSignUp}>
          <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Sign Up</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.notReadyText, { color: theme.colors.error }]}>You're not yet ready</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorText: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '95%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
  },
  notReadyText: {
    fontSize: 12,
  },
});

export default SignUp;
