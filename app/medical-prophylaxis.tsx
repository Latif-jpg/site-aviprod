import React from 'react';
import { SafeAreaView, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from '../components/Icon';
import MedicalProphylaxisPlan from '../components/health/MedicalProphylaxisPlan';
import { colors } from '../styles/commonStyles';

export default function MedicalProphylaxisPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Prophylaxie Médicale</Text>
        <View style={{ width: 40 }} />
      </View>

      <MedicalProphylaxisPlan onClose={() => router.back()} onAddVaccination={() => { /* handled inside component */ }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { width: 40, alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
});
