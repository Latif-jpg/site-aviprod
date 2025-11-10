import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';

const FAQ_DATA = [
  {
    question: "Comment ajouter un nouveau lot de volailles ?",
    answer: "Allez sur l'écran 'Lots' depuis la barre de navigation, puis cliquez sur le bouton flottant '+' en bas à droite. Remplissez ensuite le formulaire avec les informations de votre lot.",
  },
  {
    question: "Comment vendre un produit sur le Marketplace ?",
    answer: "Pour vendre, vous devez d'abord faire vérifier votre compte. Allez sur le Marketplace, cliquez sur le bouton '+' et suivez les instructions pour la vérification KYC. Une fois approuvé, vous pourrez ajouter des produits.",
  },
  {
    question: "Comment fonctionne l'analyse de santé par IA ?",
    answer: "Allez dans la section 'Santé', puis 'Analyse par IA'. Prenez des photos de vos volailles, décrivez les symptômes et lancez l'analyse. L'IA vous donnera un diagnostic probable et des recommandations. Notez que cela ne remplace pas l'avis d'un vétérinaire.",
  },
];

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity style={styles.faqQuestionContainer} onPress={toggleOpen}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Icon name={isOpen ? 'chevron-down' : 'chevron-forward'} size={20} color={colors.primary} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

export default function HelpSupportScreen() {
  const supportEmail = 'aviprod099@gmail.com';

  const handleContactSupport = () => {
    const url = `mailto:${supportEmail}?subject=Support AviprodApp`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Erreur', `Impossible d'ouvrir l'application de messagerie. Vous pouvez nous contacter à ${supportEmail}`);
        }
      })
      .catch(err => console.error('An error occurred', err));
  };

  const handleReportProblem = () => {
    const url = `mailto:${supportEmail}?subject=Rapport de problème - AviprodApp`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Erreur', `Impossible d'ouvrir l'application de messagerie. Vous pouvez nous contacter à ${supportEmail}`);
        }
      })
      .catch(err => console.error('An error occurred', err));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aide & Support</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <TouchableOpacity style={styles.menuItem} onPress={handleContactSupport}>
              <Icon name="mail" size={24} color={colors.primary} />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Contacter le support</Text>
                <Text style={styles.menuSubtitle}>Nous répondons généralement en 24h</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleReportProblem}>
              <Icon name="bug" size={24} color={colors.error} />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Signaler un problème</Text>
                <Text style={styles.menuSubtitle}>Aidez-nous à améliorer l'application</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Foire Aux Questions (FAQ)</Text>
            {FAQ_DATA.map((item, index) => (
              <FAQItem key={index} question={item.question} answer={item.answer} />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Légal</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('CGU', 'Page des Conditions Générales d\'Utilisation à venir.')}>
              <Icon name="document-text" size={24} color={colors.textSecondary} />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Conditions Générales d'Utilisation</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Confidentialité', 'Page de la Politique de Confidentialité à venir.')}>
              <Icon name="shield-checkmark" size={24} color={colors.textSecondary} />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Politique de Confidentialité</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  faqItem: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  faqQuestionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  faqAnswerContainer: {
    padding: 16,
    paddingTop: 0,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});