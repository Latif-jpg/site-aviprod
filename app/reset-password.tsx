import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useURL } from 'expo-linking';
import { supabase } from '../config';
import Button from '../components/Button';
import { colors } from '../styles/commonStyles';

export default function ResetPasswordScreen() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSessionValid, setIsSessionValid] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const url = useURL();

    useEffect(() => {
        const handleSession = async () => {
            try {
                setCheckingSession(true);
                // 1. Vérifier si une session est déjà active (cas idéal)
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setIsSessionValid(true);
                    setCheckingSession(false);
                    return;
                }

                // 2. Sinon, essayer de récupérer les tokens depuis l'URL (Deep Link)
                if (url) {
                    // Parsing manuel plus robuste pour React Native (Regex)
                    const params: { [key: string]: string } = {};
                    const regex = /[?&#]([^=#]+)=([^&#]*)/g;
                    let match;
                    while ((match = regex.exec(url))) {
                        params[match[1]] = decodeURIComponent(match[2]);
                    }

                    const accessToken = params['access_token'];
                    const refreshToken = params['refresh_token'];

                    if (accessToken && refreshToken) {
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });

                        if (!error) {
                            setIsSessionValid(true);
                        } else {
                            console.error("Erreur setSession:", error);
                            Alert.alert("Lien expiré", "Le lien de réinitialisation est invalide ou a expiré.");
                        }
                    }
                }
            } catch (e) {
                console.error("Erreur parsing URL:", e);
            } finally {
                setCheckingSession(false);
            }
        };

        handleSession();
    }, [url]);

    const handleUpdatePassword = async () => {
        if (password.length < 6) {
            Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
            return;
        }

        if (!isSessionValid) {
            Alert.alert('Erreur', 'Session expirée ou manquante. Veuillez redemander un lien de réinitialisation.');
            return;
        }

        setLoading(true);
        try {
            // updateUser nécessite une session active, que nous avons restaurée ci-dessus
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            Alert.alert('Succès', 'Votre mot de passe a été mis à jour avec succès.', [
                { text: 'OK', onPress: () => router.replace('/dashboard') }
            ]);
        } catch (error: any) {
            Alert.alert('Erreur', error.message || "Impossible de mettre à jour le mot de passe.");
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 20, color: colors.textSecondary }}>Vérification du lien...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Réinitialisation</Text>
                <Text style={styles.subtitle}>Créez votre nouveau mot de passe</Text>

                <View style={styles.form}>
                    <Text style={styles.label}>Nouveau mot de passe</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        editable={!loading}
                    />

                    <Text style={styles.label}>Confirmer le mot de passe</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        editable={!loading}
                    />

                    <Button
                        title={loading ? "Mise à jour..." : "Valider le nouveau mot de passe"}
                        onPress={handleUpdatePassword}
                        disabled={loading || !isSessionValid}
                        style={{ marginTop: 20 }}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        justifyContent: 'center',
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 30,
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: colors.backgroundAlt,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
});