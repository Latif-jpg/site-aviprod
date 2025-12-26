import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Switch, Alert, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; // Keep for launchImageLibraryAsync
import { MediaTypeOptions } from 'expo-image-picker'; // Explicitly import MediaTypeOptions
import { SafeAreaView } from 'react-native-safe-area-context';
import { ensureSupabaseInitialized } from '../../config';
import { colors } from '../../styles/commonStyles';
import Button from '../../components/Button';
import { router } from 'expo-router'; // Import router for navigation
import Icon from '../../components/Icon'; // Assuming Icon component exists
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

// Simplified type for this screen
interface Ad {
    id?: string;
    title: string;
    subtitle: string;
    image_url: string;
    target_url: string;
    is_enabled: boolean;
}

export default function ManageAdsScreen() {
    const [ads, setAds] = useState<Ad[]>([]);
    const [form, setForm] = useState<Ad>({ title: '', subtitle: '', image_url: '', target_url: '', is_enabled: true });
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [supabase, setSupabase] = useState<any>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const initSupabase = async () => {
            try {
                const client = await ensureSupabaseInitialized();
                setSupabase(client);
            } catch (error) {
                console.error("Failed to initialize Supabase client:", error);
                Alert.alert('Erreur', 'Impossible d\'initialiser le client Supabase.');
                setSupabase(null); // Ensure it's explicitly null on error
            }
        };
        initSupabase();
    }, []);

    useEffect(() => {
        if (!supabase) return;

        const checkAdmin = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsAuthorized(false);
                    setAuthLoading(false);
                    return;
                }
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();

                if (profile?.role === 'admin') {
                    setIsAuthorized(true);
                }
            } catch (error) {
                console.error("Authorization check failed:", error);
                setIsAuthorized(false);
            } finally {
                setAuthLoading(false);
            }
        };
        checkAdmin();
    }, [supabase]);

    useEffect(() => {
        if (supabase && isAuthorized) {
            fetchAds();
        }
    }, [supabase, isAuthorized]);

    const fetchAds = async () => {
        if (!supabase) return;
        setIsLoading(true);
        const { data, error } = await supabase.from('advertisements').select('*').order('created_at');
        if (error) {
            Alert.alert('Erreur', 'Impossible de charger les annonces.');
            console.error(error);
        } else {
            setAds(data as Ad[]);
        }
        setIsLoading(false);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Désolé', 'Nous avons besoin des permissions de la galerie pour que cela fonctionne.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({

            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            const image = result.assets[0];
            await uploadImage(image.uri);
        }
    };

    const uploadImage = async (uri: string) => {
        if (!supabase) return;
        try {
            setUploading(true);

            const fileExt = uri.split('.').pop() || 'jpg';
            const contentType = `image/${fileExt}`;
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const arrayBuffer = decode(base64);

            let { error: uploadError } = await supabase.storage
                .from('advertisements')
                .upload(filePath, arrayBuffer, {
                    contentType: contentType,
                    upsert: false
                });

            if (uploadError) {
                throw uploadError;
            }

            // Stocker uniquement le chemin du fichier (path) au lieu de l'URL publique complète
            handleInputChange('image_url', filePath);

        } catch (error: any) {
            Alert.alert('Erreur de téléchargement', error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleInputChange = (field: keyof Ad, value: string | boolean) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!supabase) return;
        if (!form.title || !form.image_url) {
            Alert.alert('Erreur', "Le titre et l'URL de l'image sont requis.");
            return;
        }

        setIsLoading(true);
        const { error } = isEditing
            ? await supabase.from('advertisements').update({ ...form, id: undefined }).eq('id', isEditing)
            : await supabase.from('advertisements').insert(form);

        if (error) {
            Alert.alert('Erreur', `Impossible de sauvegarder l'annonce: ${error.message}`);
        } else {
            Alert.alert('Succès', `Annonce ${isEditing ? 'mise à jour' : 'créée'} avec succès.`);
            setForm({ title: '', subtitle: '', image_url: '', target_url: '', is_enabled: true });
            setIsEditing(null);
            await fetchAds();
        }
        setIsLoading(false);
    };

    const handleEdit = (ad: Ad) => {
        setIsEditing(ad.id!);
        setForm(ad);
    };

    const handleDelete = async (id: string) => {
        if (!supabase) return;
        Alert.alert(
            'Confirmer la suppression',
            'Êtes-vous sûr de vouloir supprimer cette annonce ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('advertisements').delete().eq('id', id);
                        if (error) {
                            Alert.alert('Erreur', "Impossible de supprimer l'annonce.");
                        } else {
                            await fetchAds();
                        }
                    },
                },
            ]
        );
    };

    if (authLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator />
                <Text style={{ color: colors.text }}>Vérification de l'autorisation...</Text>
            </SafeAreaView>
        );
    }

    if (!isAuthorized) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={[styles.title, { color: colors.orange }]}>Accès Refusé</Text>
                <Text style={{ color: colors.textSecondary }}>Vous n'avez pas les droits nécessaires pour accéder à cette page.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <ScrollView>
                <View style={styles.formContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>{isEditing ? 'Modifier' : 'Ajouter'} une annonce</Text>
                    <Text style={[styles.label, { color: colors.text }]}>Titre *</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}
                        placeholder="Titre"
                        placeholderTextColor={colors.textSecondary}
                        value={form.title}
                        onChangeText={(v) => handleInputChange('title', v)}
                    />
                    <Text style={[styles.label, { color: colors.text }]}>Sous-titre</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}
                        placeholder="Sous-titre"
                        placeholderTextColor={colors.textSecondary}
                        value={form.subtitle}
                        onChangeText={(v) => handleInputChange('subtitle', v)}
                    />
                    <Text style={[styles.label, { color: colors.text }]}>Image *</Text>
                    <TouchableOpacity style={styles.imageUploader} onPress={pickImage} disabled={!supabase || uploading}>
                        {form.image_url && supabase ? (
                            <Image
                                source={{
                                    uri: form.image_url.startsWith('http')
                                        ? form.image_url
                                        : supabase.storage.from('advertisements').getPublicUrl(form.image_url).data.publicUrl
                                }}
                                style={styles.previewImage} />
                        ) : (
                            <View style={[styles.imagePlaceholder, { borderColor: colors.border }]}>
                                {uploading ? (
                                    <ActivityIndicator color={colors.primary} />
                                ) : (
                                    <Text style={{ color: colors.textSecondary }}>Cliquer pour ajouter une image</Text>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: colors.text }]}>URL Cible</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundAlt }]}
                        placeholder="URL Cible (Optionnel)"
                        placeholderTextColor={colors.textSecondary}
                        value={form.target_url}
                        onChangeText={(v) => handleInputChange('target_url', v)}
                        autoCapitalize="none"
                        keyboardType="url"
                    />
                    <View style={styles.switchContainer}>
                        <Text style={{ color: colors.text }}>Activée</Text>
                        <Switch value={form.is_enabled} onValueChange={(v) => handleInputChange('is_enabled', v)} />
                    </View>
                    <Button text={isEditing ? 'Mettre à jour' : 'Sauvegarder'} onPress={handleSave} loading={isLoading} disabled={isLoading || uploading} />
                    {isEditing && <Button text="Annuler l'édition" onPress={() => { setIsEditing(null); setForm({ title: '', subtitle: '', image_url: '', target_url: '', is_enabled: true }); }} variant="secondary" style={{ marginTop: 10 }} />}
                </View>

                <View style={styles.listContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Annonces Existantes</Text>
                    {isLoading && <Text style={{ color: colors.textSecondary }}>Chargement...</Text>}
                    {ads.map(ad => (
                        <View key={ad.id} style={[styles.adItem, { borderColor: colors.border }]}>
                            {ad.image_url && supabase && (
                                <Image
                                    source={{
                                        uri: ad.image_url.startsWith('http')
                                            ? ad.image_url
                                            : supabase.storage.from('advertisements').getPublicUrl(ad.image_url).data.publicUrl
                                    }}
                                    style={styles.adItemImage}
                                />
                            )}
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>{ad.title}</Text>
                            <Text style={{ color: colors.textSecondary }}>{ad.subtitle}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{ad.is_enabled ? 'Activée' : 'Désactivée'}</Text>
                            <View style={styles.adActions}>
                                <Button text="Modifier" onPress={() => handleEdit(ad)} variant="secondary" style={styles.actionButton} />
                                <Button text="Supprimer" onPress={() => handleDelete(ad.id!)} variant="danger" style={styles.actionButton} />
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    formContainer: {
        padding: 20,
    },
    listContainer: {
        padding: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 16,
    },
    imageUploader: {
        marginBottom: 15,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        resizeMode: 'contain',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    adItem: {
        borderWidth: 1,
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    adItemImage: {
        width: '100%',
        height: 100,
        borderRadius: 8,
        marginBottom: 10,
        resizeMode: 'cover',
        backgroundColor: colors.backgroundAlt,
    },
    adActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        gap: 8,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        width: 'auto',
    },
    backButton: {
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        padding: 5,
    },
});