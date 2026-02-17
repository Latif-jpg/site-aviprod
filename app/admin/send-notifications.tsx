import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ensureSupabaseInitialized } from '../../config';
import { colors } from '../../styles/commonStyles';
import Button from '../../components/Button';
import { router } from 'expo-router';
import Icon from '../../components/Icon';

export default function SendNotificationsScreen() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('promo'); // promo, info, alert
    const [isSending, setIsSending] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [supabase, setSupabase] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const client = await ensureSupabaseInitialized();
                setSupabase(client);

                const { data: { user } } = await client.auth.getUser();
                if (!user) {
                    setIsAuthorized(false);
                    setAuthLoading(false);
                    return;
                }

                const { data: profile } = await client
                    .from('profiles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();

                if (profile?.role === 'admin') {
                    setIsAuthorized(true);
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                setIsAuthorized(false);
            } finally {
                setAuthLoading(false);
            }
        };
        init();
    }, []);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Erreur', 'Le titre et le message sont requis.');
            return;
        }

        Alert.alert(
            'Confirmer l\'envoi',
            'Êtes-vous sûr de vouloir envoyer cette notification à TOUS les utilisateurs ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Envoyer',
                    onPress: async () => {
                        setIsSending(true);
                        try {
                            // 1. Récupérer tous les IDs utilisateurs
                            const { data: users, error: userError } = await supabase
                                .from('profiles')
                                .select('user_id');

                            if (userError) throw userError;

                            if (!users || users.length === 0) {
                                Alert.alert('Info', 'Aucun utilisateur trouvé.');
                                return;
                            }

                            // 2. Préparer les notifications en masse
                            const notifications = (users || [])
                                .filter((u: any) => u && u.user_id) // SÉCURITÉ : Ignorer les profils sans ID
                                .map((u: any) => ({
                                    user_id: u.user_id,
                                    title: title.trim(),
                                    message: message.trim(),
                                    type: type,
                                    read: false
                                }));

                            if (notifications.length === 0) {
                                Alert.alert('Info', 'Aucun destinataire valide trouvé.');
                                return;
                            }

                            // 3. Insertion en masse dans NOTIFICATIONS (pour le badge et le push)
                            const { error: insertNotifError } = await supabase
                                .from('notifications')
                                .insert(notifications);

                            if (insertNotifError) throw insertNotifError;

                            // 4. Insertion en masse dans MESSAGERIE (Annonce Globale)
                            try {
                                const { data: { user: currentUser } } = await supabase.auth.getUser();
                                if (!currentUser) throw new Error("Admin non connecté");

                                const SYSTEM_PRODUCT_ID = '00000000-0000-0000-0000-000000000000';

                                // Vérifier si le produit système existe, sinon le créer
                                const { data: systemProduct } = await supabase
                                    .from('marketplace_products')
                                    .select('id')
                                    .eq('id', SYSTEM_PRODUCT_ID)
                                    .single();

                                if (!systemProduct) {
                                    const { error: prodError } = await supabase.from('marketplace_products').insert({
                                        id: SYSTEM_PRODUCT_ID,
                                        seller_id: currentUser.id,
                                        name: 'Annonces Aviprod',
                                        description: 'Canal officiel pour les annonces et mises à jour de l\'application.',
                                        price: 0,
                                        category: 'birds',
                                        image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400',
                                        location: 'Système',
                                        city: 'Tout le pays',
                                        region: 'Centre',
                                        in_stock: true
                                    });
                                    if (prodError) throw prodError;
                                }

                                const messagesData = (users || [])
                                    .filter((u: any) => u && u.user_id)
                                    .map((u: any) => ({
                                        product_id: SYSTEM_PRODUCT_ID,
                                        sender_id: currentUser.id,
                                        receiver_id: u.user_id,
                                        message: title.trim() + "\n\n" + message.trim(),
                                        read_at: null
                                    }));

                                const { error: insertMsgError } = await supabase
                                    .from('marketplace_messages')
                                    .insert(messagesData);

                                if (insertMsgError) throw insertMsgError;
                            } catch (err) {
                                console.error("Marketplace broadcast failed:", err);
                                // On ne bloque pas si la messagerie échoue mais les notifs ont réussi
                            }

                            Alert.alert('Succès', `Annonce diffusée à ${users.length} utilisateurs via notifications et messagerie.`);
                            setTitle('');
                            setMessage('');
                        } catch (error: any) {
                            console.error("Failed to send notifications:", error);
                            Alert.alert('Erreur', `Échec de l'envoi : ${error.message}`);
                        } finally {
                            setIsSending(false);
                        }
                    }
                }
            ]
        );
    };

    if (authLoading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 10, color: colors.textSecondary }}>Vérification...</Text>
            </View>
        );
    }

    if (!isAuthorized) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <Icon name="lock-closed" size={64} color={colors.error} />
                <Text style={[styles.title, { color: colors.error, marginTop: 20 }]}>Accès Interdit</Text>
                <Text style={{ textAlign: 'center', paddingHorizontal: 40, color: colors.textSecondary }}>
                    Cette page est réservée aux administrateurs du système.
                </Text>
                <Button text="Retour" onPress={() => router.back()} style={{ marginTop: 20 }} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Annonces Globales</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.infoBox}>
                        <Icon name="information-circle" size={20} color={colors.primary} />
                        <Text style={styles.infoText}>
                            Ce message sera envoyé instantanément à tous les utilisateurs de l'application.
                        </Text>
                    </View>

                    <Text style={styles.label}>Titre de l'annonce</Text>
                    <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundAlt }]}
                        placeholder="Ex: Nouvelle promotion !"
                        placeholderTextColor={colors.textSecondary}
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={styles.label}>Message</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundAlt }]}
                        placeholder="Écrivez votre message ici..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={6}
                        value={message}
                        onChangeText={setMessage}
                    />

                    <Text style={styles.label}>Type de message</Text>
                    <View style={styles.typeSelector}>
                        {['promo', 'info', 'alert'].map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    styles.typeButton,
                                    { borderColor: colors.border },
                                    type === t && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => setType(t)}
                            >
                                <Text style={[
                                    styles.typeButtonText,
                                    { color: colors.textSecondary },
                                    type === t && { color: '#fff' }
                                ]}>
                                    {t.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.spacer} />

                    <Button
                        text="Diffuser maintenant"
                        onPress={handleSend}
                        loading={isSending}
                        disabled={isSending}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: colors.primary + '10',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 13,
        color: colors.primary,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    typeButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    spacer: {
        height: 20,
    }
});
