import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GoogleAdBanner() {
    // Sur le web, on n'affiche rien ou un fallback
    return null;

    // Si on voulait afficher un placeholder pour le debug :
    /*
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Publicité (Masquée sur Web)</Text>
        </View>
    );
    */
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#888',
    }
});
