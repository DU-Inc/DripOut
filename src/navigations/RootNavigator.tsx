import React from 'react';
import AppNavigator from './AppNavigator';

/**
 * RootNavigator is deprecated - use AppNavigator instead.
 * 
 * This component exists for backward compatibility and simply renders AppNavigator.
 * All navigation logic has been consolidated in AppNavigator.tsx.
 */
const RootNavigator: React.FC = () => {
  console.log('RootNavigator: This component is deprecated, using AppNavigator directly');
  return <AppNavigator />;
};

export default RootNavigator; 