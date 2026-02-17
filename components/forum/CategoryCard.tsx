import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ForumCategoryWithStats } from '../../types';

interface CategoryCardProps {
    category: ForumCategoryWithStats;
}

const ICON_MAP: { [key: string]: keyof typeof Feather.glyphMap } = {
    chicken: 'feather',
    egg: 'circle',
    package: 'package',
    food: 'coffee',
    health: 'heart',
    money: 'dollar-sign',
    market: 'shopping-cart',
    chat: 'message-circle',
};

export default function CategoryCard({ category }: CategoryCardProps) {
    const iconName = ICON_MAP[category.icon || 'chat'] || 'message-circle';

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/forum/${category.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <Feather name={iconName} size={28} color="#10b981" />
            </View>

            <View style={styles.content}>
                <Text style={styles.name}>{category.name}</Text>
                {category.description && (
                    <Text style={styles.description} numberOfLines={2}>
                        {category.description}
                    </Text>
                )}

                <View style={styles.stats}>
                    <View style={styles.stat}>
                        <Feather name="file-text" size={14} color="#6b7280" />
                        <Text style={styles.statText}>
                            {category.topics_count || 0} {category.topics_count === 1 ? 'sujet' : 'sujets'}
                        </Text>
                    </View>

                    <View style={styles.stat}>
                        <Feather name="message-square" size={14} color="#6b7280" />
                        <Text style={styles.statText}>
                            {category.posts_count || 0} {category.posts_count === 1 ? 'message' : 'messages'}
                        </Text>
                    </View>
                </View>
            </View>

            <Feather name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#d1fae5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 8,
        lineHeight: 18,
    },
    stats: {
        flexDirection: 'row',
        gap: 16,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: '#6b7280',
    },
});
