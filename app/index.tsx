import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../config';

export default function Index() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      // Il faut absolument mettre à jour l'état pour que le composant se rafraîchisse
      setSessionChecked(true);
    });
  }, []);

  if (!sessionChecked) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return <Redirect href={hasSession ? "/dashboard" : "/auth"} />;
}
