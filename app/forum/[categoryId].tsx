import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ForumTopicWithStats, ForumCategory } from '../../types';
import { getTopicsByCategory, getCategory, createTopic } from '../../services/forumService';
import { supabase } from '../../config';
import TopicCard from '../../components/forum/TopicCard';

export default function CategoryTopicsScreen() {
    const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
    const [category, setCategory] = useState<ForumCategory | null>(null);
    const [topics, setTopics] = useState<ForumTopicWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicContent, setNewTopicContent] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadData();
    }, [categoryId]);

    const loadData = async () => {
        try {
            const [categoryData, topicsData] = await Promise.all([
                getCategory(categoryId),
                getTopicsByCategory(categoryId),
            ]);
            setCategory(categoryData);
            setTopics(topicsData);
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleCreateTopic = async () => {
        if (!newTopicTitle.trim() || !newTopicContent.trim()) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        setCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Erreur', 'Vous devez être connecté pour créer un sujet');
                return;
            }

            const result = await createTopic(
                categoryId,
                user.id,
                newTopicTitle,
                newTopicContent
            );

            if (result) {
                setModalVisible(false);
                setNewTopicTitle('');
                setNewTopicContent('');
                loadData();
                Alert.alert('Succès', 'Votre sujet a été créé avec succès');
            }
        } catch (error) {
            console.error('Erreur lors de la création du sujet:', error);
            Alert.alert('Erreur', 'Impossible de créer le sujet');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <Stack.Screen options={{ title: 'Chargement...' }} />
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: category?.name || 'Catégorie',
                    headerStyle: { backgroundColor: '#10b981' },
                    headerTintColor: '#fff',
                }}
            />

            <FlatList
                data={topics}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TopicCard topic={item} />}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#10b981']}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="file-text" size={64} color="#d1d5db" />
                        <Text style={styles.emptyText}>Aucun sujet dans cette catégorie</Text>
                        <Text style={styles.emptySubtext}>
                            Soyez le premier à créer un sujet !
                        </Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nouveau sujet</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Feather name="x" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Titre du sujet"
                            value={newTopicTitle}
                            onChangeText={setNewTopicTitle}
                            maxLength={200}
                        />

                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Décrivez votre question ou sujet..."
                            value={newTopicContent}
                            onChangeText={setNewTopicContent}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.createButton, creating && styles.createButtonDisabled]}
                            onPress={handleCreateTopic}
                            disabled={creating}
                        >
                            {creating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.createButtonText}>Créer le sujet</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    list: {
        padding: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
        marginTop: 12,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#d1d5db',
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    input: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#111827',
        marginBottom: 16,
    },
    textArea: {
        height: 150,
        textAlignVertical: 'top',
    },
    createButton: {
        backgroundColor: '#10b981',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
