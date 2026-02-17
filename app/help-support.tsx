import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';

const FAQ_DATA = [
  {
    question: "Tableau de bord : À quoi ça sert ?",
    answer: "Le tableau de bord est votre centre de commandement. Il vous donne une vue d'ensemble de votre exploitation en temps réel. Vous y trouverez des indicateurs clés (KPI) comme la mortalité, la consommation d'aliments et vos finances. Il inclut aussi des alertes intelligentes pour vous prévenir en cas de problème (ex: stock bas, risque de maladie) et des raccourcis vers toutes les fonctionnalités.",
  },
  {
    question: "Gestion des Lots : Comment créer et suivre un lot ?",
    answer: "La fonctionnalité 'Lots' permet de gérer vos groupes de volailles. Pour créer un lot, allez dans l'onglet 'Lots' et cliquez sur le bouton '+'. Remplissez les détails (type de volaille, nombre, date d'arrivée). Une fois créé, cliquez sur le lot pour le suivre : enregistrez la mortalité quotidienne, la consommation d'aliments et le poids. L'IA analysera ces données pour optimiser vos performances.",
  },
  {
    question: "Santé : Comment utiliser l'analyse IA ?",
    answer: "La section 'Santé' vous aide à prévenir et traiter les maladies. C'est ici que vous mettez à jour la mortalité quotidienne pour suivre l'état de vos lots. Utilisez aussi le scanner IA pour obtenir une première orientation. ATTENTION : Cette analyse ne remplace pas un vétérinaire ; vous devez impérativement consulter un professionnel pour confirmer tout diagnostic.",
  },
  {
    question: "Alimentation : Comment optimiser la nutrition ?",
    answer: "La section 'Alimentation' est dédiée à la stratégie nutritionnelle de vos lots. Vous pouvez y configurer des rations précises (manuelles ou via l'IA) adaptées à l'âge de vos volailles. Pour y accéder, cliquez sur 'Alimentation' dans le dashboard. C'est l'outil idéal pour maximiser la croissance tout en minimisant les gaspillages.",
  },
  {
    question: "Stock : Comment éviter les ruptures ?",
    answer: "Dans 'Stock', vous gérez tout votre inventaire : aliments, médicaments et équipements. Enregistrez votre volume d'achats pour mettre à jour les quantités. L'application calcule automatiquement votre autonomie restante et vous envoie des alertes 'Stock Bas' ou 'Rupture'. Vous pouvez même racheter directement vos besoins via le Marché.",
  },
  {
    question: "Finances : Comment suivre ma rentabilité ?",
    answer: "La fonctionnalité 'Finances' enregistre automatiquement vos dépenses (aliments, vaccins, achats de poussins) et vos revenus (ventes d'oeufs ou de poulets). Vous obtenez un bilan financier clair avec votre marge bénéficiaire. Utilisez le conseiller financier IA pour obtenir des recommandations d'économies.",
  },
  {
    question: "Marché : Comment vendre mes produits ?",
    answer: "Le 'Marché' est votre espace de vente en ligne. Pour vendre, complétez d'abord votre profil vendeur (KYC). Ensuite, publiez vos offres (poulets, oeufs) avec des photos. Les acheteurs pourront vous contacter directement. Vous recevrez des notifications pour chaque commande.",
  },
  {
    question: "Suivi : Quel est son rôle ?",
    answer: "Le 'Suivi' vous permet de piloter toute la logistique de votre exploitation. Son rôle principal est de suivre vos ventes de produits, vos achats d'intrants et l'état de vos livraisons en temps réel. C'est l'outil indispensable pour s'assurer que vos commandes arrivent à bon port et que vos transactions sont sécurisées.",
  },
  {
    question: "Avicoins : C'est quoi et comment en obtenir ?",
    answer: "Les Avicoins sont la monnaie virtuelle d'Aviprod. Ils vous permettent d'accéder à des fonctionnalités premium comme les analyses IA avancées ou les conseils financiers. Vous pouvez en obtenir de trois manières : 1. En les achetant directement dans votre profil. 2. En parrainant des amis via votre code de parrainage (vous gagnez des Avicoins pour chaque nouvel inscrit). 3. En regardant des vidéos publicitaires dans le menu.",
  },
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
    answer: "Allez dans la section 'Santé', puis 'Analyse par IA'. Prenez des photos, décrivez les symptômes et lancez l'analyse. L'IA vous donnera une assistance au diagnostic. Notez bien que cela ne remplace JAMAIS l'avis d'un vétérinaire. Vous devez obligatoirement contacter un vétérinaire pour valider les résultats de l'IA avant tout traitement.",
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
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/terms-of-use')}>
              <Icon name="document-text" size={24} color={colors.textSecondary} />
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Conditions Générales d'Utilisation</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy-policy')}>
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