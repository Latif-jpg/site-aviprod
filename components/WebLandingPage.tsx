import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../styles/commonStyles';
import Icon from './Icon'; // Assurez-vous que ce composant existe ou remplacez par @expo/vector-icons

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const WebLandingPage = () => {
    const router = useRouter();

    const handleDownloadApk = () => {
        // --- À REMPLACER PAR LE LIEN RÉEL DE L'APK ---
        Linking.openURL('https://site-aviprod.vercel.app/download/aviprod.apk');
    };

    const handleLogin = () => {
        router.push('/auth');
    };

    return (
        <View style={styles.container}>
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    {/* Remplacez par votre logo réel */}
                    <Text style={styles.logoText}>🐔 AVIPROD</Text>
                </View>
                <View style={styles.navContainer}>
                    <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
                        <Text style={styles.loginButtonText}>Se connecter</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

                {/* --- HERO SECTION --- */}
                <View style={styles.heroSection}>
                    <View style={styles.heroContent}>
                        <Text style={styles.heroTitle}>Gestion d'Élevage de Volaille <Text style={{ color: colors.primary }}>Intelligente 2.0</Text></Text>
                        <Text style={styles.heroSubtitle}>
                            Optimisez votre production, surveillez la santé de vos volailles et maximisez vos profits grâce à notre assistant IA et nos outils de gestion avancés.
                        </Text>

                        <View style={styles.heroButtons}>
                            <TouchableOpacity onPress={handleDownloadApk} style={styles.downloadButton}>
                                <Icon name="download" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.downloadButtonText}>Télécharger l'APK</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleLogin} style={styles.secondaryButton}>
                                <Text style={styles.secondaryButtonText}>Accéder à la version Web</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.versionText}>Version 1.2.3 • Android & Web</Text>
                    </View>

                    {/* Placeholder pour une image de l'app si disponible */}
                    {/* <Image source={require('../assets/images/app-mockup.png')} style={styles.heroImage} resizeMode="contain" /> */}
                </View>

                {/* --- FEATURES GRID --- */}
                <View style={styles.featuresSection}>
                    <Text style={styles.sectionTitle}>Tout ce dont vous avez besoin</Text>
                    <View style={styles.featuresGrid}>
                        <FeatureCard
                            icon="heart-outline"
                            title="Santé & IA"
                            description="Détection précoce des maladies grâce à l'analyse photo par Intelligence Artificielle."
                        />
                        <FeatureCard
                            icon="cube-outline"
                            title="Gestion de Stock"
                            description="Suivi précis de l'alimentation, des vaccins et des équipements en temps réel."
                        />
                        <FeatureCard
                            icon="cash-outline"
                            title="Finance & Rentabilité"
                            description="Tableaux de bord financiers complets pour analyser vos marges et profits."
                        />
                        <FeatureCard
                            icon="calendar-outline"
                            title="Planification"
                            description="Rappels automatiques pour les vaccins, l'alimentation et les tâches quotidiennes."
                        />
                    </View>
                </View>

                {/* --- FOOTER --- */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2026 Aviprod. Tous droits réservés.</Text>
                    <View style={styles.footerLinks}>
                        <TouchableOpacity onPress={() => router.push('/privacy-policy')}><Text style={styles.footerLink}>Confidentialité</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL('mailto:contact@aviprod.com')}><Text style={styles.footerLink}>Contact</Text></TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

const FeatureCard = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
    <View style={styles.featureCard}>
        <View style={styles.featureIconContainer}>
            <Icon name={icon} size={30} color={colors.primary} />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: isMobile ? 20 : 50,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
        zIndex: 10,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },
    navContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginButton: {
        backgroundColor: colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    loginButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    heroSection: {
        paddingHorizontal: isMobile ? 20 : 50,
        paddingVertical: 60,
        alignItems: 'center',
        backgroundColor: '#f9fafb', // Léger gris pour distinguer
    },
    heroContent: {
        maxWidth: 800,
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: isMobile ? 36 : 56,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: isMobile ? 44 : 64,
        color: '#1f2937',
    },
    heroSubtitle: {
        fontSize: isMobile ? 18 : 20,
        textAlign: 'center',
        color: '#6b7280',
        marginBottom: 40,
        lineHeight: 30,
    },
    heroButtons: {
        flexDirection: isMobile ? 'column' : 'row',
        gap: 16,
        marginBottom: 20,
        width: '100%',
        justifyContent: 'center',
    },
    downloadButton: {
        flexDirection: 'row',
        backgroundColor: colors.secondary || '#10b981', // Vert émeraude ou couleur secondaire
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    downloadButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    secondaryButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#fff',
    },
    secondaryButtonText: {
        color: '#374151',
        fontSize: 18,
        fontWeight: '600',
    },
    versionText: {
        marginTop: 16,
        color: '#9ca3af',
        fontSize: 14,
    },
    featuresSection: {
        paddingHorizontal: isMobile ? 20 : 50,
        paddingVertical: 60,
        backgroundColor: '#fff',
    },
    sectionTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 50,
        color: '#1f2937',
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 30,
    },
    featureCard: {
        width: isMobile ? '100%' : '22%', // 4 par ligne sur desktop
        minWidth: 250,
        padding: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'flex-start',
    },
    featureIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: colors.primary + '10', // Opacité
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    featureTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
        color: '#1f2937',
    },
    featureDescription: {
        fontSize: 16,
        color: '#6b7280',
        lineHeight: 24,
    },
    footer: {
        paddingHorizontal: isMobile ? 20 : 50,
        paddingVertical: 40,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20,
    },
    footerText: {
        color: '#9ca3af',
    },
    footerLinks: {
        flexDirection: 'row',
        gap: 24,
    },
    footerLink: {
        color: '#4b5563',
        fontWeight: '500',
    },
});

export default WebLandingPage;
