import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';

export default function PrivacyPolicyScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Icon name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confidentialité</Text>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <Text style={styles.title}>Politique de Confidentialité</Text>
                <Text style={styles.lastUpdate}>Dernière mise à jour : 11 janvier 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Collecte des Données</Text>
                    <Text style={styles.text}>
                        Aviprod collecte les informations nécessaires au bon fonctionnement de l'élevage : données des lots, inventaires, transactions financières et informations de profil. Nous utilisons également des photos téléchargées pour l'analyse IA de santé.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Utilisation des Données</Text>
                    <Text style={styles.text}>
                        Vos données sont utilisées exclusivement pour vous fournir des analyses personnalisées, gérer votre marketplace, et améliorer l'intelligence artificielle de l'application.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Stockage et Sécurité</Text>
                    <Text style={styles.text}>
                        Les données sont stockées de manière sécurisée (via Supabase). Nous mettons en œuvre des mesures de sécurité rigoureuses pour protéger vos informations contre tout accès non autorisé.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Partage des Données</Text>
                    <Text style={styles.text}>
                        Aviprod ne vend jamais vos données personnelles à des tiers. Vos informations de vente sur le Marketplace ne sont visibles que par les acheteurs potentiels.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Vos Droits</Text>
                    <Text style={styles.text}>
                        Conformément aux réglementations sur la protection des données, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Vous pouvez exercer ces droits depuis les paramètres de votre compte ou en nous contactant.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. Cookies et Suivi</Text>
                    <Text style={styles.text}>
                        Nous utilisons des technologies de suivi minimales pour maintenir votre session active et collecter des statistiques d'utilisation anonymes afin d'améliorer l'application.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>7. Contact</Text>
                    <Text style={styles.text}>
                        Pour toute question concernant votre confidentialité, vous pouvez contacter notre équipe de support via la section "Aide & Support".
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
        marginBottom: 8,
    },
    lastUpdate: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 24,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 10,
    },
    text: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 22,
        textAlign: 'justify',
    },
});
