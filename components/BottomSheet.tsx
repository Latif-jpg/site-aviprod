
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  LayoutChangeEvent
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { colors } from '../styles/commonStyles';

interface SimpleBottomSheetProps {
  children?: React.ReactNode;
  isVisible?: boolean;
  onClose?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SimpleBottomSheet: React.FC<SimpleBottomSheetProps> = ({
  children,
  isVisible = false,
  onClose
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const gestureTranslateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT * 0.5);
  const [snapPoint, setSnapPoint] = useState(SCREEN_HEIGHT * 0.8);
  const lastGestureY = useRef(0);

  // Automatically expand to fit content or maximum height
  const handleContentLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    const maxHeight = SCREEN_HEIGHT * 0.97; // 97% of screen height for marketplace modals
    const minHeight = SCREEN_HEIGHT * 0.3; // 30% of screen height

    // Add padding for handle and margins
    const totalHeight = Math.min(Math.max(height + 60, minHeight), maxHeight);

    console.log('Content height:', height, 'Total height:', totalHeight);
    setContentHeight(totalHeight);
    setSnapPoint(totalHeight);
  };

  useEffect(() => {
    if (isVisible) {
      gestureTranslateY.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT - snapPoint,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      gestureTranslateY.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity, gestureTranslateY, snapPoint]);

  const handleBackdropPress = () => {
    onClose?.();
  };

  const onGestureEvent = (event: any) => {
    const { translationY } = event.nativeEvent;
    lastGestureY.current = translationY;

    const currentBasePosition = SCREEN_HEIGHT - snapPoint;
    const intendedPosition = currentBasePosition + translationY;

    const minPosition = SCREEN_HEIGHT - (SCREEN_HEIGHT * 0.97);
    const maxPosition = SCREEN_HEIGHT;

    const clampedPosition = Math.max(minPosition, Math.min(maxPosition, intendedPosition));
    const clampedTranslation = clampedPosition - currentBasePosition;

    gestureTranslateY.setValue(clampedTranslation);
  };

  const onHandlerStateChange = (event: any) => {
    const { state, translationY, velocityY } = event.nativeEvent;

    if (state === State.END) {
      const currentBasePosition = SCREEN_HEIGHT - snapPoint;
      const intendedPosition = currentBasePosition + translationY;

      // If dragged down significantly or with high velocity, close
      if (translationY > 100 || velocityY > 1000) {
        onClose?.();
      } else {
        // Snap back to position
        gestureTranslateY.setValue(0);
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT - snapPoint,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
        }).start();
      }
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity }
            ]}
          />
        </TouchableWithoutFeedback>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                height: snapPoint,
                transform: [
                  { translateY: Animated.add(translateY, gestureTranslateY) }
                ],
              },
            ]}
          >
            <View style={styles.handle} />

            <View 
              style={styles.contentContainer}
              onLayout={handleContentLayout}
            >
              {children || (
                <View style={styles.defaultContent}>
                  <Text style={styles.title}>Bottom Sheet 🎉</Text>
                  <Text style={styles.description}>
                    This is a custom bottom sheet implementation.
                    Try dragging it up and down!
                  </Text>
                  <Button
                    title="Close"
                    onPress={onClose}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
};

SimpleBottomSheet.displayName = 'SimpleBottomSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  bottomSheet: {
    backgroundColor: colors.background || '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.grey || '#cccccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  defaultContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default SimpleBottomSheet;
