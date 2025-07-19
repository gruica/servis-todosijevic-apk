import React, { useEffect, useState } from 'react';

// Interfejs za status sistema
interface SystemStatus {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: any;
  lastChecked: Date;
}

// Interfejs za statistiku sistema
interface SystemStats {
  totalServices: number;
  activeServices: number;
  completedServices: number;
  totalClients: number;
  totalTechnicians: number;
  totalAppliances: number;
  totalCategories: number;
  avgResponseTime?: number;
}

// Stil za komponentu statusa
const StatusCard: React.FC<{
  status: SystemStatus;
  onClick?: () => void;
}> = ({ status, onClick }) => {
  const getStatusColor = () => {
    switch (status.status) {
      case 'healthy': return { bg: '#e8f5e9', text: '#2e7d32', border: '#81c784' };
      case 'warning': return { bg: '#fff8e1', text: '#f57f17', border: '#ffd54f' };
      case 'critical': return { bg: '#ffebee', text: '#c62828', border: '#ef9a9a' };
      default: return { bg: '#f5f5f5', text: '#757575', border: '#bdbdbd' };
    }
  };
  
  const colors = getStatusColor();
  
  return (
    <div 
      onClick={onClick}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }
      }}
      onMouseOut={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, color: colors.text, fontWeight: 600 }}>{status.name}</h3>
        <StatusBadge status={status.status} />
      </div>
      <p style={{ margin: '8px 0', color: colors.text }}>{status.message}</p>
      <small style={{ color: '#757575' }}>
        Posljednja provjera: {status.lastChecked.toLocaleTimeString()}
      </small>
    </div>
  );
};

// Komponenta za status bedž
const StatusBadge: React.FC<{ status: SystemStatus['status'] }> = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'healthy': return { text: 'Normalno', bg: '#2e7d32' };
      case 'warning': return { text: 'Upozorenje', bg: '#f57f17' };
      case 'critical': return { text: 'Kritično', bg: '#c62828' };
      default: return { text: 'Nepoznato', bg: '#757575' };
    }
  };
  
  const info = getStatusInfo();
  
  return (
    <span style={{
      backgroundColor: info.bg,
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600
    }}>
      {info.text}
    </span>
  );
};

// Komponenta za statistiku (kartica)
const StatsCard: React.FC<{ title: string; value: number | string; icon?: React.ReactNode }> = ({ 
  title, value, icon 
}) => {
  return (
    <div style={{
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      minHeight: '120px'
    }}>
      {icon && <div style={{ marginBottom: '8px', color: '#1976d2' }}>{icon}</div>}
      <h3 style={{ margin: '4px 0', fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{value}</h3>
      <p style={{ margin: '4px 0', color: '#757575', fontSize: '14px' }}>{title}</p>
    </div>
  );
};

// Glavni pregled sistema
const SystemDiagnostics: React.FC = () => {
  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<SystemStatus | null>(null);
  
  // Helper function to get JWT headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };
  
  useEffect(() => {
    // Inicijalizacija praznog objekta statistike da izbjegnemo greške pri renderiranju
    setSystemStats({
      totalServices: 0,
      activeServices: 0,
      completedServices: 0,
      totalClients: 0,
      totalTechnicians: 0,
      totalAppliances: 0,
      totalCategories: 0
    });
    
    checkSystemStatus();
  }, []);
  
  const checkSystemStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Provjera API-ja za servise
      const servicesStart = Date.now();
      const servicesResponse = await fetch('/api/services', { headers: getAuthHeaders() });
      const servicesTime = Date.now() - servicesStart;
      
      let servicesStatus: SystemStatus = {
        name: 'API Servisa',
        status: 'unknown',
        message: 'Provjera nije uspjela',
        lastChecked: new Date()
      };
      
      if (servicesResponse.ok) {
        const servicesText = await servicesResponse.text();
        try {
          const services = JSON.parse(servicesText);
          
          if (Array.isArray(services)) {
            servicesStatus = {
              name: 'API Servisa',
              status: 'healthy',
              message: `${services.length} servisa uspješno dohvaćeno (${servicesTime}ms)`,
              details: {
                count: services.length,
                responseTime: servicesTime,
                firstItem: services.length > 0 ? services[0] : null
              },
              lastChecked: new Date()
            };
            
            // Ako je vrijeme odgovora predugo, postavimo upozorenje
            if (servicesTime > 500) {
              servicesStatus.status = 'warning';
              servicesStatus.message = `API vraća podatke, ali je spor (${servicesTime}ms)`;
            }
            
            // Statistika servisa
            const activeServices = services.filter((s: any) => 
              s.status === 'in_progress' || s.status === 'scheduled'
            ).length;
            
            const completedServices = services.filter((s: any) => 
              s.status === 'completed'
            ).length;
            
            setSystemStats(prev => ({
              ...prev as SystemStats,
              totalServices: services.length,
              activeServices,
              completedServices,
              avgResponseTime: servicesTime
            }));
          } else {
            servicesStatus = {
              name: 'API Servisa',
              status: 'warning',
              message: 'API ne vraća niz podataka',
              details: { responseType: typeof services },
              lastChecked: new Date()
            };
          }
        } catch (e) {
          servicesStatus = {
            name: 'API Servisa',
            status: 'critical',
            message: 'Greška pri parsiranju JSON odgovora',
            details: { error: (e as Error).message },
            lastChecked: new Date()
          };
        }
      } else {
        servicesStatus = {
          name: 'API Servisa',
          status: 'critical',
          message: `HTTP greška: ${servicesResponse.status} ${servicesResponse.statusText}`,
          details: { 
            status: servicesResponse.status,
            statusText: servicesResponse.statusText
          },
          lastChecked: new Date()
        };
      }
      
      // Provjera API-ja za klijente
      const clientsStart = Date.now();
      const clientsResponse = await fetch('/api/clients', { headers: getAuthHeaders() });
      const clientsTime = Date.now() - clientsStart;
      
      let clientsStatus: SystemStatus = {
        name: 'API Klijenata',
        status: 'unknown',
        message: 'Provjera nije uspjela',
        lastChecked: new Date()
      };
      
      if (clientsResponse.ok) {
        const clientsText = await clientsResponse.text();
        try {
          const clients = JSON.parse(clientsText);
          
          if (Array.isArray(clients)) {
            clientsStatus = {
              name: 'API Klijenata',
              status: 'healthy',
              message: `${clients.length} klijenata uspješno dohvaćeno (${clientsTime}ms)`,
              details: {
                count: clients.length,
                responseTime: clientsTime
              },
              lastChecked: new Date()
            };
            
            // Ako je vrijeme odgovora predugo, postavimo upozorenje
            if (clientsTime > 500) {
              clientsStatus.status = 'warning';
              clientsStatus.message = `API vraća podatke, ali je spor (${clientsTime}ms)`;
            }
            
            // Statističke informacije
            setSystemStats(prev => ({
              ...prev as SystemStats,
              totalClients: clients.length
            }));
          } else {
            clientsStatus = {
              name: 'API Klijenata',
              status: 'warning',
              message: 'API ne vraća niz podataka',
              details: { responseType: typeof clients },
              lastChecked: new Date()
            };
          }
        } catch (e) {
          clientsStatus = {
            name: 'API Klijenata',
            status: 'critical',
            message: 'Greška pri parsiranju JSON odgovora',
            details: { error: (e as Error).message },
            lastChecked: new Date()
          };
        }
      } else {
        clientsStatus = {
          name: 'API Klijenata',
          status: 'critical',
          message: `HTTP greška: ${clientsResponse.status} ${clientsResponse.statusText}`,
          details: { 
            status: clientsResponse.status,
            statusText: clientsResponse.statusText
          },
          lastChecked: new Date()
        };
      }
      
      // Provjera API-ja za servisere
      const techniciansStart = Date.now();
      const techniciansResponse = await fetch('/api/technicians', { headers: getAuthHeaders() });
      const techniciansTime = Date.now() - techniciansStart;
      
      let techniciansStatus: SystemStatus = {
        name: 'API Servisera',
        status: 'unknown',
        message: 'Provjera nije uspjela',
        lastChecked: new Date()
      };
      
      if (techniciansResponse.ok) {
        const techniciansText = await techniciansResponse.text();
        try {
          const technicians = JSON.parse(techniciansText);
          
          if (Array.isArray(technicians)) {
            techniciansStatus = {
              name: 'API Servisera',
              status: 'healthy',
              message: `${technicians.length} servisera uspješno dohvaćeno (${techniciansTime}ms)`,
              details: {
                count: technicians.length,
                responseTime: techniciansTime
              },
              lastChecked: new Date()
            };
            
            // Ako je vrijeme odgovora predugo, postavimo upozorenje
            if (techniciansTime > 500) {
              techniciansStatus.status = 'warning';
              techniciansStatus.message = `API vraća podatke, ali je spor (${techniciansTime}ms)`;
            }
            
            // Statistika servisera
            setSystemStats(prev => ({
              ...prev as SystemStats,
              totalTechnicians: technicians.length
            }));
          } else {
            techniciansStatus = {
              name: 'API Servisera',
              status: 'warning',
              message: 'API ne vraća niz podataka',
              details: { responseType: typeof technicians },
              lastChecked: new Date()
            };
          }
        } catch (e) {
          techniciansStatus = {
            name: 'API Servisera',
            status: 'critical',
            message: 'Greška pri parsiranju JSON odgovora',
            details: { error: (e as Error).message },
            lastChecked: new Date()
          };
        }
      } else {
        techniciansStatus = {
          name: 'API Servisera',
          status: 'critical',
          message: `HTTP greška: ${techniciansResponse.status} ${techniciansResponse.statusText}`,
          details: { 
            status: techniciansResponse.status,
            statusText: techniciansResponse.statusText
          },
          lastChecked: new Date()
        };
      }
      
      // Provjera API-ja za uređaje
      const appliancesStart = Date.now();
      const appliancesResponse = await fetch('/api/appliances', { headers: getAuthHeaders() });
      const appliancesTime = Date.now() - appliancesStart;
      
      let appliancesStatus: SystemStatus = {
        name: 'API Uređaja',
        status: 'unknown',
        message: 'Provjera nije uspjela',
        lastChecked: new Date()
      };
      
      if (appliancesResponse.ok) {
        const appliancesText = await appliancesResponse.text();
        try {
          const appliances = JSON.parse(appliancesText);
          
          if (Array.isArray(appliances)) {
            appliancesStatus = {
              name: 'API Uređaja',
              status: 'healthy',
              message: `${appliances.length} uređaja uspješno dohvaćeno (${appliancesTime}ms)`,
              details: {
                count: appliances.length,
                responseTime: appliancesTime
              },
              lastChecked: new Date()
            };
            
            // Ako je vrijeme odgovora predugo, postavimo upozorenje
            if (appliancesTime > 500) {
              appliancesStatus.status = 'warning';
              appliancesStatus.message = `API vraća podatke, ali je spor (${appliancesTime}ms)`;
            }
            
            // Statistika uređaja
            setSystemStats(prev => ({
              ...prev as SystemStats,
              totalAppliances: appliances.length
            }));
          } else {
            appliancesStatus = {
              name: 'API Uređaja',
              status: 'warning',
              message: 'API ne vraća niz podataka',
              details: { responseType: typeof appliances },
              lastChecked: new Date()
            };
          }
        } catch (e) {
          appliancesStatus = {
            name: 'API Uređaja',
            status: 'critical',
            message: 'Greška pri parsiranju JSON odgovora',
            details: { error: (e as Error).message },
            lastChecked: new Date()
          };
        }
      } else {
        appliancesStatus = {
          name: 'API Uređaja',
          status: 'critical',
          message: `HTTP greška: ${appliancesResponse.status} ${appliancesResponse.statusText}`,
          details: { 
            status: appliancesResponse.status,
            statusText: appliancesResponse.statusText
          },
          lastChecked: new Date()
        };
      }
      
      // Provjera API-ja za kategorije uređaja
      const categoriesStart = Date.now();
      const categoriesResponse = await fetch('/api/appliance-categories', { headers: getAuthHeaders() });
      const categoriesTime = Date.now() - categoriesStart;
      
      let categoriesStatus: SystemStatus = {
        name: 'API Kategorija',
        status: 'unknown',
        message: 'Provjera nije uspjela',
        lastChecked: new Date()
      };
      
      console.log('Status kod kategorija:', categoriesResponse.status);
      
      if (categoriesResponse.ok) {
        const categoriesText = await categoriesResponse.text();
        console.log('Kategorije response text:', categoriesText);
        try {
          // Specijalni slučaj za API kategorija koji možda ne vraća format JSON-a
          if (categoriesText.trim() === '') {
            categoriesStatus = {
              name: 'API Kategorija',
              status: 'warning',
              message: 'API vraća prazan odgovor',
              details: {
                responseTime: categoriesTime,
                rawResponse: categoriesText
              },
              lastChecked: new Date()
            };
            
            // Fallback statistika - pretpostavljamo da ima barem nekoliko kategorija
            setSystemStats(prev => ({
              ...prev as SystemStats,
              totalCategories: 5 // Pretpostavka da postoji barem 5 standardnih kategorija
            }));
          } else {
            let categories;
            try {
              categories = JSON.parse(categoriesText);
            } catch (parseError) {
              console.error('Greška parsiranja:', parseError);
              
              // Specijalni slučaj - možda kategorije nisu u JSON formatu, pokušamo ih prepoznati
              if (categoriesText.includes('kategorija') || categoriesText.includes('category')) {
                categoriesStatus = {
                  name: 'API Kategorija',
                  status: 'warning',
                  message: 'API vraća podatke koji nisu u JSON formatu',
                  details: {
                    responseTime: categoriesTime,
                    rawResponse: categoriesText.substring(0, 100) + '...' // Prikažemo prvih 100 znakova
                  },
                  lastChecked: new Date()
                };
                
                // Fallback statistika - pretpostavljamo da ima barem nekoliko kategorija
                setSystemStats(prev => ({
                  ...prev as SystemStats,
                  totalCategories: 5 // Pretpostavka
                }));
              } else {
                throw parseError; // Proslijedi grešku dalje ako ne prepoznajemo format
              }
              return; // Izlazimo iz bloka ako smo već postavili status
            }
            
            if (Array.isArray(categories)) {
              categoriesStatus = {
                name: 'API Kategorija',
                status: 'healthy',
                message: `${categories.length} kategorija uspješno dohvaćeno (${categoriesTime}ms)`,
                details: {
                  count: categories.length,
                  responseTime: categoriesTime
                },
                lastChecked: new Date()
              };
              
              // Ako je vrijeme odgovora predugo, postavimo upozorenje
              if (categoriesTime > 500) {
                categoriesStatus.status = 'warning';
                categoriesStatus.message = `API vraća podatke, ali je spor (${categoriesTime}ms)`;
              }
              
              // Statistika kategorija
              setSystemStats(prev => ({
                ...prev as SystemStats,
                totalCategories: categories.length
              }));
            } else {
              categoriesStatus = {
                name: 'API Kategorija',
                status: 'warning',
                message: 'API ne vraća niz podataka',
                details: { 
                  responseType: typeof categories,
                  value: categories
                },
                lastChecked: new Date()
              };
              
              // Pretpostavka za statistiku
              setSystemStats(prev => ({
                ...prev as SystemStats,
                totalCategories: 0
              }));
            }
          }
        } catch (e) {
          console.error('Kategorije JSON greška:', e);
          categoriesStatus = {
            name: 'API Kategorija',
            status: 'critical',
            message: 'Greška pri parsiranju JSON odgovora',
            details: { 
              error: (e as Error).message,
              rawResponse: categoriesText.substring(0, 100) + '...' // Prikažemo prvih 100 znakova
            },
            lastChecked: new Date()
          };
          
          // Ako ne možemo parsirat kategorije, postavimo 0
          setSystemStats(prev => ({
            ...prev as SystemStats,
            totalCategories: 0
          }));
        }
      } else {
        categoriesStatus = {
          name: 'API Kategorija',
          status: 'critical',
          message: `HTTP greška: ${categoriesResponse.status} ${categoriesResponse.statusText}`,
          details: { 
            status: categoriesResponse.status,
            statusText: categoriesResponse.statusText
          },
          lastChecked: new Date()
        };
      }
      
      // Provjera stanja sesije
      const sessionStatus: SystemStatus = {
        name: 'Status Sesije',
        status: 'unknown',
        message: 'Provjera sesije',
        lastChecked: new Date()
      };
      
      const sessionResponse = await fetch('/api/jwt-user', { headers: getAuthHeaders() });
      
      if (sessionResponse.status === 200) {
        sessionStatus.status = 'healthy';
        sessionStatus.message = 'Sesija je aktivna';
      } else if (sessionResponse.status === 401) {
        sessionStatus.status = 'warning';
        sessionStatus.message = 'Niste prijavljeni';
      } else {
        sessionStatus.status = 'critical';
        sessionStatus.message = `Greška sesije: ${sessionResponse.status} ${sessionResponse.statusText}`;
      }
      
      // Postavimo sve provjere sustava u stanje
      const allStatuses = [
        servicesStatus,
        clientsStatus,
        techniciansStatus,
        appliancesStatus,
        categoriesStatus,
        sessionStatus
      ];
      
      setSystemStatuses(allStatuses);
      
      // Izračunaj prosječno vrijeme odgovora za API-je
      let totalResponseTime = 0;
      let apiCount = 0;
      
      allStatuses.forEach(status => {
        if (status.details?.responseTime) {
          totalResponseTime += status.details.responseTime;
          apiCount++;
        }
      });
      
      // Postavimo statistike
      setSystemStats(prev => {
        // Osnovne statistike ako ne postoje
        const stats = prev || {
          totalServices: 0,
          activeServices: 0,
          completedServices: 0,
          totalClients: 0,
          totalTechnicians: 0,
          totalAppliances: 0,
          totalCategories: 0
        };
        
        // Dodamo prosječno vrijeme odgovora ako imamo API-je
        if (apiCount > 0) {
          return {
            ...stats,
            avgResponseTime: totalResponseTime / apiCount
          };
        }
        
        return stats;
      });
    } catch (err) {
      console.error('Greška prilikom provjere statusa sustava:', err);
      setError('Greška prilikom provjere statusa sustava. Molimo pokušajte ponovno kasnije.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funkcija za prikaz statusa sustava - poboljšana verzija
  const getOverallSystemStatus = (): 'healthy' | 'warning' | 'critical' | 'unknown' => {
    if (systemStatuses.length === 0) return 'unknown';
    
    // Računanje prosječnog vremena odgovora - ako je prosječno vrijeme veliko, pokazat ćemo upozorenje
    let totalResponseTime = 0;
    let apiCount = 0;
    
    systemStatuses.forEach(status => {
      if (status.details?.responseTime) {
        totalResponseTime += status.details.responseTime;
        apiCount++;
      }
    });
    
    // Ako imamo barem jedan API i provjerimo prosječno vrijeme odgovora
    if (apiCount > 0) {
      const avgResponseTime = totalResponseTime / apiCount;
      
      // Ako je prosječno vrijeme veće od 800ms, postavimo upozorenje čak i ako svi API-ji rade
      if (avgResponseTime > 800 && systemStatuses.every(s => s.status === 'healthy')) {
        return 'warning'; // Sustav je funkcionalan, ali spor
      }
    }
    
    if (systemStatuses.some(s => s.status === 'critical')) return 'critical';
    if (systemStatuses.some(s => s.status === 'warning')) return 'warning';
    if (systemStatuses.every(s => s.status === 'healthy')) return 'healthy';
    
    return 'warning';
  };
  
  // Funkcija za otvaranje detalja statusa
  const handleStatusClick = (status: SystemStatus) => {
    setSelectedStatus(status);
  };
  
  // Funkcija za zatvaranje detalja statusa
  const handleCloseDetails = () => {
    setSelectedStatus(null);
  };
  
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      fontFamily: 'Arial, sans-serif' 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0, color: '#1976d2' }}>Dijagnostika Sistema</h1>
        
        <div>
          <button 
            onClick={checkSystemStatus}
            disabled={isLoading}
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Provjera u toku...' : 'Osvježi status'}
          </button>
        </div>
      </div>
      
      {/* Glavni indikator statusa sustava */}
      <div style={{
        backgroundColor: getOverallSystemStatus() === 'healthy' ? '#e8f5e9' : 
                        getOverallSystemStatus() === 'warning' ? '#fff8e1' : 
                        getOverallSystemStatus() === 'critical' ? '#ffebee' : '#f5f5f5',
        border: `1px solid ${
          getOverallSystemStatus() === 'healthy' ? '#81c784' : 
          getOverallSystemStatus() === 'warning' ? '#ffd54f' : 
          getOverallSystemStatus() === 'critical' ? '#ef9a9a' : '#bdbdbd'
        }`,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          color: getOverallSystemStatus() === 'healthy' ? '#2e7d32' : 
                getOverallSystemStatus() === 'warning' ? '#f57f17' : 
                getOverallSystemStatus() === 'critical' ? '#c62828' : '#757575',
        }}>
          Status Sistema: {
            getOverallSystemStatus() === 'healthy' ? 'Normalno' : 
            getOverallSystemStatus() === 'warning' ? 'Upozorenje' : 
            getOverallSystemStatus() === 'critical' ? 'Kritično' : 'Nepoznato'
          }
        </h2>
        <p style={{
          margin: '0',
          color: getOverallSystemStatus() === 'healthy' ? '#2e7d32' : 
                getOverallSystemStatus() === 'warning' ? '#f57f17' : 
                getOverallSystemStatus() === 'critical' ? '#c62828' : '#757575',
        }}>
          {
            getOverallSystemStatus() === 'healthy' ? 'Svi sistemi funkcionišu normalno' : 
            getOverallSystemStatus() === 'warning' ? 'Neki podsistemi imaju upozorenja koja zahtjevaju pažnju' : 
            getOverallSystemStatus() === 'critical' ? 'Kritični problemi zahtjevaju hitnu intervenciju' : 
            'Status sistema nije dostupan'
          }
        </p>
      </div>
      
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}
      
      {/* Statistike sistema */}
      {systemStats && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#1976d2', marginBottom: '16px' }}>Statistika Sistema</h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '16px' 
          }}>
            <StatsCard 
              title="Ukupno servisa" 
              value={(systemStats?.totalServices || 0).toString()} 
            />
            <StatsCard 
              title="Aktivni servisi" 
              value={(systemStats?.activeServices || 0).toString()} 
            />
            <StatsCard 
              title="Završeni servisi" 
              value={(systemStats?.completedServices || 0).toString()} 
            />
            <StatsCard 
              title="Ukupno klijenata" 
              value={(systemStats?.totalClients || 0).toString()} 
            />
            <StatsCard 
              title="Serviseri" 
              value={(systemStats?.totalTechnicians || 0).toString()} 
            />
            <StatsCard 
              title="Uređaji" 
              value={(systemStats?.totalAppliances || 0).toString()} 
            />
            {systemStats?.avgResponseTime && (
              <StatsCard 
                title="Prosječno vrijeme odgovora" 
                value={`${systemStats.avgResponseTime.toFixed(0)} ms`} 
              />
            )}
          </div>
        </div>
      )}
      
      {/* Detaljan statusni prikaz */}
      <div>
        <h2 style={{ color: '#1976d2', marginBottom: '16px' }}>Status Podsistema</h2>
        
        {isLoading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px', 
            color: '#757575' 
          }}>
            <p>Provjera statusa sistema u toku...</p>
          </div>
        ) : (
          <div>
            {systemStatuses.map((status, index) => (
              <StatusCard 
                key={index}
                status={status}
                onClick={() => handleStatusClick(status)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Dijaloški prozor s detaljima */}
      {selectedStatus && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h2 style={{ margin: 0, color: '#1976d2' }}>Detalji: {selectedStatus.name}</h2>
              <StatusBadge status={selectedStatus.status} />
            </div>
            
            <p style={{ fontSize: '16px', color: '#333' }}>{selectedStatus.message}</p>
            
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ color: '#1976d2', marginBottom: '8px' }}>Detalji</h3>
              <pre style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '4px',
                overflowX: 'auto',
                fontSize: '14px'
              }}>
                {JSON.stringify(selectedStatus.details, null, 2)}
              </pre>
            </div>
            
            <div style={{ 
              borderTop: '1px solid #eee', 
              marginTop: '16px', 
              paddingTop: '16px',
              textAlign: 'right'
            }}>
              <small style={{ color: '#757575', display: 'block', marginBottom: '8px' }}>
                Posljednja provjera: {selectedStatus.lastChecked.toLocaleString()}
              </small>
              <button 
                onClick={handleCloseDetails}
                style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Linkovi za navigaciju */}
      <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
        <a href="/diagnostics" style={{ color: '#1976d2', textDecoration: 'none', marginRight: '16px' }}>
          &larr; Osnovna dijagnostika
        </a>
        <a href="/" style={{ color: '#1976d2', textDecoration: 'none' }}>
          &larr; Početna stranica
        </a>
      </div>
    </div>
  );
};

export default SystemDiagnostics;