import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';

export default function InstallPWAButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        // Détection iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            showButton();
        };

        const showButton = () => {
            setIsVisible(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Sur iOS, on affiche le bouton après 3 secondes car il n'y a pas d'événement "beforeinstallprompt"
        if (ios && !window.matchMedia('(display-mode: standalone)').matches) {
            const timer = setTimeout(showButton, 3000);
            return () => {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
                clearTimeout(timer);
            };
        }

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [fadeAnim]);

    const handleInstallClick = async () => {
        if (isIOS) {
            alert("Pour installer l'app sur iPhone :\n1. Appuyez sur le bouton 'Partager' en bas de Safari.\n2. Faites défiler et appuyez sur 'Sur l'écran d'accueil'.");
            return;
        }

        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible || Platform.OS !== 'web') return null;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <TouchableOpacity
                style={styles.button}
                onPress={handleInstallClick}
                activeOpacity={0.8}
            >
                <Ionicons name="download-outline" size={24} color="#fff" />
                <Text style={styles.text}>Installer l'app</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90, // Juste au-dessus de la barre d'onglets
        right: 20,
        zIndex: 9999,
        elevation: 8,
    },
    button: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 14,
    },
});
