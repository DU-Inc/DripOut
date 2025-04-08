import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { ThemeColors } from '../theme/colors';

export const createHomeStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text.primary,
    },
    postCard: {
      backgroundColor: theme.surface,
      marginBottom: 12,
      borderRadius: 12,
      overflow: 'hidden',
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    userAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    userInfo: {
      flex: 1,
    },
    username: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text.primary,
    },
    location: {
      fontSize: 14,
      color: theme.text.secondary,
      marginTop: 2,
    },
    postImage: {
      width: '100%',
      height: 400,
    },
    postActions: {
      flexDirection: 'row',
      padding: 12,
      alignItems: 'center',
    },
    actionButton: {
      marginRight: 16,
    },
    likes: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text.primary,
      marginTop: 8,
      paddingHorizontal: 12,
    },
    caption: {
      fontSize: 14,
      color: theme.text.primary,
      marginTop: 4,
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    comments: {
      fontSize: 14,
      color: theme.text.secondary,
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    timestamp: {
      fontSize: 12,
      color: theme.text.tertiary,
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
  }); 