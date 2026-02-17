import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ForumTopicWithStats } from '../../types';
import { formatTimeAgo } from '../../utils/dateUtils';

interface TopicCardProps {
    topic: ForumTopicWithStats;
}

export default function TopicCard({ topic }: TopicCardProps) {
    const timeAgo = formatTimeAgo(topic.created_at);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/forum/topic/${topic.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    {topic.is_pinned && (
                        <View style={styles.badge}>
                            <Feather name="bookmark" size={12} color="#10b981" />
                            <Text style={styles.badgeText}>Épinglé</Text>
                        </View>
                    )}
                    {topic.is_locked && (
                        <View style={[styles.badge, styles.lockedBadge]}>
                            <Feather name="lock" size={12} color="#ef4444" />
                            <Text style={[styles.badgeText, styles.lockedText]}>Verrouillé</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.title} numberOfLines={2}>
                    {topic.title}
                </Text>

                <View style={styles.meta}>
                    <Text style={styles.author}>
                        Par {topic.author_name || 'Utilisateur'}
                    </Text>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.time}>{timeAgo}</Text>
                </View>
            </View>

            <View style={styles.stats}>
                <View style={styles.stat}>
                    <Feather name="message-square" size={16} color="#6b7280" />
                    <Text style={styles.statText}>{topic.posts_count || 0}</Text>
                </View>

                <View style={styles.stat}>
                    <Feather name="eye" size={16} color="#6b7280" />
                    <Text style={styles.statText}>{topic.views_count || 0}</Text>
                </View>
            </View>
        </TouchableOpacity>
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
    header: {
        marginBottom: 12,
    },
    titleRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
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
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        lineHeight: 22,
        marginBottom: 6,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    author: {
        fontSize: 13,
        color: '#6b7280',
    },
    separator: {
        fontSize: 13,
        color: '#d1d5db',
    },
    time: {
        fontSize: 13,
        color: '#9ca3af',
    },
    stats: {
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
        fontWeight: '500',
    },
});
