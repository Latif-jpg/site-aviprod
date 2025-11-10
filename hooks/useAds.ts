import { useState, useEffect, useCallback } from 'react';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';

// This should match the AdItem interface in AdBanner.tsx
export interface Ad {
  id: string;
  image_url: string; // URL or local asset
  title: string;
  subtitle: string;
  target_url?: string; // For marketplace product redirection or external links
}

// This type matches the DB table
interface Advertisement {
    id: string;
    title: string;
    subtitle: string | null;
    image_url: string;
    target_url: string | null;
    is_enabled: boolean;
    created_at: string;
}

export const useAds = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAds = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_enabled', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ads:', error);
        setAds([]);
      } else {
        const mappedAds: Ad[] = (data || []).map((ad: Advertisement) => ({
            id: ad.id,
            title: ad.title,
            subtitle: ad.subtitle || '',
            image_url: ad.image_url,
            target_url: ad.target_url || undefined,
        }));
        setAds(mappedAds);
      }
    } catch (error) {
      console.error('Unexpected error fetching ads:', error);
      setAds([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  return { ads, isLoading, refetchAds: fetchAds };
};