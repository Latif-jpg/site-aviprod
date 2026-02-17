import mobileAds from 'react-native-google-mobile-ads';

export const initializeAdMob = async () => {
    console.log('⚙️ [AdMob] Initializing SDK (Native)...');
    try {
        const adapterStatuses = await mobileAds().initialize();
        console.log('✅ [AdMob] SDK Initialized successfully:', adapterStatuses);
        return adapterStatuses;
    } catch (error) {
        console.error('❌ [AdMob] SDK Initialization FAILED:', error);
        throw error;
    }
};
