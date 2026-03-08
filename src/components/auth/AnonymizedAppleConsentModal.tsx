import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface AnonymizedAppleConsentModalProps {
  visible: boolean;
  onConsent: (consented: boolean) => void;
  onClose: () => void;
  linkingType: 'email' | 'phone' | 'social' | 'profile';
  additionalInfo?: string;
}

const AnonymizedAppleConsentModal: React.FC<AnonymizedAppleConsentModalProps> = ({
  visible,
  onConsent,
  onClose,
  linkingType,
  additionalInfo
}) => {
  const { theme } = useTheme();
  const [hasReadTerms, setHasReadTerms] = useState(false);

  const getLinkingDescription = () => {
    switch (linkingType) {
      case 'email':
        return 'link an email address to your Apple account';
      case 'phone':
        return 'link a phone number to your Apple account';
      case 'social':
        return 'link another social media account (Facebook, Google, etc.) to your Apple account';
      case 'profile':
        return 'add identifying profile information to your Apple account';
      default:
        return 'link additional identifying information to your Apple account';
    }
  };

  const handleConsent = (consented: boolean) => {
    onConsent(consented);
    onClose();
    setHasReadTerms(false); // Reset for next time
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modalContainer,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
          }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <Icon name="shield-account" size={32} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text.primary }]}>
              Privacy Consent Required
            </Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
              You signed in with Apple using an anonymized email address
            </Text>

            <View style={[styles.infoBox, { backgroundColor: theme.glassmorphism.background }]}>
              <Icon name="email-seal" size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.text.primary }]}>
                Your Apple ID email is anonymized (@privaterelay.appleid.com) to protect your privacy.
              </Text>
            </View>

            <Text style={[styles.description, { color: theme.text.primary }]}>
              You are about to {getLinkingDescription()}.
            </Text>

            <Text style={[styles.description, { color: theme.text.primary }]}>
              <Text style={{ fontWeight: 'bold' }}>Apple's Privacy Policy requires your explicit consent</Text> before we can associate any directly identifying personal information with your anonymized Apple ID.
            </Text>

            {additionalInfo && (
              <View style={[styles.additionalInfo, { borderColor: theme.border }]}>
                <Text style={[styles.additionalInfoText, { color: theme.text.secondary }]}>
                  {additionalInfo}
                </Text>
              </View>
            )}

            <View style={styles.consentSection}>
              <Text style={[styles.consentTitle, { color: theme.text.primary }]}>
                By proceeding, you consent to:
              </Text>
              <View style={styles.consentList}>
                <Text style={[styles.consentItem, { color: theme.text.secondary }]}>
                  • Linking the provided information to your anonymized Apple ID
                </Text>
                <Text style={[styles.consentItem, { color: theme.text.secondary }]}>
                  • Storing this association in our secure database
                </Text>
                <Text style={[styles.consentItem, { color: theme.text.secondary }]}>
                  • Using this information to improve your app experience
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.readTermsButton,
                { borderColor: hasReadTerms ? theme.primary : theme.border }
              ]}
              onPress={() => setHasReadTerms(!hasReadTerms)}
            >
              <Icon
                name={hasReadTerms ? "checkbox-marked" : "checkbox-blank-outline"}
                size={20}
                color={hasReadTerms ? theme.primary : theme.text.secondary}
              />
              <Text style={[
                styles.readTermsText,
                { color: hasReadTerms ? theme.primary : theme.text.secondary }
              ]}>
                I have read and understand the privacy implications
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: theme.border }
              ]}
              onPress={() => handleConsent(false)}
            >
              <Text style={[styles.buttonText, { color: theme.text.secondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.consentButton,
                {
                  backgroundColor: hasReadTerms ? theme.primary : theme.border,
                  opacity: hasReadTerms ? 1 : 0.5,
                }
              ]}
              onPress={() => handleConsent(true)}
              disabled={!hasReadTerms}
            >
              <Text style={[
                styles.buttonText,
                { color: hasReadTerms ? theme.text.onPrimary : theme.text.secondary }
              ]}>
                I Consent
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  additionalInfo: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  additionalInfoText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  consentSection: {
    marginBottom: 20,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  consentList: {
    paddingLeft: 8,
  },
  consentItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  readTermsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  readTermsText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  consentButton: {
    // backgroundColor applied dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AnonymizedAppleConsentModal;