import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Router } from "wouter";

// Import Icon Overlay System za automatsku zamenu Material Icons → Lucide React
import "@/utils/icon-overlay-system";

// Import Dashboard Enhancement System za redizajn Dashboard-a sa Lucide ikonama
import "@/utils/dashboard-enhancement-system";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  </QueryClientProvider>
);
