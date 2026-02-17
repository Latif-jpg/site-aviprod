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
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ForumTopicWithStats, ForumPostWithAuthor } from '../../../types';
import {
    getTopic,
    getPostsByTopic,
    createPost,
    incrementTopicViews,
    getUserLikesForPosts,
} from '../../../services/forumService';
import { supabase } from '../../../config';
import PostCard from '../../../components/forum/PostCard';

export default function TopicDetailScreen() {
    const { topicId } = useLocalSearchParams<{ topicId: string }>();
    const [topic, setTopic] = useState<ForumTopicWithStats | null>(null);
    const [posts, setPosts] = useState<ForumPostWithAuthor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [replyModalVisible, setReplyModalVisible] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [posting, setPosting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
        loadCurrentUser();
        // Incrémenter le compteur de vues
        incrementTopicViews(topicId);
    }, [topicId]);

    const loadCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);
        }
    };

    const loadData = async () => {
        try {
            const [topicData, postsData] = await Promise.all([
                getTopic(topicId),
                getPostsByTopic(topicId),
            ]);
            setTopic(topicData);
            setPosts(postsData);

            // Charger les likes de l'utilisateur
            if (currentUserId && postsData.length > 0) {
                const postIds = postsData.map(p => p.id);
                const likes = await getUserLikesForPosts(postIds, currentUserId);
                setUserLikes(likes);
            }
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

    const handleReply = async () => {
        if (!replyContent.trim()) {
            Alert.alert('Erreur', 'Veuillez saisir votre réponse');
            return;
        }

        if (!currentUserId) {
            Alert.alert('Erreur', 'Vous devez être connecté pour répondre');
            return;
        }

        setPosting(true);
        try {
            await createPost(topicId, currentUserId, replyContent);
            setReplyModalVisible(false);
            setReplyContent('');
            loadData();
        } catch (error) {
            console.error('Erreur lors de la publication:', error);
            Alert.alert('Erreur', 'Impossible de publier votre réponse');
        } finally {
            setPosting(false);
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

    if (!topic) {
        return (
            <View style={styles.centerContainer}>
                <Stack.Screen options={{ title: 'Erreur' }} />
                <Feather name="alert-circle" size={64} color="#ef4444" />
                <Text style={styles.errorText}>Sujet introuvable</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen
                options={{
                    title: topic.title,
                    headerStyle: { backgroundColor: '#10b981' },
                    headerTintColor: '#fff',
                }}
            />

            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        currentUserId={currentUserId}
                        isLiked={userLikes.has(item.id)}
                        onLikeToggle={loadData}
                    />
                )}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#10b981']}
                    />
                }
                ListHeaderComponent={
                    <View style={styles.topicHeader}>
                        <View style={styles.badges}>
                            {topic.is_pinned && (
                                <View style={styles.badge}>
                                    <Feather name="bookmark" size={14} color="#10b981" />
                                    <Text style={styles.badgeText}>Épinglé</Text>
                                </View>
                            )}
                            {topic.is_locked && (
                                <View style={[styles.badge, styles.lockedBadge]}>
                                    <Feather name="lock" size={14} color="#ef4444" />
                                    <Text style={[styles.badgeText, styles.lockedText]}>
                                        Verrouillé
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.topicTitle}>{topic.title}</Text>

                        <View style={styles.topicStats}>
                            <View style={styles.stat}>
                                <Feather name="message-square" size={16} color="#6b7280" />
                                <Text style={styles.statText}>
                                    {topic.posts_count || 0} réponses
                                </Text>
                            </View>
                            <View style={styles.stat}>
                                <Feather name="eye" size={16} color="#6b7280" />
                                <Text style={styles.statText}>
                                    {topic.views_count || 0} vues
                                </Text>
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="message-circle" size={64} color="#d1d5db" />
                        <Text style={styles.emptyText}>Aucune réponse pour le moment</Text>
                    </View>
                }
            />

            {!topic.is_locked && (
                <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => setReplyModalVisible(true)}
                >
                    <Feather name="message-circle" size={20} color="#fff" />
                    <Text style={styles.replyButtonText}>Répondre</Text>
                </TouchableOpacity>
            )}

            <Modal
                visible={replyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setReplyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Votre réponse</Text>
                            <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                                <Feather name="x" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.textArea}
                            placeholder="Écrivez votre réponse..."
                            value={replyContent}
                            onChangeText={setReplyContent}
                            multiline
                            numberOfLines={8}
                            textAlignVertical="top"
                            autoFocus
                        />

                        <TouchableOpacity
                            style={[styles.postButton, posting && styles.postButtonDisabled]}
                            onPress={handleReply}
                            disabled={posting}
                        >
                            {posting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.postButtonText}>Publier</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
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
    topicHeader: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    badges: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#d1fae5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    lockedBadge: {
        backgroundColor: '#fee2e2',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#10b981',
    },
    lockedText: {
        color: '#ef4444',
    },
    topicTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
        lineHeight: 28,
    },
    topicStats: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 14,
        color: '#6b7280',
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
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        marginTop: 12,
    },
    replyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#10b981',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    replyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
        maxHeight: '70%',
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
    textArea: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#111827',
        height: 200,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    postButton: {
        backgroundColor: '#10b981',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    postButtonDisabled: {
        opacity: 0.6,
    },
    postButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
