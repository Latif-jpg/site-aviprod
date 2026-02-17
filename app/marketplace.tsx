import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, TextInput, RefreshControl, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import SimpleBottomSheet from '../components/BottomSheet';
import MarketplaceChat from '../components/MarketplaceChat'; // Assurez-vous que le chemin est correct
import ShoppingCart from '../components/ShoppingCart';
import { getMarketplaceImageUrl, supabase } from '../config'; // Corrigé pour utiliser la bonne fonction
import { useProfile } from '../contexts/ProfileContext';
import { marketingAgent, UserProfile, Product } from '../lib/marketingAgent';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import ProductCard from '../components/ProductCard'; // Importer le composant réutilisable
import { useDataCollector } from '../src/hooks/useDataCollector';
import { COUNTRIES, getRegionsForCountry } from '../data/locations';
import GoogleAdBanner from '../components/GoogleAdBanner';

const getDefaultImageForCategory = (category: string | undefined) => {
  return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop';
};

const { width } = Dimensions.get('window');

export default function MarketplaceScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductDetailVisible, setIsProductDetailVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false); // Keep
  const [isReviewsVisible, setIsReviewsVisible] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [sellerReviews, setSellerReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]); // Use Product type
  const [sponsored, setSponsored] = useState<Product[]>([]); // Use Product type
  const [cartCount, setCartCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all'); // Country filter
  const [cityFilter, setCityFilter] = useState<'all' | string>('all'); // City filter
  const [hideSold, setHideSold] = useState(true); // État pour masquer les produits vendus
  const [availableRegions, setAvailableRegions] = useState<{ id: string, name: string }[]>([]);
  const [sellerStats, setSellerStats] = useState<any>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const pendingRegionFilter = useRef<string | null>(null);
  const { productId } = useLocalSearchParams();
  const { profile } = useProfile();

  // Utility to normalize comparison strings (lowercase, trim, remove accents)
  const normalize = useCallback((s?: string | null) => {
    if (!s) return '';
    try {
      return s
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    } catch (e) {
      return String(s).toLowerCase().trim();
    }
  }, []);

  useEffect(() => {
    // Initialize regions based on selectedCountry
    if (selectedCountry === 'all') {
      setAvailableRegions([]);
      setRegionFilter('all');
    } else {
      // Try to find by name or by normalized name
      const countryData = COUNTRIES.find(
        c => c.name === selectedCountry || normalize(c.name) === normalize(selectedCountry)
      );
      if (countryData) {
        const newRegions = [{ id: 'all', name: 'Toutes' }, ...countryData.regions];
        setAvailableRegions(newRegions);

        // Apply pending region filter if available
        if (pendingRegionFilter.current) {
          const want = normalize(pendingRegionFilter.current);
          const match = newRegions.find(r => normalize(r.name) === want || normalize(r.id) === want);
          if (match) {
            setRegionFilter(match.id);
          } else {
            // keep free-text regionFilter so matching can still work via normalize
            setRegionFilter(pendingRegionFilter.current);
          }
          pendingRegionFilter.current = null;
        } else {
          setRegionFilter('all');
        }
      } else {
        // Unknown country (not listed), keep free-text filters; clear regions UI
        setAvailableRegions([]);
        setRegionFilter('all');
      }
    }
  }, [selectedCountry, normalize]);

  // Synchroniser les filtres avec le profil utilisateur
  useEffect(() => {
    if (profile) {
      setCurrentUserId(profile.id);

      // Initialiser le profil pour l'agent marketing
      setUserProfile({
        id: profile.id,
        zone: profile.location || '',
        farmType: profile.farm_name || '',
      });

      // Appliquer les filtres de localisation par défaut depuis le profil
      // Désactivé pour éviter de masquer les produits par défaut.
      // L'utilisateur peut utiliser les filtres manuels s'il souhaite restreindre la liste.
    }
  }, [profile]);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // New state for user profile
  const [showKYCApprovedBanner, setShowKYCApprovedBanner] = useState(false);
  const { trackAction } = useDataCollector();
  const categories = [
    { id: 'all', name: 'Tout', icon: 'grid' },
    { id: 'feed', name: 'Alimentation', icon: 'bag' },
    { id: 'medicine', name: 'Médicaments', icon: 'medkit' },
    { id: 'equipment', name: 'Équipement', icon: 'construct' },
    { id: 'birds', name: 'Volailles', icon: 'egg' },
  ];

  // Mock advertisements data
  const advertisements = [
    {
      id: 'ad1',
      title: 'Promotion Spéciale',
      subtitle: 'Jusqu\'à 30% de réduction',
      image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800',
      color: colors.orange,
    },
    {
      id: 'ad2',
      title: 'Nouveaux Produits',
      subtitle: 'Découvrez notre gamme',
      image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800',
      color: colors.primary,
    },
    {
      id: 'ad3',
      title: 'Livraison Gratuite',
      subtitle: 'Sur commandes +50,000 CFA',
      image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800',
      color: colors.accentSecondary,
    },
  ];

  useFocusEffect(
    useCallback(() => {
      console.log('📊 Marketplace: Screen focused, loading data...');
      loadInitialData();
    }, [])
  );

  // NOUVEAU : Gérer le deep linking vers un produit spécifique
  useEffect(() => {
    if (productId && products.length > 0) {
      const product = products.find(prod => prod.id === productId);
      if (product) {
        console.log('🔗 Marketplace: Deep linking to product:', productId);
        handleProductPress(product);
        // On nettoie le paramètre pour éviter de ré-ouvrir au prochain focus si besoin
        // (Optionnel selon le comportement souhaité)
      }
    }
  }, [productId, products]);


  const loadInitialData = async () => {
    try {
      console.log('📊 Marketplace: Starting initial data load...');
      setIsLoadingProducts(true);
      setLoadError(null);

      // Paralléliser les chargements de base
      const results = await Promise.allSettled([
        loadProducts(),
        loadCartCount(),
        loadSellerStats(),
      ]);

      const [productsResult] = results;

      if (productsResult.status === 'fulfilled' && productsResult.value) {
        const allProductsData = productsResult.value;
        // setProducts est déjà appelé dans loadProducts, mais on s'assure de la cohérence ici

        // After products and userProfile are loaded, generate sponsored suggestions
        if (profile && allProductsData && allProductsData.length > 0) {
          const agentContext = {
            profile: { id: profile.id, zone: profile.location || '', farmType: profile.farm_name || '' },
            health: { score: 100, alerts: '' },
            finance: { profitMargin: 0 }
          };
          const sponsoredProducts = allProductsData.filter((p: any) => p.is_sponsored === true);
          const recs = marketingAgent(agentContext, sponsoredProducts, 4);
          setSponsored(recs);
        }
      } else if (productsResult.status === 'rejected') {
        throw productsResult.reason;
      }

      console.log('✅ Marketplace: Initial data load complete');
    } catch (error: any) {
      console.error('❌ Marketplace: Error in loadInitialData:', error);
      setLoadError(error?.message || 'Erreur de chargement');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadProducts = async (): Promise<Product[]> => {
    try {
      console.log('📊 Marketplace: Loading products...');

      // 1. Charger les produits (sans jointure car la FK pointe vers auth.users)
      const { data: productsData, error: productsError } = await supabase
        .from('marketplace_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('❌ Marketplace: Error loading products:', productsError);
        throw productsError;
      }

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        return [];
      }

      // 2. Charger les profils des vendeurs manuellement
      const sellerIds = [...new Set(productsData.map((product: any) => product.seller_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};

      if (sellerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, farm_name, avatar_url')
          .in('user_id', sellerIds);

        if (!profilesError && profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.user_id] = profile;
          });
        }
      }

      // 3. Fusionner les données
      const transformedData = productsData.map((product: any) => ({
        ...product,
        // Debug: s'assurer que les champs de localisation existent
        farm_name: profilesMap[product.seller_id]?.farm_name || 'Vendeur',
        logo: profilesMap[product.seller_id]?.avatar_url || null
      }));

      console.log('✅ Marketplace: Loaded', transformedData.length, 'products');
      setProducts(transformedData);
      setLoadError(null);
      return transformedData;
    } catch (error: any) {
      console.error('❌ Marketplace: Exception in loadProducts:', error);
      setLoadError(error?.message || 'Erreur de chargement des produits');
      setProducts([]);
      throw error;
    }
  };

  const loadCartCount = async () => {
    try {
      console.log('📊 Marketplace: Loading cart count...');

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log('⚠️ Marketplace: No user for cart count');
        setCartCount(0);
        return;
      }

      const { count, error } = await supabase
        .from('shopping_cart')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        console.log('⚠️ Marketplace: Error loading cart count:', error?.message || error);
        setCartCount(0);
        return;
      }

      console.log('✅ Marketplace: Loaded cart count:', count || 0);
      setCartCount(count || 0);
    } catch (error: any) {
      console.error('❌ Marketplace: Exception in loadCartCount:', error);
      setCartCount(0);
    }
  };

  const handleRefresh = async () => {
    try {
      console.log('🔄 Marketplace: Refreshing data...');
      setIsRefreshing(true);
      setLoadError(null);

      // Rafraîchir tout en parallèle avec settled pour éviter qu'une erreur bloque tout
      const results = await Promise.allSettled([
        loadProducts(),
        loadCartCount(),
        loadSellerStats(),
      ]);

      const [productsResult] = results;

      if (productsResult.status === 'fulfilled' && productsResult.value) {
        const productsData = productsResult.value;
        // After products and userProfile are loaded, generate sponsored suggestions
        if (profile && productsData && productsData.length > 0) {
          const agentContext = {
            profile: { id: profile.id, zone: profile.location || '', farmType: profile.farm_name || '' },
            health: { score: 100, alerts: '' },
            finance: { profitMargin: 0 }
          };
          const sponsoredProducts = allProductsData.filter((product: any) => product.is_sponsored === true);
          const recs = marketingAgent(agentContext, sponsoredProducts, 4);
          setSponsored(recs);
        }
      }

      console.log('✅ Marketplace: Refresh complete');
    } catch (error: any) {
      console.error('❌ Marketplace: Error in handleRefresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadSellerStats = async () => {
    try {
      console.log('📊 Loading seller stats...');
      // Get stats for all sellers to cache them
      const { data, error } = await supabase
        .from('seller_stats')
        .select('*');

      if (error) {
        console.error('❌ Error loading seller stats:', error);
        return;
      }

      // Create a map of seller stats by seller_id
      const statsMap: { [key: string]: any } = {};
      data?.forEach(stat => {
        statsMap[stat.seller_id] = stat;
      });

      console.log('✅ Loaded seller stats for', Object.keys(statsMap).length, 'sellers');
      setSellerStats(statsMap);
    } catch (error: any) {
      console.error('❌ Exception in loadSellerStats:', error);
    }
  };


  const handleViewSellerReviews = async (sellerId: string) => {
    try {
      console.log('📊 Loading seller reviews for:', sellerId);
      setSelectedSellerId(sellerId);

      const { data, error } = await supabase
        .from('seller_ratings')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Error loading reviews:', error);
        throw error;
      }

      setSellerReviews(data || []);
      setIsReviewsVisible(true);
    } catch (error: any) {
      console.error('❌ Exception in handleViewSellerReviews:', error);
      Alert.alert('Erreur', 'Impossible de charger les avis');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      console.log('🗑️ Marketplace: Deleting product:', productId);

      Alert.alert(
        'Confirmer la suppression',
        'Êtes-vous sûr de vouloir supprimer ce produit ?',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('marketplace_products')
                  .delete()
                  .eq('id', productId);

                if (error) {
                  // Gestion de la contrainte de clé étrangère (produit déjà commandé/dans un panier)
                  // On vérifie le code 23503 OU si le message contient "constraint" pour être plus large
                  if (error.code === '23503' || error.message?.includes('constraint')) {
                    Alert.alert(
                      'Action impossible',
                      'Ce produit est lié à des commandes existantes et ne peut pas être supprimé. Voulez-vous le marquer comme "Vendu" à la place ?',
                      [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Marquer comme vendu',
                          onPress: async () => {
                            const { error: updateError } = await supabase
                              .from('marketplace_products')
                              .update({ in_stock: false })
                              .eq('id', productId);

                            if (updateError) {
                              Alert.alert('Erreur', 'Impossible de mettre à jour le produit');
                            } else {
                              Alert.alert('Succès', 'Produit marqué comme vendu');
                              setIsProductDetailVisible(false);
                              await loadProducts();
                            }
                          }
                        }
                      ]
                    );
                    return;
                  }

                  console.error('❌ Error deleting product:', error);
                  throw error;
                }

                console.log('✅ Product deleted successfully');
                Alert.alert('Succès! ✅', 'Produit supprimé avec succès');
                setIsProductDetailVisible(false);
                await loadProducts();
              } catch (error: any) {
                console.error('❌ Error deleting product:', error);
                Alert.alert('Erreur', error.message || 'Impossible de supprimer le produit');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Marketplace: Exception in handleDeleteProduct:', error);
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    try {
      console.log('✏️ Marketplace: Updating product:', productId);

      Alert.alert(
        'Mettre à jour le produit',
        'Choisissez une action',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Marquer comme vendu',
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('marketplace_products')
                  .update({ in_stock: false })
                  .eq('id', productId);

                if (error) {
                  console.error('❌ Error updating product:', error);
                  throw error;
                }

                console.log('✅ Product marked as sold');
                Alert.alert('Succès! ✅', 'Produit marqué comme vendu');
                setIsProductDetailVisible(false);
                await loadProducts();
              } catch (error: any) {
                console.error('❌ Error updating product:', error);
                Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le produit');
              }
            },
          },
          {
            text: 'Remettre en stock',
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('marketplace_products')
                  .update({ in_stock: true })
                  .eq('id', productId);

                if (error) {
                  console.error('❌ Error updating product:', error);
                  throw error;
                }

                console.log('✅ Product marked as in stock');
                Alert.alert('Succès! ✅', 'Produit remis en stock');
                setIsProductDetailVisible(false);
                await loadProducts();
              } catch (error: any) {
                console.error('❌ Error updating product:', error);
                Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le produit');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Marketplace: Exception in handleUpdateProduct:', error);
    }
  };

  const filteredProducts = Array.isArray(products)
    ? products.filter(product => {
      try {
        if (!product) return false;

        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        const productName = product.name || '';
        const productDescription = product.description || '';
        const query = normalize(searchQuery || '');

        const matchesSearch =
          normalize(productName).includes(query) ||
          normalize(productDescription).includes(query);

        // Country match (normalized). If selectedCountry set, require equality; otherwise ignore
        const matchesCountry =
          selectedCountry === 'all' || normalize(product.country) === normalize(selectedCountry);

        // Region match: allow id, name, or free-text normalized comparison
        let matchesRegion = regionFilter === 'all';
        if (!matchesRegion) {
          const target = normalize(regionFilter);
          const prodRegion = normalize(product.region);
          if (prodRegion && target && prodRegion === target) {
            matchesRegion = true;
          } else {
            const regionObj = availableRegions.find(r => normalize(r.id) === target || normalize(r.name) === target);
            if (regionObj) {
              matchesRegion = prodRegion === normalize(regionObj.name) || prodRegion === normalize(regionObj.id);
            }
          }
        }

        // City match (normalized) if a city filter is set
        const matchesCity = cityFilter === 'all' || normalize(product.city) === normalize(cityFilter);

        // Filtre stock : si hideSold est activé, on ne garde que les produits en stock
        const matchesStock = !hideSold || product.in_stock;

        return matchesCategory && matchesSearch && matchesCountry && matchesRegion && matchesCity && matchesStock;
      } catch (err: any) {
        console.error('❌ Marketplace: Error filtering product:', err);
        return false;
      }
    })
    : [];

  const handleProductPress = (product: any) => {
    try {
      if (!product) {
        console.log('⚠️ Marketplace: No product provided to handleProductPress');
        return;
      }

      console.log('📦 Marketplace: Product selected:', product.id);

      // TRACKER LA CONSULTATION DE PRODUIT
      trackAction('product_viewed', {
        product_id: product.id,
        product_name: product.name,
        seller_id: product.seller_id,
        category: product.category,
        price: product.price
      });

      setLogoLoadError(false); // Réinitialiser l'erreur de chargement du logo
      setSelectedProduct(product);
      setIsProductDetailVisible(true);
      loadProductImages(product.id);
    } catch (error: any) {
      console.error('❌ Marketplace: Exception in handleProductPress:', error);
    }
  };

  const loadProductImages = async (productId: string) => {
    try {
      setIsLoadingImages(true);
      console.log('🖼️ Loading images for product:', productId);

      const { data, error } = await supabase.storage
        .from('marketplace-products')
        .list(`products/${productId}`);

      if (error) throw error;

      if (data && data.length > 0) {
        // Map titles to full storage paths
        const paths = data.map(file => `products/${productId}/${file.name}`);
        setProductImages(paths);
      } else {
        setProductImages([]);
      }
    } catch (error) {
      console.error('❌ Error listing product images:', error);
      setProductImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleContactSeller = () => {
    try {
      if (!selectedProduct || !selectedProduct.seller_id) {
        Alert.alert("Erreur", "Informations sur le vendeur non disponibles.");
        return;
      }
      console.log('💬 Marketplace: Opening chat with seller');
      setIsProductDetailVisible(false);
      setIsChatVisible(true);
    } catch (error: any) {
      console.error('❌ Marketplace: Exception in handleContactSeller:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedProduct) {
      console.log('⚠️ Marketplace: No product selected for cart');
      return;
    }

    try {
      console.log('🛒 Marketplace: Adding to cart:', selectedProduct.id);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour ajouter au panier');
        return;
      }

      // --- CORRECTION : Logique d'ajout au panier plus robuste ---
      // 1. Vérifier si l'article existe déjà dans le panier
      const { data: existingItem, error: fetchError } = await supabase
        .from('shopping_cart')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', selectedProduct.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = 0 ligne trouvée, ce qui est normal
        throw fetchError;
      }

      let error;
      if (existingItem) {
        // 2. Si l'article existe, incrémenter la quantité
        const { error: updateError } = await supabase
          .from('shopping_cart')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
        error = updateError;
      } else {
        // 3. Sinon, insérer un nouvel article
        const { error } = await supabase
          .from('shopping_cart')
          .insert({ user_id: user.id, product_id: selectedProduct.id, quantity: 1 });
      }

      if (error) {
        console.error('❌ Marketplace: Error adding to cart:', error);
        throw error;
      }

      // TRACKER L'AJOUT AU PANIER
      trackAction('product_added_to_cart', {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: 1,
        price: selectedProduct.price,
        seller_id: selectedProduct.seller_id
      });

      Alert.alert('Succès! ✅', 'Produit ajouté au panier');
      await loadCartCount();
    } catch (error: any) {
      console.error('❌ Marketplace: Exception in handleAddToCart:', error);
      Alert.alert('Erreur', error?.message || 'Impossible d\'ajouter au panier');
    }
  };



  const renderSellerReviews = () => {
    if (!selectedSellerId) return null;

    const sellerStat = sellerStats?.[selectedSellerId];

    return (
      <View style={styles.reviewsContainer}>
        <View style={styles.reviewsHeader}>
          <TouchableOpacity
            onPress={() => setIsReviewsVisible(false)}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.reviewsTitle}>Avis clients</Text>
          <View style={{ width: 24 }} />
        </View>

        {sellerStat && (
          <View style={styles.sellerStatsSummary}>
            <View style={styles.statsRow}>
              <View style={styles.starsContainer}>
                {renderStars(sellerStat.average_rating)}
                <Text style={styles.ratingValue}>
                  {sellerStat.average_rating?.toFixed(1) || '0.0'}
                </Text>
              </View>
              <Text style={styles.totalReviews}>
                {sellerStat.total_ratings} avis
              </Text>
            </View>

            {sellerStat.average_rating >= 4.0 && (
              <View style={styles.sellerBadge}>
                <Text style={styles.sellerBadgeText}>
                  {sellerStat.average_rating >= 4.8 ? '🏆 Vendeur d\'Or' :
                    sellerStat.average_rating >= 4.5 ? '🥈 Vendeur d\'Argent' :
                      '🥉 Vendeur de Bronze'}
                </Text>
              </View>
            )}
          </View>
        )}

        <ScrollView style={styles.reviewsList}>
          {sellerReviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <Icon name="chatbubble" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyReviewsText}>Aucun avis pour le moment</Text>
            </View>
          ) : (
            sellerReviews.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewStars}>
                    {renderStars(review.overall_rating)}
                    <Text style={styles.reviewRating}>
                      {review.overall_rating}
                    </Text>
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>

                {review.review_text && (
                  <Text style={styles.reviewText}>
                    {review.review_text}
                  </Text>
                )}

                <View style={styles.reviewCriteria}>
                  <View style={styles.criterion}>
                    <Text style={styles.criterionLabel}>Qualité produit</Text>
                    <View style={styles.criterionStars}>
                      {renderStars(review.product_quality)}
                    </View>
                  </View>
                  <View style={styles.criterion}>
                    <Text style={styles.criterionLabel}>Communication</Text>
                    <View style={styles.criterionStars}>
                      {renderStars(review.communication)}
                    </View>
                  </View>
                  <View style={styles.criterion}>
                    <Text style={styles.criterionLabel}>Délai livraison</Text>
                    <View style={styles.criterionStars}>
                      {renderStars(review.delivery_time)}
                    </View>
                  </View>
                  <View style={styles.criterion}>
                    <Text style={styles.criterionLabel}>Service</Text>
                    <View style={styles.criterionStars}>
                      {renderStars(review.service_quality)}
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };



  // Regions are now dynamic based on selectedCountry

  const renderCountryFilter = () => (
    <View style={styles.regionSection}>
      <Text style={styles.sectionTitle}>Pays</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.regionContainer}
      >
        <TouchableOpacity
          style={[
            styles.regionFilterButton,
            selectedCountry === 'all' && styles.regionFilterButtonSelected
          ]}
          onPress={() => setSelectedCountry('all')}
        >
          <Text style={[
            styles.regionFilterButtonText,
            selectedCountry === 'all' && styles.regionFilterButtonTextSelected
          ]}>
            🌍 Tous
          </Text>
        </TouchableOpacity>

        {COUNTRIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.regionFilterButton,
              selectedCountry === c.name && styles.regionFilterButtonSelected
            ]}
            onPress={() => setSelectedCountry(c.name)}
          >
            <Text style={{ marginRight: 4 }}>{c.flag}</Text>
            <Text style={[
              styles.regionFilterButtonText,
              selectedCountry === c.name && styles.regionFilterButtonTextSelected
            ]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCategoryFilter = () => (
    <View style={styles.categorySection}>
      {renderCountryFilter()}
      {renderRegionFilter()}
      <Text style={styles.sectionTitle}>Catégories</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonSelected
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <View style={[
              styles.categoryIconContainer,
              selectedCategory === category.id && styles.categoryIconContainerSelected
            ]}>
              <Icon
                name={category.icon as any}
                size={24}
                color={selectedCategory === category.id ? colors.white : colors.orange}
              />
            </View>
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.id && styles.categoryButtonTextSelected
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderRegionFilter = () => {
    if (availableRegions.length === 0) return null; // Don't show if no regions available (e.g. All countries selected)

    return (
      <View style={styles.regionSection}>
        <Text style={styles.sectionTitle}>Région ({selectedCountry})</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionContainer}
        >
          {availableRegions.map((region) => (
            <TouchableOpacity
              key={region.id}
              style={[
                styles.regionFilterButton,
                regionFilter === region.id && styles.regionFilterButtonSelected
              ]}
              onPress={() => setRegionFilter(region.id)}
            >
              <Text style={[
                styles.regionFilterButtonText,
                regionFilter === region.id && styles.regionFilterButtonTextSelected
              ]}>
                {region.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  const renderProductDetail = () => {
    if (!selectedProduct) return null;

    const isOwnProduct = currentUserId && selectedProduct.seller_id === currentUserId;

    // Préparer la liste des images à afficher
    const displayImages = productImages.length > 0
      ? productImages
      : (selectedProduct.image ? [selectedProduct.image] : []);

    return (
      <ScrollView style={styles.productDetailContainer}>
        <View style={styles.productDetailBackHeader}>
          <TouchableOpacity
            onPress={() => setIsProductDetailVisible(false)}
            style={styles.productDetailBackButton}
          >
            <Icon name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Carrousel d'images */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ height: 300 }}
          >
            {displayImages.length > 0 ? (
              displayImages.map((img: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri: getMarketplaceImageUrl(img) }}
                  style={[styles.productDetailImage, { width: width, height: 300 }]}
                  resizeMode="cover"
                />
              ))
            ) : (
              <Image
                source={{ uri: getDefaultImageForCategory(selectedProduct.category) }}
                style={[styles.productDetailImage, { width: width, height: 300 }]}
                resizeMode="cover"
              />
            )}
          </ScrollView>
          {displayImages.length > 1 && (
            <View style={styles.imageCounter}>
              <Icon name="images" size={14} color="#fff" />
              <Text style={styles.imageCounterText}>{displayImages.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.productDetailInfo}>
          <View style={styles.productDetailHeader}>
            <View style={styles.productDetailHeaderLeft}>
              {/* Affichage du Logo et du Nom */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {selectedProduct.logo && getMarketplaceImageUrl(selectedProduct.logo) ? (
                  <Image
                    source={{ uri: getMarketplaceImageUrl(selectedProduct.logo) }}
                    style={styles.productLogo}
                    onError={() => setLogoLoadError(true)}
                  />
                ) : (
                  <View style={[styles.productLogo, { backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' }]}>
                    <Icon name="person" size={24} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={[styles.productDetailName, { marginBottom: 0, flex: 1 }]}>
                  {selectedProduct.name || 'Sans nom'}
                </Text>
              </View>

              {selectedProduct.is_on_sale && selectedProduct.discount_percentage > 0 ? (
                <View style={styles.productDetailPriceContainer}>
                  <Text style={styles.productDetailOriginalPrice}>
                    {(selectedProduct.price || 0).toLocaleString()} CFA
                  </Text>
                  <Text style={styles.productDetailDiscountedPrice}>
                    {((selectedProduct.price || 0) * (1 - selectedProduct.discount_percentage / 100)).toLocaleString()} CFA
                  </Text>
                </View>
              ) : (
                <Text style={styles.productDetailPrice}>
                  {(selectedProduct.price || 0).toLocaleString()} CFA
                </Text>
              )}
            </View>
            {!selectedProduct.in_stock && (
              <View style={styles.soldBadge}>
                <Text style={styles.soldBadgeText}>Vendu</Text>
              </View>
            )}
          </View>

          <View style={styles.productDetailMeta}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={20} color={colors.warning} />
              <Text style={styles.productDetailRating}>{selectedProduct.rating || 0}</Text>
            </View>
          </View>

          {/* --- MODIFICATION : Les actions du propriétaire sont maintenant ici --- */}
          {isOwnProduct && (
            <View style={styles.ownerSection}>
              <View style={styles.ownerBadge}>
                <Icon name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.ownerBadgeText}>Ceci est votre produit</Text>
              </View>

              <View style={styles.ownerActions}>
                <TouchableOpacity
                  style={[styles.ownerActionButton, styles.updateButton]}
                  onPress={() => handleUpdateProduct(selectedProduct.id)}
                >
                  <Icon name="create" size={22} color={colors.white} />
                  <Text style={styles.ownerActionButtonText}>Mettre à jour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ownerActionButton, styles.deleteButton]}
                  onPress={() => handleDeleteProduct(selectedProduct.id)}
                >
                  <Icon name="trash" size={22} color={colors.white} />
                  <Text style={styles.ownerActionButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {selectedProduct.location && (
            <View style={styles.productDetailLocation}>
              <Icon name="location" size={20} color={colors.orange} />
              <View style={styles.productDetailLocationText}>
                <Text style={styles.locationCity}>{selectedProduct.city || selectedProduct.location}</Text>
                {selectedProduct.region && (
                  <Text style={styles.locationRegion}>{selectedProduct.region}</Text>
                )}
              </View>
            </View>
          )}

          <Text style={styles.productDetailDescription}>
            {selectedProduct.description || 'Aucune description disponible'}
          </Text>

          {/* Seller Information */}
          <View style={styles.sellerSection}>
            <Text style={styles.sectionTitle}>Informations du vendeur</Text>
            <View style={styles.sellerInfo}>
              <Icon name="person" size={20} color={colors.primary} />
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>
                  {selectedProduct.farm_name ? selectedProduct.farm_name : 'Vendeur vérifié'}
                </Text>
                <Text style={styles.farmName}>
                  🏡 Ferme partenaire Aviprod
                </Text>
              </View>
            </View>
            {/* Seller Rating */}
            {selectedProduct.seller_id && sellerStats?.[selectedProduct.seller_id] && (
              <View style={styles.sellerRating}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.ratingTitle}>Note du vendeur</Text>
                  <View style={styles.starsContainer}>
                    {renderStars(sellerStats[selectedProduct.seller_id].average_rating)}
                    <Text style={styles.ratingValue}>
                      {sellerStats[selectedProduct.seller_id].average_rating?.toFixed(1) || '0.0'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ratingCount}>
                  ({sellerStats[selectedProduct.seller_id].total_ratings || 0} avis)
                </Text>
                {sellerStats[selectedProduct.seller_id].average_rating >= 4.0 && (
                  <View style={styles.sellerBadge}>
                    <Text style={styles.sellerBadgeText}>
                      {sellerStats[selectedProduct.seller_id].average_rating >= 4.8 ? '🏆 Vendeur d\'Or' :
                        sellerStats[selectedProduct.seller_id].average_rating >= 4.5 ? '🥈 Vendeur d\'Argent' :
                          '🥉 Vendeur de Bronze'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Customer Reviews Section */}
            {selectedProduct.seller_id && sellerStats?.[selectedProduct.seller_id] && sellerStats[selectedProduct.seller_id].total_ratings > 0 && (
              <TouchableOpacity style={styles.reviewsSection} onPress={() => handleViewSellerReviews(selectedProduct.seller_id)}>
                <View style={styles.reviewsHeader}>
                  <Text style={styles.reviewsTitle}>Avis clients</Text>
                  <Icon name="chevron-forward" size={20} color={colors.primary} />
                </View>
                <Text style={styles.reviewsSubtitle}>
                  Voir tous les avis ({sellerStats[selectedProduct.seller_id].total_ratings})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {!isOwnProduct && (
          <>
            <View style={styles.securityNote}>
              <Icon name="shield-checkmark" size={20} color={colors.success} />
              <Text style={styles.securityNoteText}>
                Communication anonyme et sécurisée. Aucune information personnelle n'est partagée.
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.contactButton]}
                onPress={handleContactSeller}
              >
                <Icon name="chatbubble" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Contacter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cartButton]}
                onPress={handleAddToCart}
                disabled={!selectedProduct.in_stock}
              >
                <Icon name="cart" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>
                  {selectedProduct.in_stock ? 'Ajouter' : 'Vendu'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    );
  };

  const renderStars = (rating: number, size = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Icon key={`full-${i}`} name="star" size={size} color={colors.warning} />);
    }
    if (hasHalfStar) {
      stars.push(<Icon key="half" name="star-half" size={size} color={colors.warning} />);
    }
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Icon key={`empty-${i}`} name="star-outline" size={size} color={colors.warning} />);
    }
    return stars;
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingBottom: 10,
    },
    backButton: {
      marginRight: 16,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    headerButton: {
      position: 'relative',
    },
    cartBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.orange,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    cartBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#000000',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    searchContainer: {
      paddingHorizontal: 20,
      marginBottom: 16,
      gap: 12,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: '#000000',
    },
    locationFilterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.orange,
    },
    locationInput: {
      flex: 1,
      fontSize: 14,
      color: '#000000',
    },
    kycBanner: {
      marginHorizontal: 20,
      marginBottom: 20,
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    kycBannerIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    kycBannerContent: {
      flex: 1,
    },
    kycBannerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.white,
      marginBottom: 4,
    },
    kycBannerText: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
      marginBottom: 12,
      lineHeight: 20,
    },
    kycBannerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    kycBannerButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.white,
    },
    kycStatusBanner: {
      marginHorizontal: 20,
      marginBottom: 20,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kycStatusContent: {
      flex: 1,
    },
    kycStatusTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    kycStatusText: {
      fontSize: 14,
      color: colors.textSecondary,
    },

    categorySection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#000000',
      marginBottom: 12,
      paddingHorizontal: 20,
    },
    categoryScroll: {
      marginBottom: 0,
    },
    categoryContainer: {
      paddingHorizontal: 20,
      gap: 16,
    },
    categoryButton: {
      alignItems: 'center',
      gap: 8,
    },
    categoryButtonSelected: {
      // Add this style if needed
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.backgroundAlt,
      borderWidth: 2,
      borderColor: colors.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryIconContainerSelected: {
      backgroundColor: colors.orange,
      borderColor: colors.orange,
    },
    categoryButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#000000',
    },
    categoryButtonTextSelected: {
      color: colors.orange,
    },
    regionSection: {
      marginBottom: 20,
    },
    regionContainer: {
      paddingHorizontal: 20,
      gap: 12,
    },
    regionFilterButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    regionFilterButtonSelected: {
      backgroundColor: colors.orange,
      borderColor: colors.orange,
    },
    regionFilterButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#000000',
    },
    regionFilterButtonTextSelected: {
      color: colors.white,
    },
    showcaseSection: {
      marginBottom: 24,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 16,
      marginHorizontal: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    showcaseHeader: {
      padding: 20,
      paddingBottom: 16,
    },
    showcaseTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    showcaseEmoji: {
      fontSize: 24,
    },
    showcaseTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    showcaseSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 32,
    },
    showcaseContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 16,
    },
    showcaseCard: {
      width: 160,
      backgroundColor: colors.background,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    showcaseImageContainer: {
      position: 'relative',
    },
    showcaseImage: {
      width: '100%',
      height: 140,
      backgroundColor: colors.border,
    },
    showcaseBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    showcaseBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    topPickBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.warning,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    topPickText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    soldOutBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    soldOutText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.white,
    },
    showcaseInfo: {
      padding: 12,
    },
    showcaseName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      lineHeight: 18,
    },
    showcasePrice: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 4,
    },
    showcaseRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    showcaseRatingText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    productsSection: {
      marginBottom: 20,
    },
    scrollView: {
      flex: 1,
    },
    productsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 12,
    },
    productCard: {
      width: '48%',
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    productImage: {
      width: '100%',
      height: 120,
      backgroundColor: colors.border,
    },
    productInfo: {
      padding: 12,
    },
    productName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 4,
    },
    productDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    productFarmName: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    originalPrice: {
      fontSize: 14,
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
      marginRight: 5,
    },
    discountedPrice: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.error,
    },
    productPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.orange,
    },
    productDetailPriceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    productDetailOriginalPrice: {
      fontSize: 18,
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
      marginRight: 8,
    },
    productDetailDiscountedPrice: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.error,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
    },
    errorContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 12,
    },
    errorText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.error,
      textAlign: 'center',
    },
    errorSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.orange,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.white,
    },
    productDetailContainer: {
      flex: 1,
    },
    productDetailBackHeader: {
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 10,
    },
    productDetailBackButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    productDetailImage: {
      width: '100%',
      height: 200,
      backgroundColor: colors.border,
    },
    productLogo: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageCounter: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    imageCounterText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '700',
    },
    productDetailInfo: {
      padding: 20,
    },
    productDetailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    productDetailHeaderLeft: {
      flex: 1,
    },
    productDetailName: {
      fontSize: 24,
      fontWeight: '700',
      color: '#000000',
      marginBottom: 8,
    },
    productDetailPrice: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.orange,
    },
    soldBadge: {
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    soldBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.white,
    },
    productDetailMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    productDetailRating: {
      fontSize: 16,
      fontWeight: '500',
      color: '#000000',
    },
    productDetailDescription: {
      fontSize: 16,
      color: '#000000',
      lineHeight: 24,
      marginBottom: 16,
    },
    productDetailLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.orange + '20',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    productDetailLocationText: {
      flex: 1,
    },
    locationCity: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.orange,
      marginBottom: 2,
    },
    locationRegion: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    ownerSection: {
      marginTop: 8,
    },
    ownerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.success + '20',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    ownerBadgeText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.success,
    },
    ownerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    ownerActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      borderRadius: 12,
      gap: 8,
    },
    updateButton: {
      backgroundColor: colors.primary,
    },
    deleteButton: {
      backgroundColor: colors.error,
    },
    ownerActionButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.white,
    },
    securityNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.success + '20',
      padding: 12,
      borderRadius: 8,
      marginBottom: 24,
    },
    securityNoteText: {
      flex: 1,
      fontSize: 12,
      color: '#000000',
      lineHeight: 16,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 160,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    contactButton: {
      flex: 1,
      backgroundColor: colors.accentSecondary,
      paddingVertical: 18,
      borderRadius: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    cartButton: {
      flex: 2,
      backgroundColor: colors.orange,
      paddingVertical: 20,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.white,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 12,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    bottomPadding: {
      height: 100,
    },
    sellerSection: {
      marginBottom: 16,
    },
    sellerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.primary + '10',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + '20',
    },
    sellerDetails: {
      flex: 1,
    },
    sellerName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 4,
    },
    farmName: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    sellerRating: {
      marginTop: 16,
      padding: 16,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ratingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    ratingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    starsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.warning,
    },
    ratingCount: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    sellerBadge: {
      backgroundColor: colors.warning + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      alignSelf: 'flex-start',
    },
    sellerBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.warning,
    },
    reviewsSection: {
      marginTop: 16,
      padding: 16,
      backgroundColor: colors.primary + '10',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + '20',
    },
    reviewsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    reviewsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    reviewsSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    reviewsContainer: {
      flex: 1,
    },
    reviewsList: {
      flex: 1,
    },
    sellerStatsSummary: {
      padding: 20,
      backgroundColor: colors.background,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    totalReviews: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyReviews: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyReviewsText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
      textAlign: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 20,
    },
    seeAllText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    reviewCard: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    reviewStars: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    reviewRating: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.warning,
    },
    reviewDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    reviewText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 12,
    },
    reviewCriteria: {
      gap: 8,
    },
    criterion: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    criterionLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
    },
    criterionStars: {
      flexDirection: 'row',
      gap: 2,
    },
  });

  const renderRecommendations = () => {
    const recommendedProducts = sponsored.slice(0, 4);
    if (recommendedProducts.length === 0) return null;

    return (
      <View style={styles.showcaseSection}>
        <View style={styles.showcaseHeader}>
          <View style={styles.showcaseTitleContainer}>
            <Text style={styles.showcaseEmoji}>🤖</Text>
            <Text style={styles.showcaseTitle}>Recommandé pour vous</Text>
          </View>
          <Text style={styles.showcaseSubtitle}>Sélection personnalisée par l'IA</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.showcaseContainer}
        >
          {recommendedProducts.map((product, index) => (
            <TouchableOpacity
              key={product.id}
              style={styles.showcaseCard}
              onPress={() => handleProductPress(product)}
            >
              <View style={styles.showcaseImageContainer}>
                <Image
                  source={{ uri: product.image ? getMarketplaceImageUrl(product.image) : getDefaultImageForCategory(product.category) }}
                  style={styles.showcaseImage}
                  onError={(e) => {
                    console.log('❌ Recommendation image load error for product', product.id, ':', e.nativeEvent.error);
                    console.log('🔍 Image path was:', product.image);
                  }}
                />
                <View style={styles.showcaseBadge}>
                  <Text style={styles.showcaseBadgeText}>IA</Text>
                </View>
                {index === 0 && (
                  <View style={styles.topPickBadge}>
                    <Text style={styles.topPickText}>⭐ TOP</Text>
                  </View>
                )}
                {!product.in_stock && (
                  <View style={styles.soldOutBadge}>
                    <Text style={styles.soldOutText}>Vendu</Text>
                  </View>
                )}
              </View>

              <View style={styles.showcaseInfo}>
                <Text style={styles.showcaseName} numberOfLines={2}>{product.name || 'Sans nom'}</Text>
                <Text style={styles.showcasePrice}>{(product.price || 0).toLocaleString()} CFA</Text>
                <View style={styles.showcaseRating}>
                  <Icon name="star" size={12} color={colors.warning} />
                  <Text style={styles.showcaseRatingText}>{product.rating || 4.5}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };



  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/dashboard')} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>Produits et services avicoles</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setIsCartVisible(true)}
          >
            <Icon name="cart" size={24} color="#000000" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/AddProductScreen')}
          >
            <Icon name="add-circle" size={24} color={colors.orange} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des produits..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.orange}
          />
        }
      >

        {isLoadingProducts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.orange} />
            <Text style={styles.loadingText}>Chargement des produits...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>Erreur de chargement</Text>
            <Text style={styles.errorSubtext}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setIsLoadingProducts(true);
                loadProducts().finally(() => setIsLoadingProducts(false));
              }}
            >
              <Icon name="refresh" size={20} color={colors.white} />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { marginBottom: 0, paddingHorizontal: 0 }]}>
                Tous les Produits ({filteredProducts.length})
              </Text>
              <TouchableOpacity onPress={() => setHideSold(!hideSold)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 10 }}>
                <Icon name={hideSold ? "eye-off" : "eye"} size={18} color={colors.primary} />
                <Text style={styles.seeAllText}>{hideSold ? "Afficher vendus" : "Masquer vendus"}</Text>
              </TouchableOpacity>
            </View>

            {/* --- CORRECTION : Nettoyage des appels en double --- */}
            <>
              {renderCategoryFilter()}
              {renderRecommendations()}

              <View style={styles.productsGrid}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onPress={() => handleProductPress(product)}
                    currentUserId={currentUserId} />
                ))}
              </View>
              {filteredProducts.length === 0 && (
                <View style={styles.emptyState}>
                  <Icon name="cart" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyStateText}>Aucun produit trouvé</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {products.length === 0
                      ? 'Ajoutez le premier produit au marketplace!'
                      : 'Essayez de changer de catégorie ou de recherche'}
                  </Text>
                </View>
              )}
            </>
          </View>

        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <SimpleBottomSheet
        isVisible={isProductDetailVisible}
        onClose={() => setIsProductDetailVisible(false)}
      >
        {renderProductDetail()}
      </SimpleBottomSheet>

      <SimpleBottomSheet
        isVisible={isChatVisible}
        onClose={() => setIsChatVisible(false)}
      >
        {selectedProduct && (
          <MarketplaceChat
            productId={selectedProduct.id}
            productName={selectedProduct.name || 'Produit'}
            sellerId={selectedProduct.seller_id || ''}
            sellerName="Vendeur"
            currentUserId={currentUserId}
            onClose={() => setIsChatVisible(false)}
          />
        )}
      </SimpleBottomSheet>

      <SimpleBottomSheet
        isVisible={isCartVisible}
        onClose={() => setIsCartVisible(false)}
      >
        <ShoppingCart
          onClose={() => setIsCartVisible(false)}
          onCheckout={() => {
            setIsCartVisible(false);
            loadCartCount();
          }}
        />
      </SimpleBottomSheet>

      <SimpleBottomSheet
        isVisible={isReviewsVisible}
        onClose={() => setIsReviewsVisible(false)}
      >
        {renderSellerReviews()}
      </SimpleBottomSheet>

      {/* Google AdMob Banner */}
      <GoogleAdBanner />
    </SafeAreaView>
  );
}
