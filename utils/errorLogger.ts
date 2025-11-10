
// Global error logging for runtime errors

import { Platform } from "react-native";

// Simple debouncing to prevent duplicate errors
const recentErrors = new Map<string, number>();
const ERROR_DEBOUNCE_MS = 30000; // Increased to 30 seconds to reduce noise

// Function to send errors to parent window (React frontend)
const sendErrorToParent = (level: string, message: string, data: any) => {
  try {
    // Create a simple key to identify duplicate errors
    const errorKey = `${level}:${message}`;
    const now = Date.now();

    // Skip if we've seen this exact error recently
    const lastSeen = recentErrors.get(errorKey);
    if (lastSeen && (now - lastSeen) < ERROR_DEBOUNCE_MS) {
      return;
    }

    // Mark this error as seen with timestamp
    recentErrors.set(errorKey, now);
    
    // Clean up old errors after delay
    setTimeout(() => {
      recentErrors.delete(errorKey);
    }, ERROR_DEBOUNCE_MS);

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'EXPO_ERROR',
        level: level,
        message: message,
        data: data,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        source: 'expo-template'
      }, '*');
    }
  } catch (error) {
    // Silently fail - don't create more errors
  }
};

// Function to extract meaningful source location from stack trace
const extractSourceLocation = (stack: string): string => {
  if (!stack || typeof stack !== 'string') return '';

  try {
    // Look for various patterns in the stack trace
    const patterns = [
      // Pattern for app files: app/filename.tsx:line:column
      /at\s+.+\/(app\/[^:)]+):(\d+):(\d+)/,
      // Pattern for components: components/filename.tsx:line:column
      /at\s+.+\/(components\/[^:)]+):(\d+):(\d+)/,
      // Pattern for hooks: hooks/filename.tsx:line:column
      /at\s+.+\/(hooks\/[^:)]+):(\d+):(\d+)/,
      // Pattern for utils: utils/filename.tsx:line:column
      /at\s+.+\/(utils\/[^:)]+):(\d+):(\d+)/,
      // Pattern for any .tsx/.ts files
      /at\s+.+\/([^/]+\.tsx?):(\d+):(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = stack.match(pattern);
      if (match && match[1] && match[2]) {
        return ` | ${match[1]}:${match[2]}`;
      }
    }
  } catch (error) {
    // Silently fail
  }

  return '';
};

// List of error patterns to ignore (common React Native warnings)
const IGNORED_PATTERNS = [
  'VirtualizedLists should never be nested',
  'Require cycle:',
  'componentWillReceiveProps',
  'componentWillMount',
  'findNodeHandle',
  'Animated: `useNativeDriver`',
  'Non-serializable values were found',
  'Sending `onAnimatedValueUpdate`',
  'Warning: Failed prop type',
  'Warning: React does not recognize',
  'Warning: Each child in a list',
  'Possible Unhandled Promise Rejection',
  'Module "expo-router/entry" has been resolved',
  'Setting a timer',
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'EdgeInsetsPropType will be removed',
  'PointPropType will be removed',
  'Animated.event now requires',
  'Require cycles are allowed',
  'Remote debugger',
  'source.uri should not be an empty string',
];

const shouldIgnoreError = (message: string): boolean => {
  if (!message || typeof message !== 'string') return true;
  
  try {
    return IGNORED_PATTERNS.some(pattern => {
      try {
        return message.includes(pattern);
      } catch (err) {
        return false;
      }
    });
  } catch (error) {
    return false;
  }
};

// Store original console methods
let originalConsoleError: any = null;
let originalConsoleWarn: any = null;
let isSetup = false;

export const setupErrorLogging = () => {
  // Prevent multiple setups
  if (isSetup) {
    return;
  }

  try {
    console.log('🔧 Setting up error logging...');
    isSetup = true;

    // Store original console methods once
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;

    // Capture unhandled errors in web environment
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Override window.onerror to catch JavaScript errors
      const originalOnError = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        try {
          const messageStr = typeof message === 'string' ? message : String(message || '');
          
          if (messageStr && !shouldIgnoreError(messageStr)) {
            const sourceFile = source ? String(source).split('/').pop() : 'unknown';
            const errorData = {
              message: messageStr,
              source: `${sourceFile}:${lineno || 0}:${colno || 0}`,
              line: lineno || 0,
              column: colno || 0,
              timestamp: new Date().toISOString()
            };

            sendErrorToParent('error', 'JavaScript Runtime Error', errorData);
          }
        } catch (err) {
          // Silently fail
        }
        
        // Call original handler if it exists
        if (originalOnError) {
          try {
            return originalOnError(message, source, lineno, colno, error);
          } catch (err) {
            // Silently fail
          }
        }
        return false;
      };

      // Capture unhandled promise rejections
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        try {
          // Prevent default to avoid console errors
          event.preventDefault();
          
          const reason = event.reason?.message || event.reason;
          const reasonStr = typeof reason === 'string' ? reason : String(reason || '');
          
          if (reasonStr && !shouldIgnoreError(reasonStr)) {
            const errorData = {
              reason: reasonStr,
              stack: event.reason?.stack || '',
              timestamp: new Date().toISOString()
            };

            sendErrorToParent('error', 'Unhandled Promise Rejection', errorData);
          }
        } catch (err) {
          // Silently fail
        }
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      console.log('✅ Error logging setup complete (web)');
    } else {
      // For React Native, set up global promise rejection handler
      if (typeof global !== 'undefined') {
        // Try to set up Hermes promise rejection tracking
        try {
          // @ts-expect-error Hermes internal API
          if (global.HermesInternal?.hasPromiseRejectionTrackingMethods?.()) {
            // @ts-expect-error Hermes internal API
            global.HermesInternal.enablePromiseRejectionTracker({
              allRejections: true,
              onUnhandled: (id: number, error: any) => {
                try {
                  const reason = error?.message || error;
                  const reasonStr = typeof reason === 'string' ? reason : String(reason || '');
                  
                  if (reasonStr && !shouldIgnoreError(reasonStr)) {
                    const errorData = {
                      id,
                      reason: reasonStr,
                      stack: error?.stack || '',
                      timestamp: new Date().toISOString()
                    };

                    sendErrorToParent('error', 'Unhandled Promise Rejection', errorData);
                  }
                } catch (err) {
                  // Silently fail
                }
              },
              onHandled: () => {
                // Promise rejection was handled after being unhandled
              }
            });
            console.log('✅ Hermes promise rejection tracking enabled');
          }
        } catch (err) {
          // Silently ignore
        }
      }

      console.log('✅ Error logging setup complete (native)');
    }

    // Override console.error to capture more detailed information
    console.error = (...args: any[]) => {
      try {
        // Always call original first to ensure errors are logged
        if (originalConsoleError) {
          originalConsoleError(...args);
        }

        const message = args.map(arg => {
          try {
            if (typeof arg === 'string') return arg;
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg);
              } catch (jsonErr) {
                return String(arg);
              }
            }
            return String(arg);
          } catch (err) {
            return 'Error converting argument';
          }
        }).join(' ');
        
        // Skip ignored patterns and empty messages
        if (!message || shouldIgnoreError(message)) {
          return;
        }

        try {
          const stack = new Error().stack || '';
          const sourceInfo = extractSourceLocation(stack);
          const enhancedMessage = message + sourceInfo;

          // Send to parent
          sendErrorToParent('error', 'Console Error', enhancedMessage);
        } catch (stackErr) {
          // If stack extraction fails, just send the message
          sendErrorToParent('error', 'Console Error', message);
        }
      } catch (error) {
        // Fallback to original if enhancement fails
        if (originalConsoleError) {
          originalConsoleError(...args);
        }
      }
    };

    // Override console.warn - but only send critical warnings
    console.warn = (...args: any[]) => {
      try {
        // Always call original first to ensure warnings are logged
        if (originalConsoleWarn) {
          originalConsoleWarn(...args);
        }

        const message = args.map(arg => {
          try {
            if (typeof arg === 'string') return arg;
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg);
              } catch (jsonErr) {
                return String(arg);
              }
            }
            return String(arg);
          } catch (err) {
            return 'Error converting argument';
          }
        }).join(' ');
        
        // Skip ignored patterns and empty messages
        // Also skip all warnings unless they contain critical keywords
        const criticalKeywords = ['crash', 'fatal', 'critical', 'security'];
        const isCritical = criticalKeywords.some(keyword => message.toLowerCase().includes(keyword));
        
        if (!message || shouldIgnoreError(message) || !isCritical) {
          return;
        }

        try {
          const stack = new Error().stack || '';
          const sourceInfo = extractSourceLocation(stack);
          const enhancedMessage = message + sourceInfo;

          // Send to parent
          sendErrorToParent('warn', 'Console Warning', enhancedMessage);
        } catch (stackErr) {
          // If stack extraction fails, just send the message
          sendErrorToParent('warn', 'Console Warning', message);
        }
      } catch (error) {
        // Fallback to original if enhancement fails
        if (originalConsoleWarn) {
          originalConsoleWarn(...args);
        }
      }
    };
  } catch (error) {
    console.log('⚠️ Failed to setup error logging:', error);
  }
};
