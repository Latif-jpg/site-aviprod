import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import { router } from 'expo-router';
import { useRewardedAd } from './AdRewarded';

interface SmartTunnelModalProps {
    isVisible: boolean;
    onClose: () => void;
    featureName: string;
    requiredAvicoins: number;
    currentAvicoins: number;
    onAdRewarded?: () => void;
}

export default function SmartTunnelModal({
    isVisible,
    onClose,
    featureName,
    requiredAvicoins,
    currentAvicoins,
    onAdRewarded
}: SmartTunnelModalProps) {
    const missingAvicoins = Math.max(0, requiredAvicoins - currentAvicoins);
    const { showRewardedAd, adLoading, adLoaded } = useRewardedAd();

    const handleWatchAd = async () => {
        const success = await showRewardedAd();
        if (success && onAdRewarded) {
            onAdRewarded();
            // On ne ferme pas forcément la modal tout de suite si l'utilisateur a encore besoin de pièces
        }
    };

    const handleBuyPacks = () => {
        onClose();
        router.push('/subscription-plans');
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Icon name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Icon name="flash" size={40} color={colors.warning} />
                        </View>

                        <Text style={styles.title}>Avicoins insuffisants</Text>

                        <View style={styles.missingContainer}>
                            <Text style={styles.missingText}>
                                Il vous manque <Text style={styles.highlight}>{missingAvicoins} Avicoins</Text> pour utiliser "{featureName}".
                            </Text>
                        </View>

                        <Text style={styles.subtitle}>
                            Votre solde actuel : {currentAvicoins} 🪙
                        </Text>

                        <View style={styles.buttonStack}>
                            <TouchableOpacity
                                style={[styles.optionButton, styles.adButton, adLoading && styles.disabledButton]}
                                onPress={handleWatchAd}
                                disabled={adLoading}
                            >
                                <View style={styles.buttonIcon}>
                                    {adLoading ? (
                                        <ActivityIndicator size="small" color={colors.white} />
                                    ) : (
                                        <Icon name="play-circle" size={24} color={colors.white} />
                                    )}
                                </View>
                                <View style={styles.buttonTextContent}>
                                    <Text style={styles.buttonTitle}>Regarder une vidéo</Text>
                                    <Text style={styles.buttonSubtitle}>Gagnez 2 Avicoins gratuitement</Text>
                                </View>
                                <Icon name="chevron-forward" size={20} color={colors.white} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.optionButton, styles.buyButton]} onPress={handleBuyPacks}>
                                <View style={styles.buttonIcon}>
                                    <Icon name="cart" size={24} color={colors.white} />
                                </View>
                                <View style={styles.buttonTextContent}>
                                    <Text style={styles.buttonTitle}>Acheter un pack</Text>
                                    <Text style={styles.buttonSubtitle}>Accès immédiat et sans limites</Text>
                                </View>
                                <Icon name="chevron-forward" size={20} color={colors.white} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={onClose} style={styles.cancelLink}>
                            <Text style={styles.cancelLinkText}>Plus tard</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: 24,
        padding: 24,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
    },
    content: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.warning + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    missingContainer: {
        backgroundColor: colors.error + '10',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 12,
    },
    missingText: {
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
    },
    highlight: {
        fontWeight: 'bold',
        color: colors.error,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 24,
    },
    buttonStack: {
        width: '100%',
        gap: 12,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        width: '100%',
    },
    adButton: {
        backgroundColor: colors.primary,
    },
    buyButton: {
        backgroundColor: colors.success,
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    buttonTextContent: {
        flex: 1,
    },
    buttonTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.white,
    },
    buttonSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    cancelLink: {
        marginTop: 20,
        padding: 10,
    },
    cancelLinkText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '500',
    },
});
