// src/components/intelligence/IntelligentAlertDisplay.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useAlerts } from '../../contexts/UniversalIntelligenceContext';
import { Ionicons } from '@expo/vector-icons';

/**
 * COMPOSANT D'AFFICHAGE INTELLIGENT DES ALERTES
 *
 * - Priorisation visuelle par sévérité
 * - Actions rapides intégrées
 * - Feedback utilisateur (rating)
 * - Animation et interactivité
 */

interface Props {
  maxDisplayed?: number;
  showDismissed?: boolean;
  filterSeverity?: string[];
  compact?: boolean;
}

export const IntelligentAlertDisplay: React.FC<Props> = ({
  maxDisplayed = 5,
  showDismissed = false,
  filterSeverity,
  compact = false,
}) => {
  const {
    alerts,
    criticalAlerts,
    unreadAlertsCount,
    markAlertAsViewed,
    markAlertAsDismissed,
    markAlertActionTaken,
    rateAlert,
  } = useAlerts();

  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [showRating, setShowRating] = useState<string | null>(null);

  // Filtrer les alertes
  let displayedAlerts = showDismissed
    ? alerts
    : alerts.filter(a => a.status !== 'dismissed');

  if (filterSeverity && filterSeverity.length > 0) {
    displayedAlerts = displayedAlerts.filter(a => filterSeverity.includes(a.severity));
  }

  displayedAlerts = displayedAlerts.slice(0, maxDisplayed);

  // Couleurs par sévérité
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'urgent': return '#F59E0B';
      case 'warning': return '#EAB308';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return 'alert-circle';
      case 'urgent': return 'warning';
      case 'warning': return 'alert';
      case 'info': return 'information-circle';
      default: return 'help-circle';
    }
  };

  // Handlers
  const handleAlertPress = async (alertId: string) => {
    if (expandedAlertId === alertId) {
      setExpandedAlertId(null);
    } else {
      setExpandedAlertId(alertId);
      await markAlertAsViewed(alertId);
    }
  };

  const handleDismiss = async (alertId: string) => {
    await markAlertAsDismissed(alertId);
    if (expandedAlertId === alertId) {
      setExpandedAlertId(null);
    }
  };

  const handleActionTaken = async (alertId: string, action: string) => {
    await markAlertActionTaken(alertId, action);
    setShowRating(alertId);
  };

  const handleRating = async (alertId: string, rating: number) => {
    await rateAlert(alertId, rating);
    setShowRating(null);
    if (expandedAlertId === alertId) {
      setExpandedAlertId(null);
    }
  };

  if (displayedAlerts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        <Text style={styles.emptyText}>Aucune alerte active</Text>
        <Text style={styles.emptySubtext}>Tout va bien ! 🎉</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      {!compact && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="notifications" size={24} color="#1F2937" />
            <Text style={styles.headerTitle}>Alertes Intelligentes</Text>
          </View>
          {unreadAlertsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadAlertsCount}</Text>
            </View>
          )}
        </View>
      )}

      {/* Liste des alertes critiques en priorité */}
      {criticalAlerts.length > 0 && !compact && (
        <View style={styles.criticalSection}>
          <Text style={styles.criticalHeader}>
            ⚠️ {criticalAlerts.length} Alerte(s) Critique(s)
          </Text>
        </View>
      )}

      {/* Liste des alertes */}
      <ScrollView
        style={styles.alertsList}
        showsVerticalScrollIndicator={false}
      >
        {displayedAlerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            style={[
              styles.alertCard,
              { borderLeftColor: getSeverityColor(alert.severity) },
              expandedAlertId === alert.id && styles.alertCardExpanded,
              !alert.viewed_at && styles.alertCardUnread,
            ]}
            onPress={() => handleAlertPress(alert.id)}
            activeOpacity={0.7}
          >
            {/* En-tête de l'alerte */}
            <View style={styles.alertHeader}>
              <View style={styles.alertHeaderLeft}>
                <Ionicons
                  name={getSeverityIcon(alert.severity) as any}
                  size={24}
                  color={getSeverityColor(alert.severity)}
                />
                <View style={styles.alertHeaderText}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertTime}>
                    {getRelativeTime(alert.created_at)}
                  </Text>
                </View>
              </View>

              {!alert.viewed_at && (
                <View style={styles.unreadDot} />
              )}
            </View>

            {/* Message (toujours visible en mode compact, sinon en détails) */}
            {(compact || expandedAlertId === alert.id) && (
              <Text style={styles.alertMessage}>{alert.message}</Text>
            )}

            {/* Détails étendus */}
            {expandedAlertId === alert.id && (
              <View style={styles.alertDetails}>
                {/* Recommandations */}
                {alert.recommendations && alert.recommendations.length > 0 && (
                  <View style={styles.recommendations}>
                    <Text style={styles.recommendationsTitle}>
                      Actions Recommandées:
                    </Text>
                    {alert.recommendations.map((reco: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.recommendationItem}
                        onPress={() => handleActionTaken(alert.id, reco.action)}
                      >
                        <View style={styles.recommendationNumber}>
                          <Text style={styles.recommendationNumberText}>
                            {reco.priority || index + 1}
                          </Text>
                        </View>
                        <View style={styles.recommendationContent}>
                          <Text style={styles.recommendationAction}>
                            {reco.action}
                          </Text>
                          <Text style={styles.recommendationDescription}>
                            {reco.description}
                          </Text>
                          {reco.estimatedImpact && (
                            <Text style={styles.recommendationImpact}>
                              💡 {reco.estimatedImpact}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Notation (après action) */}
                {showRating === alert.id && (
                  <View style={styles.ratingSection}>
                    <Text style={styles.ratingTitle}>
                      Cette alerte vous a-t-elle été utile ?
                    </Text>
                    <View style={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => handleRating(alert.id, star)}
                        >
                          <Ionicons
                            name="star"
                            size={32}
                            color="#FBBF24"
                            style={styles.ratingStar}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.alertActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonSecondary]}
                    onPress={() => handleDismiss(alert.id)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#6B7280" />
                    <Text style={styles.actionButtonSecondaryText}>Ignorer</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={() => markAlertActionTaken(alert.id, 'manual_action')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonPrimaryText}>Traité</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer avec stats */}
      {!compact && alerts.length > maxDisplayed && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            +{alerts.length - maxDisplayed} autres alertes
          </Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Helper pour temps relatif
const getRelativeTime = (timestamp: string): string => {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  return `Il y a ${days} jours`;
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  badge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Critical section
  criticalSection: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  criticalHeader: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
  },

  // Alerts list
  alertsList: {
    flex: 1,
    padding: 16,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertCardExpanded: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  alertCardUnread: {
    backgroundColor: '#F0F9FF',
  },

  // Alert header
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  alertHeaderText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  alertMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 12,
    lineHeight: 20,
  },

  // Alert details
  alertDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  // Recommendations
  recommendations: {
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  recommendationImpact: {
    fontSize: 12,
    color: '#059669',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Rating
  ratingSection: {
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginBottom: 16,
  },
  ratingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ratingStar: {
    marginHorizontal: 4,
  },

  // Actions
  alertActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#3B82F6',
  },
  actionButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonSecondaryText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
});