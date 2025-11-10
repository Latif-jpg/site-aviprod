import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import FinancialDashboard from '../src/components/finance/FinancialDashboard';
import { colors } from '../styles/commonStyles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default function FinancialDashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <FinancialDashboard />
    </SafeAreaView>
  );
}
