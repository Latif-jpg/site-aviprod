import { useState, useCallback } from 'react';

// Mock pour le web
export const useRewardedAd = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [canWatchAd, setCanWatchAd] = useState(false);
    const [nextAvailableTime, setNextAvailableTime] = useState<Date | null>(null);

    const checkEligibility = useCallback(async () => {
        // Logique simplifiée pour le web ou désactivée
        setCanWatchAd(false);
    }, []);

    const showRewardedAd = useCallback(async (): Promise<boolean> => {
        console.log('🌐 [AdMob] Rewarded Ads not supported on Web');
        return false;
    }, []);

    return {
        showRewardedAd,
        canWatchAd,
        isLoading,
        nextAvailableTime,
        checkEligibility,
    };
};
