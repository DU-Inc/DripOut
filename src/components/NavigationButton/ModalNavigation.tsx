import React, {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
  } from 'react';
  import {
    Modal,
    Pressable,
    Animated,
    View,
    TouchableOpacity,
    StyleSheet,
    Easing,
  } from 'react-native';
  import Icon from 'react-native-vector-icons/Ionicons';
  
  // Sign-out function from your services/auth.ts
  import { signOutUser } from '../../services/auth';
  
  // For navigating to Profile/Preferences
  import { useNavigateTo } from '../NavigationButton/Navigation';
  
  // Only needed if you use manual nav (for other features)
  import { useNavigation } from '@react-navigation/native';
  import { StackNavigationProp } from '@react-navigation/stack';
  // Import from NavigationTypes to ensure consistency
  import { RootStackParamList } from '../../types/NavigationTypes';
  
  // The methods we expose to the parent (BottomNavigationBar) via ref
  export interface ModalNavigationHandles {
    openModal: () => void;
    closeModal: () => void;
    toggleModal: () => void;
  }
  
  const ModalNavigation = forwardRef<ModalNavigationHandles>((props, ref) => {
    const [visible, setVisible] = useState(false);
  
    // Animations for "appear from bottom-right corner"
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(30)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
  
    const { navigateToUserProfile, navigateToUserPreferences } = useNavigateTo();
  
    // If you need additional manual nav:
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
    // Expose open/close/toggle methods to parent
    useImperativeHandle(ref, () => ({
      openModal,
      closeModal,
      toggleModal,
    }));
  
    // --------- OPEN MODAL ---------
    const openModal = () => {
      if (!visible) {
        setVisible(true);
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };
  
    // --------- CLOSE MODAL ---------
    const closeModal = () => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 30,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setVisible(false);
        }
      });
    };
  
    // --------- TOGGLE MODAL ---------
    const toggleModal = () => {
      if (visible) {
        closeModal();
      } else {
        openModal();
      }
    };
  
    // --------- ACTION HANDLERS ---------
    // Example "cart" action
    const handlePressCart = () => {
      closeModal();
      // e.g. navigation.navigate('CartScreen')
    };
  
    const handlePressProfile = () => {
      closeModal();
      navigateToUserProfile();
    };
  
    const handlePressPreferences = () => {
      closeModal();
      navigateToUserPreferences();
    };
  
    /**
     * Sign Out logic using your services/auth.ts
     * onAuthStateChanged will handle navigation to Auth.
     */
    const handlePressSignOut = async () => {
      closeModal();
      try {
        await signOutUser();
        // NOTE: We remove navigation.reset or navigation.navigate('Auth')
        // because the onAuthStateChanged listener in useAuthSession.ts
        // already switches to "Auth" when user == null.
      } catch (err) {
        console.error('Sign out failed:', err);
      }
    };
  
    // If not visible, don’t render anything
    if (!visible) return null;
  
    return (
      <Modal visible={visible} transparent={true} animationType="none">
        {/* Press outside to close the modal */}
        <Pressable style={styles.overlay} onPress={closeModal}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY }, { scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <View style={styles.gridContainer}>
              {/* Search/Recommendations */}
              <TouchableOpacity 
                style={styles.iconWrapper} 
                onPress={() => {
                  closeModal();
                  navigation.navigate('RecommendationScreen');
                }}
              >
                <Icon name="search" size={24} color="#fff" />
              </TouchableOpacity>

              {/* Cart */}
              <TouchableOpacity style={styles.iconWrapper} onPress={handlePressCart}>
                <Icon name="cart-outline" size={24} color="#fff" />
              </TouchableOpacity>
  
              {/* Profile */}
              <TouchableOpacity style={styles.iconWrapper} onPress={handlePressProfile}>
                <Icon name="people-outline" size={24} color="#fff" />
              </TouchableOpacity>
  
              {/* Preferences */}
              <TouchableOpacity style={styles.iconWrapper} onPress={handlePressPreferences}>
                <Icon name="checkbox-outline" size={24} color="#fff" />
              </TouchableOpacity>
  
              {/* Sign Out */}
              <TouchableOpacity style={styles.iconWrapper} onPress={handlePressSignOut}>
                <Icon name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  });
  
  export default ModalNavigation;
  
  // -------------- STYLES --------------
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    modalContainer: {
      position: 'absolute',
      bottom: 82,
      right: 40,
      backgroundColor: 'rgba(48, 48, 48, 0.95)',
      borderRadius: 12,
      paddingVertical: 5,
      paddingHorizontal: 2,
      // Shadow removed or changed if needed
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      maxWidth: 120,
      justifyContent: 'space-between',
    },
    iconWrapper: {
      width: '50%',
      marginVertical: 8,
      alignItems: 'center',
    },
  });
  