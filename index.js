/**
 * @format
 */

import {AppRegistry} from 'react-native';
import './src/config/firebaseconfig'; // Import Firebase configuration first
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
