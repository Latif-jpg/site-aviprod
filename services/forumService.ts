import { supabase } from '../config';
import {
    ForumCategory,
    ForumCategoryWithStats,
    ForumTopic,
    ForumTopicWithStats,
    ForumPost,
    ForumPostWithAuthor,
    ForumPostLike
} from '../types';

// ============================================
// CATÉGORIES
// ============================================

/**
 * Récupère toutes les catégories du forum avec leurs statistiques
 */
export async function getCategories(): Promise<ForumCategoryWithStats[]> {
    const { data, error } = await supabase
        .from('forum_categories_with_stats')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Erreur lors de la récupération des catégories:', error);
        throw error;
    }

    return data || [];
}

/**
 * Récupère une catégorie par son ID
 */
export async function getCategory(categoryId: string): Promise<ForumCategory | null> {
    const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

    if (error) {
        console.error('Erreur lors de la récupération de la catégorie:', error);
        return null;
    }

    return data;
}

// ============================================
// TOPICS
// ============================================

/**
 * Récupère tous les topics d'une catégorie avec statistiques
 */
export async function getTopicsByCategory(categoryId: string): Promise<ForumTopicWithStats[]> {
    const { data, error } = await supabase
        .from('forum_topics_with_stats')
        .select('*')
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur lors de la récupération des topics:', error);
        throw error;
    }

    return data || [];
}

/**
 * Récupère un topic par son ID avec statistiques
 */
export async function getTopic(topicId: string): Promise<ForumTopicWithStats | null> {
    const { data, error } = await supabase
        .from('forum_topics_with_stats')
        .select('*')
        .eq('id', topicId)
        .single();

    if (error) {
        console.error('Erreur lors de la récupération du topic:', error);
        return null;
    }

    return data;
}

/**
 * Crée un nouveau topic avec son premier message
 */
export async function createTopic(
    categoryId: string,
    userId: string,
    title: string,
    content: string
): Promise<{ topic: ForumTopic; post: ForumPost } | null> {
    // Créer le topic
    const { data: topic, error: topicError } = await supabase
        .from('forum_topics')
        .insert({
            category_id: categoryId,
            user_id: userId,
            title: title,
        })
        .select()
        .single();

    if (topicError || !topic) {
        console.error('Erreur lors de la création du topic:', topicError);
        throw topicError;
    }

    // Créer le premier message
    const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .insert({
            topic_id: topic.id,
            user_id: userId,
            content: content,
        })
        .select()
        .single();

    if (postError || !post) {
        console.error('Erreur lors de la création du premier message:', postError);
        // Supprimer le topic si le message échoue
        await supabase.from('forum_topics').delete().eq('id', topic.id);
        throw postError;
    }

    return { topic, post };
}

/**
 * Incrémente le compteur de vues d'un topic
 */
export async function incrementTopicViews(topicId: string): Promise<void> {
    // Récupérer le topic actuel
    const { data: topic } = await supabase
        .from('forum_topics')
        .select('views_count')
        .eq('id', topicId)
        .single();

    if (!topic) return;

    // Incrémenter le compteur
    const { error } = await supabase
        .from('forum_topics')
        .update({ views_count: (topic.views_count || 0) + 1 })
        .eq('id', topicId);

    if (error) {
        console.error('Erreur lors de l\'incrémentation des vues:', error);
    }
}

/**
 * Met à jour un topic (titre uniquement)
 */
export async function updateTopic(
    topicId: string,
    userId: string,
    title: string
): Promise<boolean> {
    const { error } = await supabase
        .from('forum_topics')
        .update({ title })
        .eq('id', topicId)
        .eq('user_id', userId);

    if (error) {
        console.error('Erreur lors de la mise à jour du topic:', error);
        return false;
    }

    return true;
}

/**
 * Supprime un topic (et tous ses messages via CASCADE)
 */
export async function deleteTopic(topicId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('forum_topics')
        .delete()
        .eq('id', topicId)
        .eq('user_id', userId);

    if (error) {
        console.error('Erreur lors de la suppression du topic:', error);
        return false;
    }

    return true;
}

/**
 * Recherche des topics par mot-clé
 */
export async function searchTopics(query: string): Promise<ForumTopicWithStats[]> {
    const { data, error } = await supabase
        .from('forum_topics_with_stats')
        .select('*')
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Erreur lors de la recherche de topics:', error);
        throw error;
    }

    return data || [];
}

// ============================================
// POSTS
// ============================================

/**
 * Récupère tous les messages d'un topic avec informations auteur
 */
export async function getPostsByTopic(topicId: string): Promise<ForumPostWithAuthor[]> {
    const { data, error } = await supabase
        .from('forum_posts')
        .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      )
    `)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erreur lors de la récupération des messages:', error);
        throw error;
    }

    // Transformer les données pour correspondre à ForumPostWithAuthor
    return (data || []).map(post => ({
        ...post,
        author_name: post.profiles?.full_name || 'Utilisateur',
        author_avatar: post.profiles?.avatar_url || null,
    }));
}

/**
 * Crée un nouveau message dans un topic
 */
export async function createPost(
    topicId: string,
    userId: string,
    content: string
): Promise<ForumPost | null> {
    const { data, error } = await supabase
        .from('forum_posts')
        .insert({
            topic_id: topicId,
            user_id: userId,
            content: content,
        })
        .select()
        .single();

    if (error) {
        console.error('Erreur lors de la création du message:', error);
        throw error;
    }

    return data;
}

/**
 * Met à jour un message
 */
export async function updatePost(
    postId: string,
    userId: string,
    content: string
): Promise<boolean> {
    const { error } = await supabase
        .from('forum_posts')
        .update({ content })
        .eq('id', postId)
        .eq('user_id', userId);

    if (error) {
        console.error('Erreur lors de la mise à jour du message:', error);
        return false;
    }

    return true;
}

/**
 * Supprime un message
 */
export async function deletePost(postId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', userId);

    if (error) {
        console.error('Erreur lors de la suppression du message:', error);
        return false;
    }

    return true;
}

/**
 * Marque un message comme solution
 */
export async function markPostAsSolution(
    postId: string,
    topicId: string,
    topicAuthorId: string
): Promise<boolean> {
    // Vérifier que l'utilisateur est bien l'auteur du topic
    const { data: topic } = await supabase
        .from('forum_topics')
        .select('user_id')
        .eq('id', topicId)
        .single();

    if (!topic || topic.user_id !== topicAuthorId) {
        console.error('Seul l\'auteur du topic peut marquer une solution');
        return false;
    }

    // Retirer la solution actuelle si elle existe
    await supabase
        .from('forum_posts')
        .update({ is_solution: false })
        .eq('topic_id', topicId);

    // Marquer le nouveau message comme solution
    const { error } = await supabase
        .from('forum_posts')
        .update({ is_solution: true })
        .eq('id', postId);

    if (error) {
        console.error('Erreur lors du marquage de la solution:', error);
        return false;
    }

    return true;
}

// ============================================
// LIKES
// ============================================

/**
 * Toggle like sur un message (like/unlike)
 */
export async function togglePostLike(
    postId: string,
    userId: string
): Promise<{ liked: boolean }> {
    // Vérifier si l'utilisateur a déjà liké
    const { data: existingLike } = await supabase
        .from('forum_post_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

    if (existingLike) {
        // Retirer le like
        const { error } = await supabase
            .from('forum_post_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId);

        if (error) {
            console.error('Erreur lors du retrait du like:', error);
            throw error;
        }

        return { liked: false };
    } else {
        // Ajouter le like
        const { error } = await supabase
            .from('forum_post_likes')
            .insert({
                post_id: postId,
                user_id: userId,
            });

        if (error) {
            console.error('Erreur lors de l\'ajout du like:', error);
            throw error;
        }

        return { liked: true };
    }
}

/**
 * Vérifie si l'utilisateur a liké un message
 */
export async function hasUserLikedPost(
    postId: string,
    userId: string
): Promise<boolean> {
    const { data } = await supabase
        .from('forum_post_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

    return !!data;
}

/**
 * Récupère tous les likes d'un utilisateur pour une liste de posts
 */
export async function getUserLikesForPosts(
    postIds: string[],
    userId: string
): Promise<Set<string>> {
    const { data } = await supabase
        .from('forum_post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', userId);

    return new Set((data || []).map(like => like.post_id));
}

// ============================================
// ABONNEMENTS
// ============================================

/**
 * S'abonner à un topic pour recevoir des notifications
 */
export async function subscribeToTopic(
    topicId: string,
    userId: string
): Promise<boolean> {
    const { error } = await supabase
        .from('forum_topic_subscriptions')
        .insert({
            topic_id: topicId,
            user_id: userId,
        });

    if (error) {
        console.error('Erreur lors de l\'abonnement au topic:', error);
        return false;
    }

    return true;
}

/**
 * Se désabonner d'un topic
 */
export async function unsubscribeFromTopic(
    topicId: string,
    userId: string
): Promise<boolean> {
    const { error } = await supabase
        .from('forum_topic_subscriptions')
        .delete()
        .eq('topic_id', topicId)
        .eq('user_id', userId);

    if (error) {
        console.error('Erreur lors du désabonnement du topic:', error);
        return false;
    }

    return true;
}

/**
 * Vérifie si l'utilisateur est abonné à un topic
 */
export async function isSubscribedToTopic(
    topicId: string,
    userId: string
): Promise<boolean> {
    const { data } = await supabase
        .from('forum_topic_subscriptions')
        .select('*')
        .eq('topic_id', topicId)
        .eq('user_id', userId)
        .single();

    return !!data;
}
