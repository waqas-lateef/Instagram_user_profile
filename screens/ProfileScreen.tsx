import React, { useState, useEffect } from 'react';
import {StyleSheet,View,Text,TouchableOpacity,ActivityIndicator,Alert} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InstagramProfile, AuthResponse } from '../types';

const INSTAGRAM_CLIENT_ID = 5479389027778642;
const INSTAGRAM_CLIENT_SECRET = 'f6b414a151c1d54dbf8f33b2494d2072';
const REDIRECT_URI = 'https://www.swiftlane.ai/';


export default function ProfileScreen() {
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void checkExistingToken();
  }, []);

  const checkExistingToken = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('instagram_token');
      if (token) {
        await fetchProfile(token);
      }
    } catch (error) {
      console.error('Error checking token:', error);
    }
  };

  const handleInstagramLogin = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user_profile&response_type=code`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
      
      if (result.type === 'success' && result.url) {
        const code = new URL(result.url).searchParams.get('code');
        if (code) {
          await exchangeCodeForToken(code);
        }
      }
    } catch (error) {
      setError('Authentication failed');
      Alert.alert('Error', 'Authentication failed');
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exchangeCodeForToken = async (code: string): Promise<void> => {
    try {
      const response = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${INSTAGRAM_CLIENT_ID}&client_secret=${INSTAGRAM_CLIENT_SECRET}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}&code=${code}`,
      });

      const data: AuthResponse = await response.json();
      
      if (data.access_token) {
        await AsyncStorage.setItem('instagram_token', data.access_token);
        await fetchProfile(data.access_token);
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      setError('Failed to get access token');
      Alert.alert('Error', 'Failed to get access token');
      console.error('Token error:', error);
    }
  };

  const fetchProfile = async (token: string): Promise<void> => {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${token}`
      );
      
      const data: InstagramProfile = await response.json();
      
      if ('error' in data) {
        throw new Error('Failed to fetch profile data');
      }
      
      setProfile(data);
    } catch (error) {
      setError('Failed to fetch profile');
      Alert.alert('Error', 'Failed to fetch profile');
      console.error('Profile fetch error:', error);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('instagram_token');
      setProfile(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#405DE6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {profile ? (
        <View>
          <Text style={styles.title}>Welcome, {profile.username}!</Text>
          <Text>Account Type: {profile.account_type}</Text>
          <Text>Media Count: {profile.media_count}</Text>
          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleInstagramLogin}>
          <Text style={styles.buttonText}>Login to Instagram</Text>
        </TouchableOpacity>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#405DE6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
});
