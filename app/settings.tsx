import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  Share,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config'; // Assurez-vous que le chemin est correct
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { router } from 'expo-router';

// =================================================================
// Le composant pour la section de parrainage
// =================================================================
const ReferralSection = () => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferralCode = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Utilisateur non trouvé');

        const { data, error } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', user.id)
          .limit(1); // Fetch as an array with a max of 1 item

        if (error) throw error;

        // If data is an array and has at least one item, take the first one.
        // This is more robust than .single() if there are duplicate rows in the DB.
        if (data && data.length > 0) {
          // --- CORRECTION : Si le profil existe mais n'a pas de code, en générer un ---
          if (data[0].referral_code) {
            setReferralCode(data[0].referral_code);
          } else {
            console.log('Profil existant sans code, génération...');
            const { data: newCodeData } = await supabase.rpc('generate_unique_referral_code');
            if (newCodeData) {
              await supabase.from('profiles').update({ referral_code: newCodeData }).eq('id', user.id);
              setReferralCode(newCodeData);
            }
          }
        } else {
          // --- NOUVEAU : Si aucun profil n'est trouvé, en créer un ---
          console.log('Aucun profil trouvé, création d\'un nouveau profil...');
          const { data: newCodeData } = await supabase.rpc('generate_unique_referral_code');
          if (newCodeData) {
            // --- CORRECTION: Use upsert() instead of insert() ---
            // upsert will create the profile if it doesn't exist, or update it if it does.
            // This avoids "duplicate key" errors if the profile exists but is not visible due to RLS.
            const { error: insertError } = await supabase
              .from('profiles')
              .upsert({ id: user.id, referral_code: newCodeData });

            if (insertError) throw insertError;
            setReferralCode(newCodeData);
            console.log('Profil créé avec le code:', newCodeData);
          }
        }
      } catch (error) {
        console.error(
          'Erreur de chargement du code de parrainage:',
          (error as Error).message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReferralCode();
  }, []);

  const onShare = async () => {
    if (!referralCode) return;
    try {
      // Partager le code de parrainage avec instructions
      const deepLink = `aviprodapp://auth?referral_code=${referralCode}`;
      const message = `Rejoins-moi sur Aviprod et gagne 50 avicoins bonus !\n\nCode de parrainage : ${referralCode}\n\nOu utilise ce lien : ${deepLink}`;

      await Share.share({
        message: message,
        title: 'Rejoins Aviprod !',
      });
    } catch (error) {
      alert((error as Error).message);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  if (!referralCode) {
    return (
      <Text style={styles.errorText}>
        Impossible de charger votre code de parrainage.
      </Text>
    );
  }

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.title}>Partagez et gagnez des récompenses !</Text>
      <Text style={styles.description}>Votre code de parrainage unique :</Text>
      <Text style={styles.code}>{referralCode}</Text>
      <Button onPress={onShare} title="Partager mon lien" />
    </View>
  );
};

// =================================================================
// L'écran de paramètres qui utilise le composant de parrainage
// =================================================================
export default function SettingsScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Code de parrainage</Text>
        </View>

        {user && (
          <View style={styles.userInfo}>
            <Text>Connecté en tant que : {user.email}</Text>
          </View>
        )}

        {/* C'est ici que nous ajoutons la section de parrainage ! */}
        <ReferralSection />

        {/* Vous pouvez ajouter d'autres paramètres ici */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  userInfo: { paddingHorizontal: 16, marginBottom: 20 },
  sectionContainer: { margin: 16, padding: 20, alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.text },
  description: { fontSize: 14, color: colors.textSecondary },
  code: { fontSize: 24, fontWeight: 'bold', marginVertical: 15, color: colors.primary },
  loader: { marginVertical: 20 },
  errorText: { color: 'red', fontStyle: 'italic' },
});