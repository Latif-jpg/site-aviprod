import React, { useState, useEffect } from 'react';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { Platform, View, Text as RNText, StyleSheet, TouchableOpacity } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import Icon from './Icon';

const BANNER_AD_UNIT_ID = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: 'ca-app-pub-5111525667900751/8779446985',
        android: 'ca-app-pub-5111525667900751/8779446985',
    });

// Gestion du cooldown global de 5 minutes
let globalHiddenUntil = 0;

export default function GoogleAdBanner() {
    const [isVisible, setIsVisible] = useState(Date.now() > globalHiddenUntil);

    useEffect(() => {
        console.log('🎯 [Banner] GoogleAdBanner mounted.');
        mobileAds().initialize().then(() => console.log('✅ [Banner] AdMob status confirmed.'));

        // Vérification périodique (facultative mais utile si l'utilisateur reste sur le même écran)
        const interval = setInterval(() => {
            if (!isVisible && Date.now() > globalHiddenUntil) {
                setIsVisible(true);
            }
        }, 10000); // Toutes les 10 secondes

        return () => clearInterval(interval);
    }, [isVisible]);

    const handleDismiss = () => {
        const threeMinutes = 3 * 60 * 1000;
        globalHiddenUntil = Date.now() + threeMinutes;
        setIsVisible(false);
        console.log('🚫 [Banner] Publicité masquée pour 3 minutes.');
    };

    if (!isVisible) return null;

    console.log('🎯 GoogleAdBanner rendering with ID:', BANNER_AD_UNIT_ID);

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
                <Icon name="close-circle" size={20} color="#666" />
            </TouchableOpacity>

            <RNText style={styles.statusText}>Chargement de la publicité...</RNText>
            <BannerAd
                unitId={BANNER_AD_UNIT_ID!}
                size={BannerAdSize.BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: false,
                }}
                onAdLoaded={() => {
                    console.log('✅ Banner ad loaded successfully');
                }}
                onAdFailedToLoad={(error) => {
                    console.error('❌ Banner ad failed to load:', error);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e0e0e0',
        paddingVertical: 10,
        minHeight: 70,
        borderWidth: 1,
        borderColor: '#ccc',
        marginHorizontal: 10,
        borderRadius: 8,
        marginVertical: 5,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 12,
        zIndex: 10,
        elevation: 2,
    },
    statusText: {
        fontSize: 10,
        color: '#666',
        marginBottom: 5,
    },
});