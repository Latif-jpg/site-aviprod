import { useEffect, useRef, useState, useCallback } from 'react';
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { supabase } from '../config';

// IDs de test pour le développement
const REWARDED_AD_UNIT_ID = __DEV__
    ? TestIds.REWARDED
    : Platform.select({
        ios: 'ca-app-pub-5111525667900751/7466349407',
        android: 'ca-app-pub-5111525667900751/7466349407',
    });

const REWARD_AMOUNT = 2; // Maximum 2 Avicoins
const COOLDOWN_HOURS = 24; // 1 rewarded ad toutes les 24 heures

export const useRewardedAd = () => {
    const rewardedRef = useRef<RewardedAd | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [canWatchAd, setCanWatchAd] = useState(false);
    const [nextAvailableTime, setNextAvailableTime] = useState<Date | null>(null);

    const checkEligibility = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Vérifier la dernière récompense
            const { data, error } = await supabase
                .from('ad_rewards')
                .select('watched_at')
                .eq('user_id', user.id)
                .order('watched_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error checking eligibility:', error);
                return;
            }

            if (data) {
                const lastWatched = new Date(data.watched_at);
                const nextAvailable = new Date(lastWatched.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
                const now = new Date();

                if (now < nextAvailable) {
                    setCanWatchAd(false);
                    setNextAvailableTime(nextAvailable);
                } else {
                    setCanWatchAd(true);
                    setNextAvailableTime(null);
                }
            } else {
                // Aucune récompense précédente
                setCanWatchAd(true);
                setNextAvailableTime(null);
            }
        } catch (error) {
            console.error('Error checking eligibility:', error);
        }
    }, []);

    const grantReward = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Enregistrer la récompense publicitaire
            const { data: rewardData, error: insertError } = await supabase
                .from('ad_rewards')
                .insert({
                    user_id: user.id,
                    reward_amount: REWARD_AMOUNT,
                    watched_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertError) {
                console.error('Error inserting reward:', insertError);
                return;
            }

            // 2. Enregistrer la transaction d'avicoins (déclenche le trigger user_avicoins)
            const { error: transactionError } = await supabase
                .from('avicoins_transactions')
                .insert({
                    user_id: user.id,
                    amount: REWARD_AMOUNT,
                    transaction_type: 'earned',
                    description: 'Récompense vidéo publicitaire',
                    reference_type: 'ad_reward',
                    reference_id: rewardData.id
                });

            if (transactionError) {
                console.error('Error creating transaction:', transactionError);
                // On ne bloque pas si la transaction échoue, mais on le logue
            }

            console.log(`✅ Reward granted: ${REWARD_AMOUNT} Avicoins via transaction.`);

            // Mettre à jour l'éligibilité
            await checkEligibility();
        } catch (error) {
            console.error('Error granting reward:', error);
        }
    }, [checkEligibility]);

    useEffect(() => {
        const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID!, {
            requestNonPersonalizedAdsOnly: false,
        });

        const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
            console.log('✅ Rewarded ad loaded successfully');
            setIsLoading(false);
        });

        const unsubscribeFailed = rewarded.addAdEventListener(
            AdEventType.ERROR,
            (error) => {
                console.error('❌ Rewarded ad failed to load:', error);
                setIsLoading(false);
                // Réessayer après 10 secondes en cas d'erreur
                setTimeout(() => {
                    if (rewardedRef.current && !rewardedRef.current.loaded) {
                        console.log('🔄 Retrying to load rewarded ad...');
                        rewardedRef.current.load();
                    }
                }, 10000);
            }
        );

        const unsubscribeEarned = rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            async (reward) => {
                console.log('✅ User earned reward:', reward);
                await grantReward();
            }
        );

        rewardedRef.current = rewarded;
        console.log('⏳ Starting to load rewarded ad...');
        rewarded.load();

        // Vérifier si l'utilisateur peut regarder une pub
        checkEligibility();

        return () => {
            unsubscribeLoaded();
            unsubscribeEarned();
            unsubscribeFailed();
        };
    }, [checkEligibility, grantReward]);

    const showRewardedAd = useCallback(async (): Promise<boolean> => {
        if (!canWatchAd) return false;

        if (!rewardedRef.current?.loaded) {
            console.log('⚠️ Ad not loaded, reloading...');
            rewardedRef.current?.load();
            return false;
        }

        setIsLoading(true);

        return new Promise((resolve) => {
            const ad = rewardedRef.current!;
            let rewardEarned = false;

            // Listener temporaire pour détecter le gain
            const earnedUnsub = ad.addAdEventListener(
                RewardedAdEventType.EARNED_REWARD,
                () => { rewardEarned = true; }
            );

            // Listener temporaire pour détecter la fermeture
            const closedUnsub = ad.addAdEventListener(
                AdEventType.CLOSED,
                () => {
                    earnedUnsub();
                    closedUnsub();
                    setIsLoading(false);
                    resolve(rewardEarned);
                }
            );

            ad.show().catch(() => {
                earnedUnsub();
                closedUnsub();
                setIsLoading(false);
                resolve(false);
            });
        });
    }, [canWatchAd]);

    return {
        showRewardedAd,
        canWatchAd,
        isLoading,
        nextAvailableTime,
        checkEligibility,
    };
};
