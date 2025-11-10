
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/commonStyles';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { useTheme } from '../contexts/ThemeContext';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    gap: 8,
  },
  themeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  themeOptionTextSelected: {
    color: colors.white,
  },
  quickToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  quickToggleText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.backgroundAlt,
    color: colors.text,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.accentSecondary + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.accentSecondary,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accentSecondary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 16,
  },
  testButton: {
    backgroundColor: colors.accentSecondary,
  },
});

export default function SettingsScreen() {
  const { theme, setThemeType, toggleTheme } = useTheme();


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎨 Thème de l'Application</Text>
            <Text style={styles.sectionDescription}>
              Choisissez votre thème préféré pour l'application.
            </Text>

            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  theme.type === 'light' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeType('light')}
              >
                <Icon name="sunny" size={24} color={theme.type === 'light' ? colors.white : colors.primary} />
                <Text style={[
                  styles.themeOptionText,
                  theme.type === 'light' && styles.themeOptionTextSelected
                ]}>
                  Clair
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  theme.type === 'dark' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeType('dark')}
              >
                <Icon name="moon" size={24} color={theme.type === 'dark' ? colors.white : colors.primary} />
                <Text style={[
                  styles.themeOptionText,
                  theme.type === 'dark' && styles.themeOptionTextSelected
                ]}>
                  Sombre
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  theme.type === 'system' && styles.themeOptionSelected
                ]}
                onPress={() => setThemeType('system')}
              >
                <Icon name="phone-portrait" size={24} color={theme.type === 'system' ? colors.white : colors.primary} />
                <Text style={[
                  styles.themeOptionText,
                  theme.type === 'system' && styles.themeOptionTextSelected
                ]}>
                  Système
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.quickToggle}
              onPress={toggleTheme}
            >
              <Icon name={theme.isDark ? "sunny" : "moon"} size={20} color={colors.primary} />
              <Text style={styles.quickToggleText}>
                Basculer vers {theme.isDark ? 'clair' : 'sombre'}
              </Text>
              <Icon name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ℹ️ À Propos</Text>
            <Text style={styles.sectionDescription}>
              AviprodApp v1.0.0{'\n'}
              Application de gestion de ferme avicole{'\n'}
              © 2025 Tous droits réservés
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
