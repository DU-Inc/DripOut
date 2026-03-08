import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import TermsCheckbox from '../common/TermsCheckbox';

// Function to make dimensions responsive (copied from SignInScreen)
const width = require('react-native').Dimensions.get('window').width;
const scale = width / 375; // Using iPhone 8 as baseline
const normalize = (size: number) => {
  return Math.round(scale * size);
};

interface SignInFooterProps {
  isTermsChecked: boolean;
  onTermsToggle: () => void;
  onSignUpPress: () => void;
  styles: any;
  text: any;
}

const SignInFooter: React.FC<SignInFooterProps> = ({
  isTermsChecked,
  onTermsToggle,
  onSignUpPress,
  styles,
  text,
}) => {
  return (
    <>
      {/* Terms checkbox positioned above footer */}
      <View style={[styles.checkboxContainer, { bottom: normalize(75) }]}>
        <TermsCheckbox 
          isChecked={isTermsChecked} 
          onToggle={onTermsToggle} 
        />
      </View>

      {/* Footer with divider fixed at bottom */}
      <View style={[styles.footerContainer, { paddingBottom: Platform.OS === 'ios' ? normalize(30) : normalize(20) }]}>
        <View style={styles.divider} />
        
        {/* Sign Up Link */}
        <View style={[styles.signUpLink, { marginTop: normalize(12), marginBottom: normalize(10) }]}>
          <Text style={[styles.signUpText, { fontSize: normalize(14) }]}>{text.auth.signIn.noAccount}</Text>
          <TouchableOpacity onPress={onSignUpPress}>
            <Text style={[styles.signUpButton, { fontSize: normalize(14) }]}> {text.auth.signIn.signUp}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default SignInFooter;