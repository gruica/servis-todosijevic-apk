import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            📱 Servis Todosijević
          </h1>
          <p className="text-gray-600 mb-6">
            Mobilna aplikacija za upravljanje servisom belih dobara
          </p>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-semibold text-blue-900 mb-2">
                🏢 O Aplikaciji
              </h2>
              <p className="text-sm text-blue-700">
                Profesionalna platforma za upravljanje servisom frižidera, 
                veš mašina, sudijera i drugih belih dobara.
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="font-semibold text-green-900 mb-2">
                ✅ Funkcionalnosti
              </h2>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Praćenje statusa servisa</li>
                <li>• Upravljanje klijentima</li>
                <li>• Mobile-first pristup</li>
                <li>• Offline capabilities</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="font-semibold text-yellow-900 mb-2">
                📱 APK Status
              </h2>
              <p className="text-sm text-yellow-700">
                Aplikacija je uspešno kreirana kroz GitHub Actions workflow.
                Android kompatibilnost: 7.0+
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              © 2025 Frigo Sistem Todosijević
              <br />
              Build verzija: v{Math.floor(Date.now() / 1000)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;