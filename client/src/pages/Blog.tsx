import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";

export default function Blog() {
    useEffect(() => {
        // Script Google AdSense
        const adSenseSrc = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5111525667900751";
        if (!document.querySelector(`script[src="${adSenseSrc}"]`)) {
            const adSenseScript = document.createElement('script');
            adSenseScript.src = adSenseSrc;
            adSenseScript.async = true;
            adSenseScript.crossOrigin = "anonymous";
            document.head.appendChild(adSenseScript);
        }
        try {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error", e);
        }
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
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-6">Actualités & Conseils</h1>
                    <p className="text-lg text-muted-foreground mb-12">
                        Retrouvez ici nos derniers articles pour optimiser votre élevage.
                    </p>

                    {/* Publicité AdSense */}
                    <div className="my-8">
                        <ins className="adsbygoogle"
                            style={{ display: 'block' }}
                            data-ad-client="ca-pub-5111525667900751"
                            data-ad-slot="9905337148"
                            data-ad-format="auto"
                            data-full-width-responsive="true"></ins>
                    </div>

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