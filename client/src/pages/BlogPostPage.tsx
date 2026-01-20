import { Button } from "@/components/ui/button";
import { BLOG_POSTS } from "@/pages/posts";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";
import { Link, useRoute, Redirect } from "wouter";

export default function BlogPostPage() {
    const [, params] = useRoute("/blog/:id");
    const postId = params ? parseInt(params.id, 10) : NaN;

    const post = BLOG_POSTS.find(p => p.id === postId);

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
                            <span>{post.date}</span>
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