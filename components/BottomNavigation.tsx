
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, router } from 'expo-router';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';

interface BottomNavigationProps {
  currentTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onTabPress?: (tab: string) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  currentTab,
  activeTab,
  onTabChange, 
  onTabPress 
}) => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [activeRoute, setActiveRoute] = useState('dashboard');
  
  // Determine active tab based on current route
  const getActiveTab = (path: string) => {
    console.log('🔍 Current pathname:', path);
    
    // Normalize pathname by removing trailing slashes
    const normalizedPath = path.replace(/\/$/, '') || '/';
    
    // Main routes
    if (normalizedPath === '/dashboard' || normalizedPath === '/' || normalizedPath === '/index') return 'dashboard';
    if (normalizedPath === '/lots') return 'lots';
    if (normalizedPath === '/marketplace') return 'marketplace';
    if (normalizedPath === '/feeding') return 'feeding';
    if (normalizedPath === '/health') return 'health';
    if (normalizedPath === '/profile') return 'profile';

    // Secondary routes that should highlight dashboard
    if (normalizedPath === '/ai-history' ||
        normalizedPath === '/verify-gemini-setup' ||
        normalizedPath === '/verify-setup' ||
        normalizedPath === '/connection-check' ||
        normalizedPath === '/ngrok-help') {
      return 'dashboard';
    }
    
    // Settings and other profile-related routes
    if (normalizedPath === '/settings' || normalizedPath === '/marketplace-messages' || normalizedPath === '/profile') {
      return 'dashboard';
    }
    
    // Default to dashboard for unknown routes
    return 'dashboard';
  };
  
  // Update active route whenever pathname changes
  useEffect(() => {
    const newActiveTab = getActiveTab(pathname);
    console.log('📍 Pathname changed to:', pathname, '-> Active tab:', newActiveTab);
    setActiveRoute(newActiveTab);
  }, [pathname]);
  
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' as const, route: '/dashboard' },
    { id: 'lots', label: 'Lots', icon: 'egg' as const, route: '/lots' },
    { id: 'marketplace', label: 'Marché', icon: 'storefront' as const, route: '/marketplace' },
    { id: 'feeding', label: 'Aliment', icon: 'nutrition' as const, route: '/feeding' },
    { id: 'health', label: 'Santé', icon: 'medical' as const, route: '/health' },
  ];

  const handleTabPress = (tab: any) => {
    try {
      console.log('📱 Tab pressed:', tab.id, 'Route:', tab.route, 'Current active:', activeRoute);
      
      // Don't navigate if already on this tab
      if (activeRoute === tab.id) {
        console.log('⏭️ Already on this tab, skipping navigation');
        return;
      }
      
      // Update active route immediately for instant visual feedback
      setActiveRoute(tab.id);
      
      // --- CORRECTION : Utiliser push() au lieu de replace() ---
      // push() ajoute l'écran à l'historique, permettant le retour en arrière.
      // replace() remplace l'écran, ce qui fait que le bouton retour quitte l'app.
      router.push(tab.route);
      
      // Call callbacks if provided
      if (onTabChange) {
        onTabChange(tab.id);
      }
      if (onTabPress) {
        onTabPress(tab.id);
      }
    } catch (error) {
      console.error('❌ Error handling tab press:', error);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const isActive = activeRoute === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Icon
                name={tab.icon}
                size={24}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textSecondary }
                ]}
              >
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default BottomNavigation;
