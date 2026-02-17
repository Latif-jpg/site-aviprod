import { useEffect, useRef } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IDs de test pour le développement
const INTERSTITIAL_AD_UNIT_ID = __DEV__
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: 'ca-app-pub-5111525667900751/8396287694',
        android: 'ca-app-pub-5111525667900751/8396287694',
    });

const INTERSTITIAL_COOLDOWN_KEY = 'last_interstitial_shown';
const COOLDOWN_MINUTES = 5; // Minimum 5 minutes entre chaque interstitiel

export const useInterstitialAd = () => {
    const interstitialRef = useRef<InterstitialAd | null>(null);

    useEffect(() => {
        const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID!, {
            requestNonPersonalizedAdsOnly: false,
        });

        const loadedListener = interstitial.addAdEventListener(AdEventType.LOADED, () => {
            console.log('Interstitial ad loaded');
        });

        const closedListener = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            console.log('Interstitial ad closed');
            // Recharger une nouvelle pub pour la prochaine fois
            interstitial.load();
        });

        interstitialRef.current = interstitial;
        interstitial.load();

        return () => {
            loadedListener();
            closedListener();
        };
    }, []);

    const showInterstitial = async () => {
        try {
            // Vérifier le cooldown
            const lastShown = await AsyncStorage.getItem(INTERSTITIAL_COOLDOWN_KEY);
            if (lastShown) {
                const timeSinceLastShown = Date.now() - parseInt(lastShown, 10);
                const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;

                if (timeSinceLastShown < cooldownMs) {
                    console.log('Interstitial ad on cooldown');
                    return;
                }
            }

            // Afficher la pub si elle est chargée
            if (interstitialRef.current?.loaded) {
                await interstitialRef.current.show();
                await AsyncStorage.setItem(INTERSTITIAL_COOLDOWN_KEY, Date.now().toString());
            }
        } catch (error) {
            console.error('Error showing interstitial ad:', error);
        }
    };

    return { showInterstitial };
};
