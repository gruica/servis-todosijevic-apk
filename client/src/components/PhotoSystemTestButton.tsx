import React from 'react';
import { Button } from '@/components/ui/button';

export function PhotoSystemTestButton() {
  const testPhotoSystem = async () => {
    console.log('🔍 TESTIRANJE PHOTO SISTEMA...');
    
    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token exists:', !!token);
      
      if (!token) {
        console.error('❌ Nema JWT token-a!');
        return;
      }
      
      // Test 1: Direct API call
      console.log('📡 Test 1: Direct API poziv...');
      const response = await fetch('/api/service-photos?serviceId=234', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API radi! Rezultat:', data);
      } else {
        const errorText = await response.text();
        console.error('❌ API ne radi:', errorText);
      }
      
      // Test 2: User info
      console.log('👤 Test 2: User info...');
      const userResponse = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('👤 User data:', userData);
      } else {
        console.error('👤 User endpoint greška:', userResponse.status);
      }
      
    } catch (error) {
      console.error('🚨 Test failed:', error);
    }
  };

  return (
    <Button 
      onClick={testPhotoSystem}
      variant="outline"
      size="sm"
      className="mb-4"
    >
      🔧 Test Photo System
    </Button>
  );
}