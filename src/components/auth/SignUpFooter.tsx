import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import TermsCheckbox from '../common/TermsCheckbox';

// Function to make dimensions responsive (copied from SignUpScreen)
const width = require('react-native').Dimensions.get('window').width;
const scale = width / 375; // Using iPhone 8 as baseline
const normalize = (size: number) => {
  return Math.round(scale * size);
};

interface SignUpFooterProps {
  shouldShow: boolean;
  isTermsChecked: boolean;
  isTransitioning: boolean;
  onTermsToggle: () => void;
  onSignInPress: () => void;
  styles: any;
  text: any;
}

const SignUpFooter: React.FC<SignUpFooterProps> = ({
  shouldShow,
  isTermsChecked,
  isTransitioning,
  onTermsToggle,
  onSignInPress,
  styles,
  text,
}) => {
  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <View style={[styles.checkboxContainer, { bottom: normalize(75) }]}>
        <TermsCheckbox
          isChecked={isTermsChecked}
          onToggle={() => !isTransitioning && onTermsToggle()}
        />
      </View>
      <View style={[styles.footerContainer, { 
        paddingBottom: Platform.OS === 'ios' ? normalize(30) : normalize(20),
        paddingTop: normalize(1)
      }]}>
        <View style={styles.divider} />
        <View style={styles.signInLink}>
          <Text style={[styles.signInText, { fontSize: normalize(14) }]}>{text.auth.signUp.footer.haveAccount}</Text>
          <TouchableOpacity onPress={onSignInPress} disabled={isTransitioning}>
            <Text style={[styles.signInButton, { fontSize: normalize(14) }]}>{text.auth.signUp.footer.signIn}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default SignUpFooter;