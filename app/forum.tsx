import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ForumCategoryWithStats } from '../types';
import { getCategories } from '../services/forumService';
import CategoryCard from '../components/forum/CategoryCard';

export default function ForumScreen() {
    const [categories, setCategories] = useState<ForumCategoryWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadCategories();
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            router.push(`/forum/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <Stack.Screen options={{ title: 'Forum' }} />
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Forum',
                    headerStyle: { backgroundColor: '#10b981' },
                    headerTintColor: '#fff',
                    headerTitleStyle: { fontWeight: 'bold' },
                }}
            />

            <View style={styles.header}>
                <Text style={styles.title}>Communauté Aviprod</Text>
                <Text style={styles.subtitle}>
                    Échangez avec d'autres éleveurs et partagez vos expériences
                </Text>

                <View style={styles.searchContainer}>
                    <Feather name="search" size={20} color="#6b7280" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher un sujet..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Feather name="x" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <CategoryCard category={item} />}
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
                        <Feather name="message-circle" size={64} color="#d1d5db" />
                        <Text style={styles.emptyText}>Aucune catégorie disponible</Text>
                    </View>
                }
            />
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
    header: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
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
    },
});
