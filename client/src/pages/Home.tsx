/**
 * AVIPROD Landing Page - Home Component
 * Design Philosophy: Agricultural Technology Modernism
 * - Asymmetric layouts with dynamic sections
 * - Professional green + terracotta/orange palette
 * - Poppins (bold titles) + Inter (body text)
 * - Subtle animations and smooth transitions
 */

import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Users, TrendingUp, Zap, Shield, Play, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import ContactForm from "@/components/ContactForm";

export default function Home() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    // Redirect to APK download
    window.location.href = 'https://github.com/Latif-jpg/aviprod-android/releases/latest/download/aviprod12227.apk';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img src="/images/icon-prod.png" alt="AVIPROD Logo" className="w-10 h-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-bold text-primary text-lg">AVIPROD</span>
              <span className="text-xs text-muted-foreground">Green Eco Tech</span>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            className="bg-primary hover:bg-primary/90 text-white gap-2"
          >
            <>
              <Download size={18} />
              Télécharger l'APK
            </>
          </Button>
        </div>
      </nav>

      {/* Hero Section - Asymmetric Layout */}
      <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Image */}
            <div className="relative order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/images/hero-background.png"
                  alt="AVIPROD Dashboard"
                  className="w-full h-auto object-cover"
                />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent/20 rounded-full blur-3xl"></div>
            </div>

            {/* Right: Content - Offset upward */}
            <div className="order-1 lg:order-2 lg:pl-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-accent font-semibold text-sm uppercase tracking-wide">
                    Révolutionnez votre élevage
                  </p>
                  <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                    Gestion d'Élevage de Volaille <span className="text-primary">Intelligente</span>
                  </h1>
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  AVIPROD est la solution complète de gestion d'élevage de volaille qui transforme votre ferme. Automatisez vos tâches, optimisez vos rendements et augmentez vos profits avec une technologie moderne et accessible.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    onClick={handleDownload}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    <Download size={20} />
                    Télécharger Maintenant
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5"
                  >
                    En Savoir Plus
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="flex items-center gap-6 pt-6 border-t border-border">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">5000+</p>
                    <p className="text-sm text-muted-foreground">Éleveurs Actifs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">98%</p>
                    <p className="text-sm text-muted-foreground">Satisfaction</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">24/7</p>
                    <p className="text-sm text-muted-foreground">Support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Asymmetric Grid */}
      <section className="py-20 md:py-28 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-2">
              Fonctionnalités Puissantes
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Une plateforme complète conçue spécifiquement pour les éleveurs de volaille professionnels
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/30">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Users className="text-primary" size={28} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Gestion de Lot</h3>
              <p className="text-muted-foreground leading-relaxed">
                Gérez vos lots de poules facilement. Suivi en temps réel du nombre de sujets, de l'âge, et de l'état sanitaire.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/30 md:translate-y-4">
              <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Shield className="text-accent" size={28} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Diagnostic Santé</h3>
              <p className="text-muted-foreground leading-relaxed">
                Détectez les problèmes de santé rapidement. Diagnostic automatique basé sur les symptômes observés.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/30">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Zap className="text-primary" size={28} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Ration & Stock Automatique</h3>
              <p className="text-muted-foreground leading-relaxed">
                Calcul automatique des rations alimentaires. Gestion d'inventaire et alertes de réapprovisionnement.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/30">
              <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <CheckCircle className="text-accent" size={28} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Calendrier Vaccinal Auto</h3>
              <p className="text-muted-foreground leading-relaxed">
                Calendrier vaccinal automatisé. Rappels pour les vaccinations et suivi complet des traitements.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/30 md:translate-y-4">
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <TrendingUp className="text-primary" size={28} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Vente & Achat Direct</h3>
              <p className="text-muted-foreground leading-relaxed">
                Plateforme de vente directe intégrée. Connectez-vous avec les acheteurs et augmentez vos revenus.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/30">
              <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Zap className="text-accent" size={28} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Finance & Livraison</h3>
              <p className="text-muted-foreground leading-relaxed">
                Gestion financière complète et livraison intégrée. Suivi des dépenses et des revenus en temps réel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Illustration Section */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Illustration */}
            <div className="relative">
              <img
                src="/images/features-illustration.png"
                alt="AVIPROD Features"
                className="w-full h-auto object-cover rounded-2xl"
              />
            </div>

            {/* Right: Benefits */}
            <div className="space-y-8">
              <div>
                <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-2">
                  Avantages Clés
                </p>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                  Augmentez votre productivité
                </h2>
              </div>

              {/* Benefit items */}
              <div className="space-y-6">
                {[
                  {
                    title: "Économisez du Temps",
                    description: "Automatisez 80% de vos tâches administratives et concentrez-vous sur la croissance"
                  },
                  {
                    title: "Réduisez les Coûts",
                    description: "Optimisez les rations alimentaires et réduisez le gaspillage de 30%"
                  },
                  {
                    title: "Améliorez la Santé",
                    description: "Détectez les problèmes de santé plus tôt et réduisez la mortalité"
                  },
                  {
                    title: "Augmentez les Revenus",
                    description: "Vendez directement et accédez à plus de clients grâce à notre plateforme"
                  }
                ].map((benefit, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                        <CheckCircle className="text-primary" size={24} />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{benefit.title}</h4>
                      <p className="text-muted-foreground text-sm">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Media Library Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-2">
              Médiathèque
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Galerie Multimédia
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez AVIPROD en action à travers nos vidéos et notre galerie photos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Video Item Example */}
            <div className="group relative rounded-xl overflow-hidden shadow-md aspect-video bg-black">
              {/* Mettez votre vidéo dans le dossier public/videos et changez le nom ici */}
              <video
                className="w-full h-full object-cover"
                controls
                poster="/images/hero-background.png"
              >
                <source src="/videos/presentation.mp4" type="video/mp4" />
                Votre navigateur ne supporte pas la vidéo.
              </video>
            </div>

            {/* Image Item Example 1 */}
            <div className="group relative rounded-xl overflow-hidden shadow-md aspect-video">
              {/* Mettez votre image dans public/images et changez le nom ici */}
              <img src="/images/votre-image-1.jpg" alt="Galerie 1" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-4 right-4 bg-black/50 p-2 rounded-lg backdrop-blur-sm">
                <ImageIcon className="text-white" size={20} />
              </div>
            </div>

            {/* Image Item Example 2 */}
            <div className="group relative rounded-xl overflow-hidden shadow-md aspect-video">
              <img src="/images/votre-image-2.jpg" alt="Galerie 2" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-2">
              Témoignages
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Ce que disent nos utilisateurs
            </h2>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Kofi Mensah",
                farm: "Ferme Mensah, Ghana",
                text: "AVIPROD a transformé ma ferme. J'ai augmenté ma production de 40% en 6 mois.",
                rating: 5
              },
              {
                name: "Aminata Diallo",
                farm: "Élevage Diallo, Burkina Faso",
                text: "L'application est facile à utiliser et le support client est excellent. Hautement recommandé!",
                rating: 5
              },
              {
                name: "Ibrahim Traoré",
                farm: "Ferme Traoré, Mali",
                text: "Avec AVIPROD, je gère 3000 poules sans stress. Les alertes automatiques me sauvent du temps.",
                rating: 5
              }
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-xl p-8 shadow-md border border-border hover:shadow-lg transition-shadow">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-accent">★</span>
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed italic">
                  "{testimonial.text}"
                </p>
                <div>
                  <p className="font-bold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.farm}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary/80 opacity-90"></div>
        <div className="absolute inset-0">
          <img
            src="/images/cta-section-background.png"
            alt="Background"
            className="w-full h-full object-cover opacity-20"
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Prêt à transformer votre élevage?
            </h2>
            <p className="text-lg text-white/90 mb-8 leading-relaxed">
              Rejoignez des milliers d'éleveurs qui utilisent AVIPROD pour augmenter leur productivité et leurs revenus.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleDownload}
                size="lg"
                className="bg-white text-primary hover:bg-white/90 gap-2 font-semibold"
              >
                <Download size={20} />
                Télécharger l'APK
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                Demander une Démo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 md:py-28 bg-secondary/30">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: Contact Info */}
            <div className="space-y-8">
              <div>
                <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-2">
                  Nous Contacter
                </p>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                  Vous avez des questions ?
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Notre equipe est disponible pour repondre a vos questions et vous aider a mettre en place AVIPROD dans votre ferme.
                </p>
              </div>

              {/* Contact Methods */}
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                      <span className="text-primary text-xl">📧</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Email</h4>
                    <p className="text-muted-foreground">contact@aviprod.com</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                      <span className="text-primary text-xl">📞</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Telephone</h4>
                    <p className="text-muted-foreground">+226 XX XX XX XX</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                      <span className="text-primary text-xl">📍</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Localisation</h4>
                    <p className="text-muted-foreground">Ouagadougou, Burkina Faso</p>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-white rounded-lg p-6 border border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Temps de reponse :</span> Nous repondons generalement dans les 24 heures.
                </p>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-border">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/images/icon-prod.png" alt="AVIPROD Logo" className="w-10 h-10 object-contain" />
                <span className="font-bold text-lg">AVIPROD</span>
              </div>
              <p className="text-white/70 text-sm">
                Gestion d'élevage de volaille intelligente pour l'Afrique.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Produit</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><a href="#" className="hover:text-white transition">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-white transition">Tarifs</a></li>
                <li><a href="#" className="hover:text-white transition">Télécharger</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Entreprise</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><a href="#" className="hover:text-white transition">À propos</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Légal</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><a href="#" className="hover:text-white transition">Confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition">Conditions</a></li>
                <li><a href="#" className="hover:text-white transition">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-8 text-center text-white/70 text-sm">
            <p>&copy; 2024 AVIPROD. Tous droits réservés. | Créé avec ❤️ pour les éleveurs africains.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
