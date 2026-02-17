import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ForumPostWithAuthor } from '../../types';
import { formatTimeAgo } from '../../utils/dateUtils';
import { togglePostLike } from '../../services/forumService';

interface PostCardProps {
    post: ForumPostWithAuthor;
    currentUserId: string;
    isLiked: boolean;
    onLikeToggle?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function PostCard({
    post,
    currentUserId,
    isLiked,
    onLikeToggle,
    onEdit,
    onDelete,
}: PostCardProps) {
    const [localLiked, setLocalLiked] = useState(isLiked);
    const [localLikesCount, setLocalLikesCount] = useState(post.likes_count);
    const [isLiking, setIsLiking] = useState(false);

    const isAuthor = post.user_id === currentUserId;

    const timeAgo = formatTimeAgo(post.created_at);

    const handleLike = async () => {
        if (isLiking) return;

        setIsLiking(true);
        const previousLiked = localLiked;
        const previousCount = localLikesCount;

        // Optimistic update
        setLocalLiked(!localLiked);
        setLocalLikesCount(localLiked ? localLikesCount - 1 : localLikesCount + 1);

        try {
            await togglePostLike(post.id, currentUserId);
            onLikeToggle?.();
        } catch (error) {
            // Revert on error
            setLocalLiked(previousLiked);
            setLocalLikesCount(previousCount);
            Alert.alert('Erreur', 'Impossible de liker ce message');
        } finally {
            setIsLiking(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Supprimer le message',
            'Êtes-vous sûr de vouloir supprimer ce message ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: onDelete,
                },
            ]
        );
    };

    return (
        <View style={[styles.card, post.is_solution && styles.solutionCard]}>
            {post.is_solution && (
                <View style={styles.solutionBadge}>
                    <Feather name="check-circle" size={16} color="#10b981" />
                    <Text style={styles.solutionText}>Solution acceptée</Text>
                </View>
            )}

            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Feather name="user" size={20} color="#6b7280" />
                </View>

                <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>
                        {post.author_name || 'Utilisateur'}
                    </Text>
                    <Text style={styles.time}>{timeAgo}</Text>
                </View>

                {isAuthor && (
                    <View style={styles.actions}>
                        {onEdit && (
                            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
                                <Feather name="edit-2" size={16} color="#6b7280" />
                            </TouchableOpacity>
                        )}
                        {onDelete && (
                            <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
                                <Feather name="trash-2" size={16} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            <Text style={styles.content}>{post.content}</Text>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.likeButton}
                    onPress={handleLike}
                    disabled={isLiking}
                >
                    <Feather
                        name="heart"
                        size={18}
                        color={localLiked ? '#ef4444' : '#6b7280'}
                        fill={localLiked ? '#ef4444' : 'transparent'}
                    />
                    <Text style={[styles.likeText, localLiked && styles.likedText]}>
                        {localLikesCount}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    solutionCard: {
        borderWidth: 2,
        borderColor: '#d1fae5',
    },
    solutionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#d1fae5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    solutionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#10b981',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    authorInfo: {
        flex: 1,
    },
    authorName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    time: {
        fontSize: 12,
        color: '#9ca3af',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 6,
    },
    content: {
        fontSize: 15,
        color: '#374151',
        lineHeight: 22,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#f9fafb',
    },
    likeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    likedText: {
        color: '#ef4444',
    },
});
