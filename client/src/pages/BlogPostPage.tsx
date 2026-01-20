import { Button } from "@/components/ui/button";
import { BLOG_POSTS } from "@/pages/posts";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";
import { Link, useRoute, Redirect } from "wouter";
import { useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Helper pour créer/mettre à jour les balises meta
const setMetaTag = (attr: 'name' | 'property', value: string, content: string) => {
    let element = document.querySelector(`meta[${attr}='${value}']`);
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, value);
        document.head.appendChild(element);
    }
    element.setAttribute('content', content);
};

export default function BlogPostPage() {
    const [, params] = useRoute("/blog/:id");
    const postId = params ? parseInt(params.id, 10) : NaN;

    const post = BLOG_POSTS.find(p => p.id === postId);

    useEffect(() => {
        if (post) {
            const postUrl = `https://site-aviprod.vercel.app/blog/${post.id}`;
            const imageUrl = post.imageUrl ? `https://site-aviprod.vercel.app${post.imageUrl}` : `https://site-aviprod.vercel.app/images/hero-background.png`;

            // 1. Titre et Description
            document.title = `${post.title} | AVIPROD Blog`;
            setMetaTag('name', 'description', post.excerpt);

            // 2. URL Canonique
            const canonicalLink = document.querySelector("link[rel='canonical']") || document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            canonicalLink.setAttribute('href', postUrl);
            document.head.appendChild(canonicalLink);

            // 3. Open Graph (pour Facebook, LinkedIn, etc.)
            setMetaTag('property', 'og:title', post.title);
            setMetaTag('property', 'og:description', post.excerpt);
            setMetaTag('property', 'og:type', 'article');
            setMetaTag('property', 'og:url', postUrl);
            setMetaTag('property', 'og:image', imageUrl);

            // 4. Twitter Card
            setMetaTag('name', 'twitter:card', 'summary_large_image');
            setMetaTag('name', 'twitter:title', post.title);
            setMetaTag('name', 'twitter:description', post.excerpt);
            setMetaTag('name', 'twitter:image', imageUrl);

            // 5. JSON-LD (Données structurées pour les articles)
            const jsonLd = {
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": post.title,
                "image": imageUrl,
                "author": { "@type": "Person", "name": post.author },
                "publisher": {
                    "@type": "Organization",
                    "name": "AVIPROD",
                    "logo": { "@type": "ImageObject", "url": "https://site-aviprod.vercel.app/images/icon-prod.png" }
                },
                "datePublished": post.date, // Format YYYY-MM-DD
                "description": post.excerpt
            };

            const scriptJsonLd = document.createElement("script");
            scriptJsonLd.type = "application/ld+json";
            scriptJsonLd.text = JSON.stringify(jsonLd);
            document.head.appendChild(scriptJsonLd);

            return () => { document.head.removeChild(scriptJsonLd); };
        }
    }, [post]);

    if (!post) {
        // Si l'article n'est pas trouvé, redirige vers la page 404.
        return <Redirect to="/404" />;
    }

    return (
        <div className="min-h-screen bg-white">
            <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
                <div className="container flex items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                        <Link href="/blog">
                            <Button variant="ghost" size="sm" className="gap-2">
                                <ArrowLeft size={18} />
                                Retour au Blog
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="container py-12 md:py-20">
                <article className="max-w-3xl mx-auto">
                    {post.imageUrl && (
                        <div className="mb-8 rounded-xl overflow-hidden aspect-video bg-gray-100">
                            <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 text-sm text-muted-foreground">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full flex items-center gap-2">
                            <Tag size={14} />
                            {post.category}
                        </span>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>{format(new Date(post.date), 'd MMMM yyyy', { locale: fr })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User size={14} />
                            <span>{post.author}</span>
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                        {post.title}
                    </h1>

                    {/* 
                      Le contenu de l'article (qui peut contenir du HTML) est affiché ici.
                      Les classes "prose" permettent de styliser joliment le texte (titres, paragraphes, listes...).
                      Cela nécessite le plugin `@tailwindcss/typography`.
                    */}
                    <div
                        className="prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                </article>
            </main>
        </div>
    );
}