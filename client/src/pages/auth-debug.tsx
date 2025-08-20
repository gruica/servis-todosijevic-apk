import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function AuthDebugPage() {
  const [username, setUsername] = useState("testpartner@test.me");
  const [password, setPassword] = useState("test123");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (type: 'success' | 'error', title: string, details: any) => {
    setResults(prev => [...prev, { type, title, details, timestamp: new Date().toISOString() }]);
  };

  const clearResults = () => setResults([]);

  const testJWTLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/jwt-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addResult('success', 'JWT Login USPEŠAN', {
          status: response.status,
          user: data.user?.fullName,
          role: data.user?.role,
          token: data.token ? 'Kreiran' : 'Nedostaje',
          userId: data.user?.id
        });
        
        // Test JWT user endpoint sa dobijenim token-om
        if (data.token) {
          testJWTUser(data.token);
        }
      } else {
        addResult('error', 'JWT Login NEUSPEŠAN', {
          status: response.status,
          error: data.error
        });
      }
    } catch (error: any) {
      addResult('error', 'JWT Login GREŠKA', { error: error.message });
    }
    setIsLoading(false);
  };

  const testJWTUser = async (token: string) => {
    try {
      const response = await fetch('/api/jwt-user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addResult('success', 'JWT User endpoint RADI', {
          status: response.status,
          user: data.fullName,
          role: data.role,
          id: data.id
        });
      } else {
        addResult('error', 'JWT User endpoint PROBLEM', {
          status: response.status,
          error: data.error
        });
      }
    } catch (error: any) {
      addResult('error', 'JWT User GREŠKA', { error: error.message });
    }
  };

  const testSessionLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addResult('success', 'Session Login USPEŠAN', {
          status: response.status,
          user: data.fullName,
          role: data.role,
          id: data.id
        });
        
        // Test session user endpoint
        testSessionUser();
      } else {
        addResult('error', 'Session Login NEUSPEŠAN', {
          status: response.status,
          error: data.error || 'Nepoznata greška'
        });
      }
    } catch (error: any) {
      addResult('error', 'Session Login GREŠKA', { error: error.message });
    }
    setIsLoading(false);
  };

  const testSessionUser = async () => {
    try {
      const response = await fetch('/api/user', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult('success', 'Session User endpoint RADI', {
          status: response.status,
          user: data.fullName,
          role: data.role,
          id: data.id
        });
      } else {
        addResult('error', 'Session User endpoint PROBLEM', {
          status: response.status,
          error: 'Not authenticated'
        });
      }
    } catch (error: any) {
      addResult('error', 'Session User GREŠKA', { error: error.message });
    }
  };

  const testFrontendAuth = async () => {
    setIsLoading(true);
    try {
      // Simuliramo useAuth hook poziv
      const token = localStorage.getItem('auth_token');
      addResult('info', 'Browser Storage Check', {
        'localStorage token': token ? 'Postoji' : 'Ne postoji',
        'token preview': token ? token.substring(0, 50) + '...' : 'N/A'
      });

      // Test trenutni useAuth endpoint
      if (token) {
        const response = await fetch('/api/jwt-user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          addResult('success', 'Postojeći Token VALJAN', {
            user: data.fullName,
            role: data.role
          });
        } else {
          addResult('error', 'Postojeći Token NEVAŽEĆI', {
            status: response.status
          });
        }
      }
    } catch (error: any) {
      addResult('error', 'Frontend Auth Test GREŠKA', { error: error.message });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🔒 Auth System Debug - Frigo Sistem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Korisničko ime (email):</Label>
                <Input 
                  type="email" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <Label>Lozinka:</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button onClick={testJWTLogin} disabled={isLoading}>
                Test JWT Login
              </Button>
              <Button onClick={testSessionLogin} disabled={isLoading}>
                Test Session Login
              </Button>
              <Button onClick={testFrontendAuth} disabled={isLoading}>
                Test Frontend Auth
              </Button>
              <Button variant="outline" onClick={clearResults}>
                Očisti rezultate
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Poznati poslovni partneri u sistemu:</strong><br/>
                • testpartner@test.me (Test Partner)<br/>
                • robert.ivezic@tehnoplus.me (Robert Ivezić)<br/>
                • info@tehnolux.me (Jasmin - Tehnolux)<br/>
                • info@serviscommerce.me (Nikola Bećir)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={index} className={result.type === 'success' ? 'border-green-500' : result.type === 'error' ? 'border-red-500' : 'border-blue-500'}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={result.type === 'success' ? 'default' : result.type === 'error' ? 'destructive' : 'secondary'}>
                      {result.title}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(result.details).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <strong>{key}:</strong> {String(value)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}