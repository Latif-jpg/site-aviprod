export const containsContactInfo = (text: string): boolean => {
    // Liste des chiffres et nombres courants en lettres
    const numberWords = 'zéro|zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille';

    const patterns = [
        /\d{8,}/,  // Numéros de téléphone (8+ chiffres en continu)
        /\d{2,}[-.\s]\d{2,}[-.\s]\d{2,}/,  // Numéros formatés (ex: 97 00 00 00)
        new RegExp(`(?:${numberWords})(?:[\\s\\-\\.]+(?:${numberWords})){2,}`, 'i'), // Détecte au moins 3 chiffres en lettres à la suite (ex: zéro six quatre)
        /@/,  // Adresses Email
        /whatsapp/i,
        /telegram/i,
        /facebook/i,
        /instagram/i,
        /appel/i,
        /contact/i,
        /tél/i,
        /tel/i,
        /phone/i
    ];

    return patterns.some(pattern => pattern.test(text));
};

export const sanitizeText = (text: string): string => {
    const numberWords = 'zéro|zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille';

    let sanitized = text.replace(/\d{8,}/g, '[NUMÉRO MASQUÉ]');
    sanitized = sanitized.replace(/\d{2,}[-.\s]\d{2,}[-.\s]\d{2,}/g, '[NUMÉRO MASQUÉ]');
    // Masquer les séquences de chiffres en lettres
    sanitized = sanitized.replace(new RegExp(`(?:${numberWords})(?:[\\s\\-\\.]+(?:${numberWords})){2,}`, 'gi'), '[NUMÉRO MASQUÉ]');
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL MASQUÉ]');
    return sanitized;
};