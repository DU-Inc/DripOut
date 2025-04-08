import { StyleSheet } from 'react-native';
import { ThemeColors } from '../theme/colors';

export const createPreferencesStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginVertical: 24,
    },
    categoryContainer: {
      marginBottom: 24,
    },
    categoryTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    preferencesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    preferenceItem: {
      width: '48%',
      aspectRatio: 1,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    preferenceItemSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    preferenceIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    preferenceName: {
      fontSize: 14,
      textAlign: 'center',
    },
    preferenceNameSelected: {
      color: theme.background,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    selectedCount: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 16,
    },
  }); 