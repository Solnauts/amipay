import { install } from 'react-native-quick-crypto';
import 'react-native-url-polyfill/auto';
import 'fast-text-encoding';
import { Buffer } from 'buffer';

global.Buffer = Buffer;
global.process = global.process || {};
global.process.browser = true;
global.process.version = '';

install();