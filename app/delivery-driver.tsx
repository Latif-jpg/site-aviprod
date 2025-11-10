import React from 'react';
import { Platform } from 'react-native';

// Conditionally import DeliveryDriverApp only for native platforms
let DeliveryDriverApp: any = null;

if (Platform.OS !== 'web') {
  DeliveryDriverApp = require('../components/DeliveryDriverApp').default;
}

export default function DeliveryDriverScreen() {
  if (Platform.OS === 'web') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2>🚫 Fonctionnalité non disponible</h2>
        <p>Cette fonctionnalité n'est disponible que sur l'application mobile.</p>
        <p>Utilisez l'app mobile pour accéder à l'espace livreur avec la carte interactive.</p>
      </div>
    );
  }

  return DeliveryDriverApp ? <DeliveryDriverApp /> : null;
}