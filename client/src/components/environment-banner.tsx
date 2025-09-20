import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Settings, AlertTriangle, CheckCircle } from "lucide-react";

// 🛡️ ENVIRONMENT BANNER KOMPONENTA
// Prikazuje jasno u kom modu se aplikacija nalazi

interface EnvironmentBannerProps {
  isDevelopment?: boolean;
  showFullBanner?: boolean;
}

export const EnvironmentBanner = ({ 
  isDevelopment = import.meta.env.MODE === 'development', 
  showFullBanner = true 
}: EnvironmentBannerProps) => {
  
  // 🔧 DEBUG: Logujem environment informacije za mobile debugging
  console.log('🛡️ Environment Banner Debug:', {
    MODE: import.meta.env.MODE,
    NODE_ENV: import.meta.env.NODE_ENV,
    isDevelopment,
    showFullBanner,
    location: window.location.hostname
  });
  
  if (!isDevelopment) {
    console.log('🛡️ Environment Banner: Hiding banner - production mode');
    return null; // Ne prikazuj banner u production modu
  }

  console.log('🛡️ Environment Banner: Showing banner - development mode');

  return (
    <>
      {/* FULL BANNER - Prominent at top - MOBILE OPTIMIZED */}
      {showFullBanner && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 mb-4 mx-2 sm:mx-4">
          <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          <AlertDescription className="font-medium text-yellow-800 dark:text-yellow-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm sm:text-base">
                  <strong>DEVELOPMENT MODE</strong> - Vi eksperimentišete sa aplikacijom. 
                  Korisnici <strong>NE VIDE</strong> ove promjene do deployment-a.
                </span>
              </div>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-400 text-xs sm:text-sm self-start sm:self-center">
                ✅ EKSPERIMENTI SIGURNI
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

// 🎯 HEADER INDICATOR - Smaller indicator for navigation
export const EnvironmentHeaderIndicator = () => {
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (!isDevelopment) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        PRODUCTION
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-400 animate-pulse">
      <Settings className="h-3 w-3 mr-1" />
      DEV MODE
    </Badge>
  );
};

// 🔧 DEBUG INFO PANEL - For admin users - MOBILE OPTIMIZED
export const EnvironmentDebugInfo = () => {
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (!isDevelopment) return null;

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50">
      <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg p-2 sm:p-3 shadow-lg max-w-xs sm:max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
          <span className="font-semibold text-yellow-800 text-xs sm:text-sm">Development Mode</span>
        </div>
        <div className="text-xs text-yellow-700 space-y-1">
          <div>• Environment: {import.meta.env.MODE}</div>
          <div>• Debug features: Enabled</div>
          <div>• User testing: Safe</div>
          <div className="pt-1 font-medium text-xs sm:text-sm">
            ✅ Korisnici ne vide ove promjene
          </div>
        </div>
      </div>
    </div>
  );
};