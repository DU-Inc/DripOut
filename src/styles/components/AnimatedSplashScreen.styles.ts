import { StyleSheet, Dimensions } from 'react-native';
import { ThemeColors } from '../theme/colors';

const { width, height } = Dimensions.get('window');
export const PANEL_WIDTH = width / 2 + 2;

export const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: theme.background,
    justifyContent: 'center',
    zIndex: 1,
  },
  leftPanel: {
    left: 0,
    alignItems: 'flex-end',
  },
  rightPanel: {
    right: 0,
    alignItems: 'flex-start',
  },
  panelText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.text.primary,
    fontFamily: 'System',
    paddingHorizontal: 0,
  },
  leftText: {
    textAlign: 'right',
    paddingRight: 1,
  },
  rightText: {
    textAlign: 'left',
    paddingLeft: 1,
  },
  dash: {
    position: 'absolute',
    top: height / 2 - 30,
    left: width / 2 - 12,
    zIndex: 2,
  },
  dashText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.text.primary,
    fontFamily: 'System',
  },
}); 