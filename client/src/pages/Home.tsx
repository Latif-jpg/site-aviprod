/**
 * AVIPROD Landing Page - Home Component
 * Design Philosophy: Agricultural Technology Modernism
 * - Asymmetric layouts with dynamic sections
 * - Professional green + terracotta/orange palette
 * - Poppins (bold titles) + Inter (body text)
 * - Subtle animations and smooth transitions
 */

import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Users, TrendingUp, Zap, Shield, Play, Image as ImageIcon, X, Facebook } from "lucide-react";
import { useState, useEffect, MouseEvent } from "react";
import ContactForm from "@/components/ContactForm";

export default function Home() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    // SEO - Optimisation pour les moteurs de recherche
    document.title = "AVIPROD - Élevage Volaille, Diagnostic Maladie & Produits Vétérinaires";

    let metaDesc = document.querySelector("meta[name='description']");
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "Solution complète pour l'élevage de volaille et poulet : diagnostic maladie, gestion de lot, et achat de produits vétérinaires. Téléchargez l'APK !");

    let metaKeywords = document.querySelector("meta[name='keywords']");
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", "elevage, maladie, volaille, poulet, diagnostic, achat de produit veterinaire, aviculture, gestion ferme");

    // JSON-LD pour le référencement IA (Schema.org)
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AVIPROD",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Android",
      "description": "Application complète de gestion d'élevage de volaille : diagnostic maladie, suivi de lot, ration alimentaire et achat de produits vétérinaires.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "XOF"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "1024"
      },
      "author": {
        "@type": "Organization",
        "name": "Green Eco Tech"
      }
    };

    let scriptJsonLd = document.querySelector("script[type='application/ld+json']");
    if (!scriptJsonLd) {
      scriptJsonLd = document.createElement("script");
      scriptJsonLd.setAttribute("type", "application/ld+json");
      document.head.appendChild(scriptJsonLd);
    }
    scriptJsonLd.textContent = JSON.stringify(jsonLd);

    // Définir l'icône du site (Favicon)
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = '/images/icon-prod.png';
    document.head.appendChild(link);

    const scriptSrc = "https://pl28436440.effectivegatecpm.com/32/dc/aa/32dcaae322d63634d198ba168fc1f8c5.js";

    // Vérifier si le script existe déjà pour éviter les doublons
    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      document.body.appendChild(script);
    }

    // Script Google AdSense
    const adSenseSrc = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5111525667900751";
    if (!document.querySelector(`script[src="${adSenseSrc}"]`)) {
      const adSenseScript = document.createElement('script');
      adSenseScript.src = adSenseSrc;
      adSenseScript.async = true;
      adSenseScript.crossOrigin = "anonymous";
      document.head.appendChild(adSenseScript);
    }

    // Afficher la fenêtre popup au lancement (après 1.5 secondes)
    const timer = setTimeout(() => {
      setShowWelcomeModal(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = (e: MouseEvent<HTMLButtonElement>) => {
    // Empêcher la propagation de l'événement pour éviter que les scripts publicitaires ne se déclenchent
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

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
                    onClick={() => {
                      document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
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

      {/* About Section */}
      <section id="about-section" className="py-20 md:py-28 bg-secondary/20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Comment AVIPROD Transforme Votre Élevage
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              AVIPROD est né d'un constat simple : les éleveurs de volaille en Afrique de l'Ouest ont besoin d'outils modernes, accessibles et adaptés à leurs réalités pour prospérer. Notre application centralise toutes les facettes de la gestion d'élevage pour vous faire gagner du temps, réduire les pertes et augmenter votre rentabilité.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Illustration */}
            <div className="relative">
              <img
                src="/images/features-illustration.png"
                alt="Éleveur utilisant AVIPROD sur tablette"
                className="rounded-2xl shadow-xl"
              />
            </div>
            {/* Right: Key Points */}
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1 p-3 bg-primary/10 rounded-full">
                  <CheckCircle className="text-primary" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-foreground mb-1">Centralisation Totale</h4>
                  <p className="text-muted-foreground">De la gestion des lots au suivi financier, tout est au même endroit. Fini les cahiers et les feuilles de calcul dispersées.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1 p-3 bg-primary/10 rounded-full">
                  <CheckCircle className="text-primary" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-foreground mb-1">Décisions Intelligentes</h4>
                  <p className="text-muted-foreground">Recevez des alertes, des diagnostics de santé et des recommandations de ration pour prendre les meilleures décisions au bon moment.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1 p-3 bg-primary/10 rounded-full">
                  <CheckCircle className="text-primary" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-foreground mb-1">Accès Direct au Marché</h4>
                  <p className="text-muted-foreground">Notre marketplace intégrée vous connecte directement aux acheteurs, éliminant les intermédiaires et améliorant vos marges.</p>
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
                Gérez vos lots de poules et poulets facilement. Suivi en temps réel du nombre de sujets, de l'âge, et de l'état sanitaire.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/30 md:translate-y-4">
              <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Shield className="text-accent" size={28} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Diagnostic Maladie & Santé</h3>
              <p className="text-muted-foreground leading-relaxed">
                Détectez les maladies et problèmes de santé rapidement. Diagnostic automatique basé sur les symptômes observés.
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
              <h3 className="text-xl font-bold text-foreground mb-3">Achat Produits Vétérinaires & Vente</h3>
              <p className="text-muted-foreground leading-relaxed">
                Plateforme d'achat de produits vétérinaires et vente de volailles. Connectez-vous avec les fournisseurs et acheteurs.
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

            {/* Gallery Images */}
            {[
              { src: "/images/lot.jpeg", title: "Gestion de Lot" },
              { src: "/images/santé.jpeg", title: "Santé & Diagnostic" },
              { src: "/images/ration.jpeg", title: "Ration & Alimentation" },
              { src: "/images/stock.jpeg", title: "Gestion de Stock" },
              { src: "/images/market.jpeg", title: "Marketplace" },
              { src: "/images/finance.18.jpeg", title: "Finance & Analyse" }
            ].map((item, index) => (
              <div
                key={index}
                className="group relative rounded-xl overflow-hidden shadow-md aspect-video cursor-pointer"
                onClick={() => setSelectedImage(item.src)}
              >
                <img src={item.src} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white font-bold text-lg">{item.title}</p>
                </div>
                <div className="absolute top-4 right-4 bg-black/50 p-2 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImageIcon className="text-white" size={20} />
                </div>
              </div>
            ))}
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
                name: "Ibrahim Sissoko",
                farm: "Ferme Sissoko, Mali",
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

      {/* FAQ Section - Optimisé pour les IA */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Questions Fréquentes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Réponses aux questions sur la gestion d'élevage, les maladies et l'utilisation d'AVIPROD.
            </p>
          </div>

          <div className="grid gap-6 max-w-3xl mx-auto">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="font-bold text-lg mb-2 text-foreground">Comment diagnostiquer une maladie de volaille avec AVIPROD ?</h3>
              <p className="text-muted-foreground">
                L'application utilise un système intelligent qui analyse les symptômes que vous observez (fientes, comportement, etc.) pour proposer un diagnostic probable et des conseils de traitement vétérinaire immédiats.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="font-bold text-lg mb-2 text-foreground">Comment gérer la ration alimentaire des poulets ?</h3>
              <p className="text-muted-foreground">
                AVIPROD calcule automatiquement la quantité d'aliment nécessaire par jour en fonction de l'âge et du type de volaille (poulet de chair, pondeuse), vous aidant à éviter le gaspillage et optimiser la croissance.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="font-bold text-lg mb-2 text-foreground">Peut-on acheter des produits vétérinaires en ligne ?</h3>
              <p className="text-muted-foreground">
                Oui, la section "Achat Produits Vétérinaires" vous permet de commander des vaccins, vitamines et matériel d'élevage directement auprès de fournisseurs certifiés avec livraison incluse.
              </p>
            </div>
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
                    <p className="text-muted-foreground">aviprod099@gmail.com</p>
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
                    <p className="text-muted-foreground">+226 56 50 87 09</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                      <Facebook className="text-primary" size={20} />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Facebook</h4>
                    <a href="https://www.facebook.com/profile.php?id=100064111684692" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                      Page Facebook
                    </a>
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
                <li><a href="#" className="hover:text-white transition">À propos de</a></li>
                <li><a href="/blog" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Légal</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><a href="#" className="hover:text-white transition">Confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition">Conditions</a></li>
                <li><a href="#" className="hover:text-white transition">Soutien</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-8 text-center text-white/70 text-sm">
            <p>&copy; 2024 AVIPROD. Tous droits réservés. | Créé avec ❤️ pour les éleveurs africains.</p>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <img
            src={selectedImage}
            alt="Aperçu"
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Welcome / Ad Modal */}
      {showWelcomeModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => {
            e.stopPropagation();
            setShowWelcomeModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowWelcomeModal(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center space-y-6 pt-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <img src="/images/icon-prod.png" alt="Logo" className="w-10 h-10 object-contain" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Bienvenue sur AVIPROD</h3>
                <p className="text-gray-500">
                  La solution n°1 pour la gestion de votre élevage.
                </p>
              </div>

              <div
                className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => {
                  // Laisser la propagation pour déclencher les scripts de pub globaux si l'utilisateur clique ici
                  setShowWelcomeModal(false);
                }}
              >
                <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                  <Zap className="text-primary" size={24} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">Découvrir nos partenaires</p>
                  <p className="text-xs text-gray-500">Cliquez ici pour voir l'offre</p>
                </div>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation(); // Empêche la pub de s'ouvrir si on clique juste sur "Accéder"
                  setShowWelcomeModal(false);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                Accéder au site
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
