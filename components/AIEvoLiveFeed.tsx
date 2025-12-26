// components/AIEvoLiveFeed.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { futuristicColors } from '../styles/ai-dashboard-styles';
import AIEvoGlassCard from './AIEvoGlassCard';

interface Log {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

const mockMessages = [
  "Analyse du lot #A1 par Gemini...",
  "Diagnostic de santé: 98% de confiance (OK)",
  "Prédiction de croissance pour le lot #B2 terminée.",
  "Alerte: Faible stock de nourriture détecté.",
  "Analyse financière générée avec succès.",
  "Modèle 'health_predictor' ré-entraîné.",
  "Erreur lors de l'analyse du lot #C3: données manquantes.",
  "Recommandation marketing créée: 'Promotion sur les œufs bio'.",
];

const getRandomType = (): Log['type'] => {
  const types: Log['type'][] = ['info', 'success', 'warn', 'error'];
  return types[Math.floor(Math.random() * types.length)];
};

const useMockLogs = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const logIdCounter = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prevLogs => {
        const newLog: Log = {
          id: logIdCounter.current++,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          message: mockMessages[Math.floor(Math.random() * mockMessages.length)],
          type: getRandomType(),
        };
        // Keep the list from growing indefinitely
        return [...prevLogs.slice(-15), newLog];
      });
    }, 2500); // Add a new log every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return logs;
};

const getTypeColor = (type: Log['type']) => {
  switch (type) {
    case 'success': return futuristicColors.success;
    case 'warn': return futuristicColors.warning;
    case 'error': return futuristicColors.danger;
    case 'info':
    default:
      return futuristicColors.cyan;
  }
}

const AIEvoLiveFeed: React.FC = () => {
  const logs = useMockLogs();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [logs]);

  return (
    <AIEvoGlassCard style={{ height: 250, marginTop: 20 }}>
      <Text style={styles.title}>Flux d'Activité IA</Text>
      <ScrollView style={styles.scrollView} ref={scrollViewRef}>
        {logs.map(log => (
          <View key={log.id} style={styles.logItem}>
            <Text style={styles.timestamp}>{log.timestamp}</Text>
            <Text style={[styles.logMessage, { color: getTypeColor(log.type) }]}>
              {`> ${log.message}`}
            </Text>
          </View>
        ))}
      </ScrollView>
    </AIEvoGlassCard>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: futuristicColors.text,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timestamp: {
    color: futuristicColors.textSecondary,
    fontSize: 12,
    marginRight: 10,
  },
  logMessage: {
    flex: 1,
    fontSize: 12,
    flexWrap: 'wrap',
  },
});

export default AIEvoLiveFeed;
