import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../config';
import WebLandingPage from '../components/WebLandingPage'; // Import de la Landing Page

export default function Index() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    console.log('🔄 [Index] Checking session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔍 [Index] Session result:', session ? 'Found' : 'NULL', error);
      if (session) {
        setHasSession(true);
      }
      setSessionChecked(true);
    });
  }, []);

  if (!sessionChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  // --- LOGIQUE HYBRIDE : WEB LANDING PAGE vs MOBILE APP ---

  // Si on est sur le WEB et PAS CONNECTÉ -> Afficher la Landing Page (Site vitrine)
  if (Platform.OS === 'web' && !hasSession) {
    console.log('🌐 [Index] Web visitor detected, showing Landing Page.');
    return <WebLandingPage />;
  }

  // Sinon (Mobile ou Connecté) -> Redirection classique vers l'App
  console.log('🚀 [Index] Redirecting to:', hasSession ? "/dashboard" : "/auth");

  // Fallback visible si la redirection échoue
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {/* <Text style={{ marginBottom: 20 }}>Redirection vers {hasSession ? "Dashboard" : "Auth"}...</Text> */}
      <Redirect href={hasSession ? "/dashboard" : "/auth"} />
    </View>
  );
}
