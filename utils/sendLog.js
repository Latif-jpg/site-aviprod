const sendLog = async (level, message, data = {}) => {
    try {
        // --- MODIFICATION : Désactiver sur le Web ou en Production pour éviter Mixed Content ---
        if (Platform.OS === 'web') {
            return;
        }

        const serverIP = '192.168.100.32';

        // --- AJOUT : Contrôleur pour le timeout ---
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // Timeout de 2 secondes

        await fetch(`http://${serverIP}:3000/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                level: level, // 'info', 'error', 'warning'
                message: message,
                data: data,
            }),
            signal: controller.signal, // --- AJOUT : Lier le timeout à la requête ---
        });

        clearTimeout(timeoutId); // --- AJOUT : Nettoyer le timeout si la requête réussit ---

    } catch (error) {
        // Si l'envoi échoue, on log dans la console normale de l'appareil
        console.log(`[${level}] (local) ${message}`, data);
    }
};

// Fonctions pratiques
export const logInfo = (msg, data) => sendLog('info', msg, data);
export const logError = (msg, data) => sendLog('error', msg, data);
export const logWarning = (msg, data) => sendLog('warning', msg, data);

export default sendLog;