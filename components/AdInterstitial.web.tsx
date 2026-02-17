export const useInterstitialAd = () => {
    const showInterstitial = async () => {
        console.log('🌐 [AdMob] Interstitial Ads not supported on Web');
        return Promise.resolve();
    };

    return { showInterstitial };
};
