import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';

export default function TermsOfUseScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Icon name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Conditions Générales</Text>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <Text style={styles.title}>Conditions Générales d'Utilisation (CGU)</Text>
                <Text style={styles.lastUpdate}>Dernière mise à jour : 11 janvier 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Objet</Text>
                    <Text style={styles.text}>
                        Les présentes Conditions Générales d'Utilisation (CGU) encadrent contractuellement l'utilisation de l'application Aviprod. Elles définissent les droits et obligations des utilisateurs et de l'éditeur de l'application.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Accès au Service</Text>
                    <Text style={styles.text}>
                        L'application est accessible à tout utilisateur disposant d'un compte. Certains services (IA, analyses avancées) peuvent être soumis à un abonnement payant ou à l'utilisation d'Avicoins.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Responsabilité de l'Utilisateur</Text>
                    <Text style={styles.text}>
                        L'utilisateur est responsable des données qu'il saisit dans l'application (mortalité, consommations, transactions financières). Aviprod est un outil d'aide à la décision et ne remplace pas l'avis d'un expert ou d'un vétérinaire.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Propriété Intellectuelle</Text>
                    <Text style={styles.text}>
                        Tous les éléments de l'application (logos, textes, algorithmes d'IA) sont la propriété exclusive de l'éditeur d'Aviprod. Toute reproduction est strictement interdite.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Monnaie Virtuelle (Avicoins)</Text>
                    <Text style={styles.text}>
                        Les Avicoins acquis ou gagnés via le parrainage ne sont ni remboursables ni échangeables contre de l'argent réel. Ils sont exclusivement destinés à l'utilisation des services premium au sein de l'application.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. Marketplace</Text>
                    <Text style={styles.text}>
                        Aviprod agit comme intermédiaire sur le Marketplace. Les transactions entre vendeurs et acheteurs relèvent de leur responsabilité mutuelle. La vérification KYC est obligatoire pour vendre sur la plateforme.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>7. Modification des CGU</Text>
                    <Text style={styles.text}>
                        L'éditeur se réserve le droit de modifier les présentes CGU à tout moment afin de les adapter aux évolutions de l'application.
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
