// components/LiveAIRecommendations.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../styles/commonStyles';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons

type Rec = { text: string; productId?: string };

export default function LiveAIRecommendations({
  result,
  onApply,
  onOrder
}: {
  result: {
    riskScore?:number;
    level?:string;
    causes?:string[];
    recommendations?:Rec[];
    mortalityPct?:number;
    consumptionChangePct?:number;
    stockPercent?:number;
    rationCoverage?:number;
    consumptionChangeReason?: 'low_ration' | 'low_stock' | 'low_profit' | 'good' | 'normal' | null;
  } | null,
  onApply?: (rec:Rec)=>void,
  onOrder?: (productId?:string)=>void
}) {
  if (!result) return null;
  const {
    riskScore = 0,
    level = 'ok',
    causes = [],
    recommendations = [],
    mortalityPct,
    consumptionChangePct,
    stockPercent,
    rationCoverage,
    consumptionChangeReason
  } = result;
  const levelColor = level === 'critical' ? colors.danger : level === 'warning' ? colors.orange : colors.success;

  const getConsumptionReasonText = (reason: typeof consumptionChangeReason) => {
    switch (reason) {
      case 'low_ration': return '(Rations faibles)';
      case 'low_stock': return '(Stock faible)';
      case 'low_profit': return '(Marge faible)';
      case 'good': return '(Optimal)';
      case 'normal': return '(Normal)';
      default: return '';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Suivi de Performance</Text>
        <View style={[styles.badge, { backgroundColor: levelColor }]}>
          <Text style={styles.badgeText}>{riskScore}% Risque</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Mortalité</Text>
          <Text style={styles.metricValue}>{mortalityPct?.toFixed(1) || '0.0'}%</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Consommation</Text>
          <Text style={[styles.metricValue, { color: consumptionChangePct && consumptionChangePct < 0 ? colors.danger : colors.success }]}>
            {consumptionChangePct && consumptionChangePct > 0 ? '+' : ''}{consumptionChangePct || 0}%
          </Text>
          <Text style={styles.metricContext}>
            {getConsumptionReasonText(consumptionChangeReason)}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Stock</Text>
          <Text style={styles.metricValue}>{stockPercent?.toFixed(0) || '0'}%</Text>
        </View>
      </View>

      <Text style={styles.causesTitle}>🔍 Causes identifiées:</Text>
      <View style={styles.causesList}>
        {causes.length === 0 ? (
          <Text style={styles.noCauses}>✅ Aucune anomalie détectée</Text>
        ) : (
          causes.map((cause, i) => (
            <Text key={i} style={styles.causeText}>• {cause}</Text>
          ))
        )}
      </View>

      <Text style={styles.recTitle}>💡 Recommandations:</Text>
      <View style={{marginTop:8}}>
        {recommendations.length === 0 && <Text style={styles.noRec}>✅ Aucune action requise</Text>}
        {recommendations.map((r, i) => (
          <View key={i} style={styles.recRow}>
            <Text style={styles.recText}>• {r.text}</Text>
            {r.productId ? (
              <TouchableOpacity style={styles.orderBtn} onPress={() => onOrder?.(r.productId)}>
                <Ionicons name="cart-outline" size={16} color="#fff" />
                <Text style={styles.orderBtnText}>Commander</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.applyBtn} onPress={() => onApply?.(r)}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.applyBtnText}>Planifier</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 5,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricContext: {
    fontSize: 10,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  causesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 10,
  },
  causesList: {
    marginBottom: 15,
  },
  causeText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
    lineHeight: 18,
  },
  noCauses: {
    fontSize: 13,
    color: colors.success,
    fontStyle: 'italic',
    paddingVertical: 5,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 10,
  },
  noRec: {
    color: colors.success,
    fontStyle: 'italic',
    fontSize: 13,
    paddingVertical: 5,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recText: {
    flex: 1,
    color: '#4B5563',
    marginRight: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  orderBtn: {
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 5,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 5,
  },
});