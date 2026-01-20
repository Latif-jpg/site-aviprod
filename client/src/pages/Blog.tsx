import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction, Sparkles, Calendar, User, Tag } from "lucide-react";
import { Link } from "wouter";
import { BLOG_POSTS } from "@/pages/posts";
import { useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Blog() {
    useEffect(() => {
        document.title = "Blog - Conseils et Actualités pour l'Élevage de Volaille | AVIPROD";

        const metaDesc = document.querySelector("meta[name='description']") || document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        metaDesc.setAttribute("content", "Découvrez les derniers articles, conseils et actualités sur la gestion d'élevage de volaille, la santé des poulets, et l'optimisation de votre ferme avec AVIPROD.");
        document.head.appendChild(metaDesc);

        // JSON-LD pour le fil d'ariane
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Accueil",
                "item": "https://site-aviprod.vercel.app"
            }, {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://site-aviprod.vercel.app/blog"
            }]
        };

        const scriptJsonLd = document.createElement("script");
        scriptJsonLd.setAttribute("type", "application/ld+json");
        scriptJsonLd.textContent = JSON.stringify(jsonLd);
        document.head.appendChild(scriptJsonLd);

        return () => {
            document.head.removeChild(scriptJsonLd);
        };
    }, []);

    return (
        <div className="min-h-screen bg-white">
            <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
                <div className="container flex items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="gap-2">
                                <ArrowLeft size={18} />
                                Retour
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <span className="font-bold text-primary text-lg">AVIPROD Blog</span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="container py-12">
                <div className="max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-full mb-6 animate-bounce">
                        <Sparkles className="text-orange-500 h-6 w-6" />
                    </div>

                    <h1 className="text-4xl font-bold mb-6 text-gray-900">Actualités & Conseils</h1>
                    <p className="text-lg text-muted-foreground mb-12">
                        Retrouvez ici nos derniers articles pour optimiser votre élevage.
                    </p>

                    {BLOG_POSTS.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 text-left">
                            {BLOG_POSTS.map((post) => (
                                <Link key={post.id} href={`/blog/${post.id}`}>
                                    <a className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer">
                                        {post.imageUrl && (
                                            <div className="h-48 overflow-hidden bg-gray-100">
                                                <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            </div>
                                        )}
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full flex items-center gap-1">
                                                    <Tag size={12} />
                                                    {post.category}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                                                {post.title}
                                            </h3>
                                            <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">
                                                {post.excerpt}
                                            </p>
                                            <div className="mt-auto border-t border-gray-100 pt-4">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={14} />
                                                        {format(new Date(post.date), 'd MMMM yyyy', { locale: fr })}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <User size={14} />
                                                        {post.author}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-4">
                            <div className="p-4 bg-white rounded-full shadow-sm">
                                <Construction className="w-12 h-12 text-primary/60" />
                            </div>
                            <p className="text-xl font-medium text-gray-700">Articles à venir bientôt...</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}