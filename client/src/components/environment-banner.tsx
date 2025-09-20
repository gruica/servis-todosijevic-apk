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
  isDevelopment = process.env.NODE_ENV === 'development', 
  showFullBanner = true 
}: EnvironmentBannerProps) => {
  
  if (!isDevelopment) {
    return null; // Ne prikazuj banner u production modu
  }

  return (
    <>
      {/* FULL BANNER - Prominent at top */}
      {showFullBanner && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 mb-4">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="font-medium text-yellow-800 dark:text-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>
                  <strong>DEVELOPMENT MODE</strong> - Vi eksperimentišete sa aplikacijom. 
                  Korisnici NE VIDE ove promjene do deployment-a.
                </span>
              </div>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-400">
                EKSPERIMENTI SIGURNI
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
  const isDevelopment = process.env.NODE_ENV === 'development';
  
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

// 🔧 DEBUG INFO PANEL - For admin users
export const EnvironmentDebugInfo = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3 shadow-lg max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-4 w-4 text-yellow-600" />
          <span className="font-semibold text-yellow-800">Development Mode</span>
        </div>
        <div className="text-xs text-yellow-700 space-y-1">
          <div>• Environment: {process.env.NODE_ENV}</div>
          <div>• Debug features: Enabled</div>
          <div>• User testing: Safe</div>
          <div className="pt-1 font-medium">
            ✅ Korisnici ne vide ove promjene
          </div>
        </div>
      </div>
    </div>
  );
};