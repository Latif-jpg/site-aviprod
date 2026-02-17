export const initializeAdMob = async () => {
    console.log('🌐 [AdMob] Web environment detected - AdMob disabled.');
    return Promise.resolve({ web: 'initialized' });
};
