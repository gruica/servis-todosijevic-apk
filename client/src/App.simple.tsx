import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import React from "react";
import AuthPage from "@/pages/auth-page";
import { NotificationProvider } from "@/contexts/notification-context";

// Minimal app for testing
function App() {
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/login" component={AuthPage} />
          <Route path="/">
            <div className="container mx-auto py-8">
              <h1 className="text-2xl font-bold mb-4">Frigo Sistem Todosijević</h1>
              <p>Aplikacija je pokrenuta i radi!</p>
              <div className="mt-4">
                <h2 className="text-lg font-semibold mb-2">GSM Modem Status</h2>
                <p className="text-sm text-gray-600">
                  GSM modem sistem je inicijalizovan i spreman za konfiguraciju.
                </p>
                <div className="mt-4">
                  <a href="/login" className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Prijavi se
                  </a>
                </div>
              </div>
            </div>
          </Route>
        </Switch>
        <Toaster />
      </div>
    </NotificationProvider>
  );
}

export default App;