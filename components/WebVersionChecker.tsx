
import { useEffect, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';

const APP_VERSION = '1.0.1'; // Match app.json version

const styles = StyleSheet.create({
  updateBanner: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  updateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  updateButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  updateButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default function WebVersionChecker() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') {
      return;
    }

    checkVersion();

    // Check for updates every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkVersion = () => {
    try {
      const storedVersion = localStorage.getItem('app_version');
      
      if (storedVersion && storedVersion !== APP_VERSION) {
        console.log('🔄 New version detected:', APP_VERSION, 'Current:', storedVersion);
        setShowUpdate(true);
      } else {
        localStorage.setItem('app_version', APP_VERSION);
      }
    } catch (error) {
      console.log('⚠️ Error checking version:', error);
    }
  };

  const handleUpdate = async () => {
    try {
      console.log('🔄 Updating app...');
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('🗑️ Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => {
            console.log('🗑️ Unregistering service worker');
            return registration.unregister();
          })
        );
      }

      // Clear local storage except for important data
      const keysToKeep = ['supabase.auth.token'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
          localStorage.removeItem(key);
        }
      });

      // Update version
      localStorage.setItem('app_version', APP_VERSION);

      // Force reload with cache bypass
      window.location.reload();
    } catch (error) {
      console.log('⚠️ Error updating app:', error);
      // Fallback: just reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    localStorage.setItem('app_version', APP_VERSION);
  };

  if (!showUpdate || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.updateBanner}>
      <Icon name="information" size={24} color="#fff" />
      <Text style={styles.updateText}>
        🎉 Nouvelle version disponible!
      </Text>
      <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
        <Text style={styles.updateButtonText}>Actualiser</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
        <Icon name="close" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
