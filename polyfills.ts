// Polyfills for React Native
import { decode, encode } from 'base-64';

if (!global.btoa) {
  global.btoa = encode;
}

if (!global.atob) {
  global.atob = decode;
}

// Blob polyfill for React Native
if (typeof Blob === 'undefined') {
  // Simple Blob polyfill for React Native
  global.Blob = require('blob-polyfill').Blob;
}

// URL polyfill if needed
if (typeof URL === 'undefined') {
  global.URL = require('react-native-url-polyfill');
}

// FormData polyfill if needed
if (typeof FormData === 'undefined') {
  global.FormData = require('form-data');
}