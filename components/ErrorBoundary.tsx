
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 Error Boundary caught an error:', error);
    console.error('📋 Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <Icon name="alert-circle" size={64} color={colors.error} />
            </View>
            
            <Text style={styles.title}>Oups! Une erreur est survenue</Text>
            
            <Text style={styles.subtitle}>
              L&apos;application a rencontré un problème inattendu.
            </Text>

            {this.state.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Détails de l&apos;erreur:</Text>
                <Text style={styles.errorMessage}>
                  {this.state.error.toString()}
                </Text>
                
                {this.state.error.stack && (
                  <View style={styles.stackContainer}>
                    <Text style={styles.stackTitle}>Stack Trace:</Text>
                    <Text style={styles.stackText}>
                      {this.state.error.stack}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.helpContainer}>
              <Text style={styles.helpTitle}>💡 Que faire?</Text>
              <Text style={styles.helpText}>
                - Essayez de réessayer en cliquant sur le bouton ci-dessous{'\n'}
                - Vérifiez votre connexion internet{'\n'}
                - Redémarrez l&apos;application{'\n'}
                - Si le problème persiste, contactez le support
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.resetButton}
              onPress={this.handleReset}
            >
              <Icon name="refresh" size={20} color={colors.backgroundAlt} />
              <Text style={styles.resetButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: colors.error + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  stackContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  stackTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  stackText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  helpContainer: {
    width: '100%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
});
