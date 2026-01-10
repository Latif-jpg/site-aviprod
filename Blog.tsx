import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Blog() {
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
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-6">Actualités & Conseils</h1>
                    <p className="text-lg text-muted-foreground mb-12">
                        Retrouvez ici nos derniers articles pour optimiser votre élevage.
                    </p>

                    <div className="p-12 border-2 border-dashed rounded-xl bg-gray-50">
                        <p className="text-xl font-medium text-gray-500">
                            Articles à venir bientôt...
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}