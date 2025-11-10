import React, { useState, useEffect } from 'react';
import { View, Alert, ActivityIndicator, Text } from 'react-native';
import AddProductForm from '../components/AddProductForm';
import SellerKYCVerification from '../components/SellerKYCVerification';
import { supabase } from '../config'; // Import supabase directly
import { colors } from '../styles/commonStyles';

interface AddProductScreenProps {
  onProductAdded: () => void;
  onCancel: () => void;
}

const AddProductScreen: React.FC<AddProductScreenProps> = ({ onProductAdded, onCancel }) => {
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [isKYCVisible, setIsKYCVisible] = useState(false);

  useEffect(() => {
    checkVerification();
  }, []);

  const checkVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('seller_verifications')
        .select('verification_status')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      const status = data?.verification_status || null;
      setVerificationStatus(status);

      if (status !== 'approved') {
        handleVerificationStatus(status);
      }
    } catch (error) {
      console.error("Error checking seller verification:", error);
      Alert.alert("Erreur", "Impossible de vérifier votre statut de vendeur.");
      onCancel();
    }
  };

  const handleVerificationStatus = (status: string | null) => {
    if (status === 'pending') {
      Alert.alert(
        'Vérification en cours',
        'Votre demande est en cours d\'examen. Vous pourrez vendre une fois approuvé.',
        [{ text: 'OK', onPress: onCancel }]
      );
    } else if (status === 'rejected') {
      Alert.alert(
        'Vérification Refusée',
        'Votre demande a été refusée. Veuillez contacter le support.',
        [{ text: 'OK', onPress: onCancel }]
      );
    } else {
      Alert.alert(
        'Vérification Requise',
        'Pour vendre, vous devez être vérifié. Voulez-vous commencer le processus KYC ?',
        [
          { text: 'Plus tard', style: 'cancel', onPress: onCancel },
          { text: 'Commencer', onPress: () => setIsKYCVisible(true) }
        ]
      );
    }
  };

  const handleKYCSubmitted = () => {
    setIsKYCVisible(false);
    Alert.alert(
      'Demande Envoyée',
      'Votre demande de vérification a été envoyée. Vous recevrez une notification une fois examinée.',
      [{ text: 'OK', onPress: onCancel }]
    );
  };

  if (isKYCVisible) {
    return (
      <SellerKYCVerification
        onVerificationSubmitted={handleKYCSubmitted}
        onCancel={onCancel}
      />
    );
  }

  if (verificationStatus === 'approved') {
    return (
      <AddProductForm
        onSubmit={onProductAdded}
        onCancel={onCancel}
      />
    );
  }

  // Show a loading or placeholder view while checking verification
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text>Vérification de votre statut de vendeur...</Text>
    </View>
  );
};

export default AddProductScreen;