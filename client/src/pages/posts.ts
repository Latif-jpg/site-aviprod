export interface BlogPost {
    id: number;
    title: string;
    excerpt: string; // Petit résumé qui s'affiche sur la carte
    content: string; // Contenu complet de l'article
    date: string;
    author: string;
    category: string;
    imageUrl?: string; // Optionnel : lien vers une image
}

// ==================================================================================
// C'EST ICI QUE VOUS AJOUTEZ VOS ARTICLES
// Copiez le bloc entre accolades { ... }, collez-le en dessous et modifiez le texte.
// ==================================================================================

export const BLOG_POSTS: BlogPost[] = [
    {
        id: 1,
        title: "Lancement officiel d'AVIPROD",
        excerpt: "Nous sommes heureux de vous présenter la nouvelle solution complète pour la gestion de votre élevage de volaille. Suivez vos lots, vos finances et la santé de vos animaux...",
        content: "<h2>Le début d'une nouvelle ère pour les éleveurs</h2><p>Après des mois de développement et de tests en collaboration avec des éleveurs locaux, nous sommes fiers de lancer officiellement AVIPROD. Notre mission est de fournir aux éleveurs de volaille d'Afrique de l'Ouest les outils technologiques pour prospérer.</p><p>L'application centralise la gestion des lots, le suivi sanitaire, la planification des vaccins, la gestion des stocks d'aliments et la comptabilité. Grâce à notre module de diagnostic par IA, vous pouvez identifier rapidement les problèmes de santé et agir en conséquence.</p><h3>Fonctionnalités clés :</h3><ul><li>Suivi de lots en temps réel</li><li>Diagnostic de maladies par IA</li><li>Calendrier vaccinal automatisé</li><li>Gestion des stocks et des rations</li><li>Place de marché intégrée</li></ul><p>Rejoignez-nous dans cette aventure pour moderniser l'aviculture !</p>",
        date: "20 Janvier 2024",
        author: "Équipe AVIPROD",
        category: "Annonce",
        // Vous pouvez ajouter une image ici, par exemple : "/images/poule.jpg"
        imageUrl: "/images/photo blog1.png"
    },
    {
        id: 2,
        title: "Santé de la Volaille au Burkina Faso : Les Défis et Solutions",
        excerpt: "La maladie de Newcastle et les parasites menacent régulièrement les élevages au Burkina. Découvrez les stratégies de prévention indispensables pour sécuriser votre production.",
        content: "<h2>Un secteur vital mais fragile</h2><p>L'aviculture est un pilier de l'économie rurale au Burkina Faso. Cependant, les éleveurs font face à des pertes considérables dues aux maladies infectieuses. Selon les études locales, la mortalité peut atteindre 80% en cas d'épidémie si aucune mesure n'est prise.</p><h3>Les principales menaces sanitaires</h3><ul><li><strong>La Maladie de Newcastle :</strong> Aussi appelée « pseudo-peste », c'est l'ennemi numéro un. Elle est très contagieuse et décime des basse-cours entières, souvent en saison sèche et fraîche.</li><li><strong>La Variole Aviaire :</strong> Elle se manifeste par des boutons sur la tête et les barbillons.</li><li><strong>Les Parasites :</strong> Les poux, tiques (comme <em>Argas persicus</em>) et vers intestinaux affaiblissent les volailles et réduisent leur croissance.</li></ul><h3>Comment protéger votre élevage ?</h3><p>La prévention reste la meilleure arme de l'éleveur :</p><ol><li><strong>La Vaccination :</strong> C'est impératif, surtout contre la Newcastle. Des vaccins thermostables adaptés à nos climats existent. Respectez le calendrier vaccinal strict.</li><li><strong>L'Hygiène (Biosécurité) :</strong> Nettoyez régulièrement les poulaillers. Utilisez des pédiluves à l'entrée des bâtiments. Isolez systématiquement les nouveaux sujets (quarantaine) avant de les introduire dans le groupe.</li><li><strong>L'Habitat :</strong> Évitez la divagation totale. Construire un abri simple mais propre protège vos animaux des prédateurs et des intempéries.</li></ol><p>Avec AVIPROD, vous pouvez programmer vos rappels de vaccins pour ne jamais oublier une date critique !</p>",
        date: "25 Janvier 2024",
        author: "Dr. Vétérinaire AVIPROD",
        category: "Santé",
        imageUrl: "/images/santé.jpeg"
    },
];