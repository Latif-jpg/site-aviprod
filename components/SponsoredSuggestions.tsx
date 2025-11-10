// components/SponsoredSuggestions.tsx
import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native'
import { colors } from '../styles/commonStyles'

export default function SponsoredSuggestions({ items, onOpenProduct }) {
  if (!items || items.length === 0) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💼 Offres sponsorisées</Text>
        <Text style={styles.subtitle}>Sélectionnées par Aviprod IA</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled>
        {items.map((p) => (
          <TouchableOpacity key={p.id} style={styles.card} onPress={() => onOpenProduct(p)}>
            <Image
              source={{ uri: p.image_url || 'https://via.placeholder.com/150x120?text=Aviprod' }}
              style={styles.image}
            />
            <View style={styles.info}>
              <Text numberOfLines={1} style={styles.name}>{p.name}</Text>
              <Text style={styles.price}>{p.price ? `${p.price} CFA` : '—'}</Text>
              <Text style={styles.zone}>
                {p.zone ? (p.zone === 'Toutes' ? '🌍 National' : `📍 ${p.zone}`) : 'Zone inconnue'}
              </Text>
            </View>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>Sponsorisé</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: { marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary },
  subtitle: { fontSize: 12, color: colors.textSecondary },
  card: {
    width: 160,
    marginRight: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 110,
    backgroundColor: '#eee',
  },
  info: {
    padding: 8,
  },
  name: {
    fontWeight: '600',
    color: colors.text,
    fontSize: 14,
  },
  price: {
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  zone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.orange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
})