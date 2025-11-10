
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';

interface WeatherWidgetProps {
  location?: string;
}

export default function WeatherWidget({ location }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeatherData();
  }, [location]);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      // For now, keep simulated data since API calls might be blocked in development
      // In production, uncomment the API call below
      /*
      const apiKey = 'bd5e378503939ddaee76f12ad7a97608'; // OpenWeatherMap API key
      const city = location || 'Ouagadougou'; // Default to Ouagadougou if no location

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=fr`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();

      setWeather({
        temperature: Math.round(data.main.temp),
        condition: mapWeatherCondition(data.weather[0].main),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        location: data.name,
        description: data.weather[0].description,
      });
      */

      // Simulated weather data for development
      const simulatedData = {
        temperature: 28 + Math.floor(Math.random() * 10), // 28-37°C
        condition: ['sunny', 'partly-cloudy', 'cloudy'][Math.floor(Math.random() * 3)],
        humidity: 40 + Math.floor(Math.random() * 40), // 40-79%
        windSpeed: 5 + Math.floor(Math.random() * 15), // 5-19 km/h
        location: location || 'Ouagadougou',
        description: 'Conditions météorologiques actuelles',
      };

      setWeather(simulatedData);
    } catch (error) {
      console.error('Error fetching weather:', error);
      // Fallback to static data
      setWeather({
        temperature: 32,
        condition: 'sunny',
        humidity: 65,
        windSpeed: 12,
      });
    } finally {
      setLoading(false);
    }
  };

  const mapWeatherCondition = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear': return 'sunny';
      case 'clouds': return 'cloudy';
      case 'rain':
      case 'drizzle': return 'rainy';
      case 'thunderstorm': return 'rainy';
      case 'snow': return 'cloudy';
      case 'mist':
      case 'fog': return 'cloudy';
      default: return 'partly-cloudy';
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return 'sunny';
      case 'cloudy': return 'cloudy';
      case 'rainy': return 'rainy';
      case 'partly-cloudy': return 'partly-sunny';
      default: return 'sunny';
    }
  };

  const getWeatherText = (condition: string) => {
    switch (condition) {
      case 'sunny': return 'Ensoleillé';
      case 'cloudy': return 'Nuageux';
      case 'rainy': return 'Pluvieux';
      case 'partly-cloudy': return 'Partiellement nuageux';
      default: return 'Ensoleillé';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mainInfo}>
        <Icon 
          name={getWeatherIcon(weather.condition) as any} 
          size={40} 
          color={colors.accentSecondary} 
        />
        <View style={styles.tempContainer}>
          <Text style={styles.temperature}>{weather.temperature}°C</Text>
          <Text style={styles.condition}>
            {weather.description ? weather.description.charAt(0).toUpperCase() + weather.description.slice(1) : getWeatherText(weather.condition)}
          </Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Icon name="stats-chart" size={16} color={colors.primary} />
          <Text style={styles.detailText}>{weather.humidity}%</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="navigate" size={16} color={colors.accent} />
          <Text style={styles.detailText}>{weather.windSpeed} km/h</Text>
        </View>
      </View>

      {location && (
        <View style={styles.locationContainer}>
          <Icon name="location" size={14} color={colors.textSecondary} />
          <Text style={styles.locationText}>{location}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  tempContainer: {
    flex: 1,
  },
  temperature: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  condition: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  details: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
