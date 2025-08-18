import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, FileText, Download, Euro, CheckCircle, User, Phone, MapPin, Wrench, Package, Clock, Printer, Zap, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface BekoBillingService {
  id: number;
  serviceNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  applianceCategory: string;
  manufacturerName: string;
  applianceModel: string;
  serialNumber: string;
  technicianName: string;
  completedDate: string;
  originalCompletedDate?: string;
  cost: number;
  description: string;
  warrantyStatus: string;
  isWarrantyService: boolean;
  isAutoDetected?: boolean;
  detectionMethod?: string;
}

interface BekoBrandBreakdown {
  brand: string;
  count: number;
  cost: number;
}

interface BekoMonthlyReport {
  month: string;
  year: number;
  brandGroup: string;
  bekoBrands: string[];
  services: BekoBillingService[];
  servicesByBrand: Record<string, BekoBillingService[]>;
  totalServices: number;
  totalCost: number;
  autoDetectedCount?: number;
  detectionSummary?: {
    withCompletedDate: number;
    withUpdatedDateFallback: number;
  };
  brandBreakdown: BekoBrandBreakdown[];
}

export default function BekoBillingReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [enhancedMode, setEnhancedMode] = useState<boolean>(true); // Defaultno koristi enhanced mode

  const bekoBrands = ['Beko', 'Grundig', 'Blomberg'];
  const months = [
    { value: '01', label: 'Januar' },
    { value: '02', label: 'Februar' },
    { value: '03', label: 'Mart' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Maj' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Avgust' },
    { value: '09', label: 'Septembar' },
    { value: '10', label: 'Oktobar' },
    { value: '11', label: 'Novembar' },
    { value: '12', label: 'Decembar' }
  ];

  // Fetch warranty services for all Beko brands in selected period
  const { data: billingData, isLoading } = useQuery({
    queryKey: [enhancedMode ? '/api/admin/billing/beko/enhanced' : '/api/admin/billing/beko', selectedMonth, selectedYear, enhancedMode],
    enabled: !!selectedMonth && !!selectedYear,
    queryFn: async () => {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear.toString()
      });
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Nema autentifikacije');
      
      const endpoint = enhancedMode ? '/api/admin/billing/beko/enhanced' : '/api/admin/billing/beko';
      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Greška pri dohvatanju podataka: ${errorText}`);
      }
      return await response.json() as BekoMonthlyReport;
    }
  });

  // Generate export data
  const handleExportToCSV = () => {
    if (!billingData?.services.length) return;

    const csvHeaders = 'Broj servisa,Klijent,Telefon,Adresa,Grad,Uređaj,Brend,Model,Serijski broj,Serviser,Datum završetka,Cena,Opis problema\n';
    
    const csvData = billingData.services.map(service => 
      `${service.serviceNumber},"${service.clientName}","${service.clientPhone}","${service.clientAddress}","${service.clientCity}","${service.applianceCategory}","${service.manufacturerName}","${service.applianceModel}","${service.serialNumber}","${service.technicianName}","${format(new Date(service.completedDate), 'dd.MM.yyyy')}","${service.cost || 0}","${service.description.replace(/"/g, '""')}"`
    ).join('\n');

    const blob = new Blob([csvHeaders + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Beko_garancija_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Beko Fakturisanje</h1>
          <p className="text-muted-foreground">
            Pregled garantnih servisa za Beko brandove za fakturisanje
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">
            {billingData ? `${billingData.month} ${billingData.year}` : 'Izaberite period'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Filteri i postavke
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Mesec</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite mesec" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Godina</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite godinu" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enhanced-mode"
                  checked={enhancedMode}
                  onCheckedChange={setEnhancedMode}
                />
                <label 
                  htmlFor="enhanced-mode" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Enhanced Mode
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Automatski hvata sve završene servise
              </p>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleExportToCSV} 
                disabled={!billingData?.services.length}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Izvezi CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {billingData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ukupno servisa</p>
                  <p className="text-2xl font-bold">{billingData.totalServices}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ukupna vrednost</p>
                  <p className="text-2xl font-bold">{Number(billingData.totalCost || 0).toFixed(2)}€</p>
                </div>
                <Euro className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brendovi</p>
                  <p className="text-2xl font-bold">{billingData.brandBreakdown.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          {billingData.autoDetectedCount !== undefined && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Auto-detektovano</p>
                    <p className="text-2xl font-bold">{billingData.autoDetectedCount}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Učitavam podatke...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data */}
      {!isLoading && billingData && billingData.totalServices === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nema garantnih servisa za Beko brendove u izabranom periodu ({billingData.month} {billingData.year}).
          </AlertDescription>
        </Alert>
      )}

      {/* Brand Breakdown */}
      {billingData && billingData.brandBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Raspored po brendovima
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingData.brandBreakdown.map((brand) => (
                <div key={brand.brand} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">{brand.brand}</p>
                      <p className="text-sm text-muted-foreground">{brand.count} servisa</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{Number(brand.cost).toFixed(2)}€</p>
                    <p className="text-sm text-muted-foreground">
                      {brand.count > 0 ? (brand.cost / brand.count).toFixed(2) : '0.00'}€ prosek
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Table */}
      {billingData && billingData.services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detaljni pregled servisa ({billingData.services.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Servis</th>
                    <th className="text-left p-2">Klijent</th>
                    <th className="text-left p-2">Uređaj</th>
                    <th className="text-left p-2">Serviser</th>
                    <th className="text-left p-2">Datum</th>
                    <th className="text-left p-2">Cena</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.services.map((service) => (
                    <tr key={service.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">#{service.serviceNumber}</p>
                          <p className="text-sm text-muted-foreground">{service.description.substring(0, 50)}...</p>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{service.clientName}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {service.clientPhone}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {service.clientCity}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{service.manufacturerName}</p>
                          <p className="text-sm text-muted-foreground">{service.applianceModel}</p>
                          <p className="text-xs text-muted-foreground">{service.serialNumber}</p>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="text-sm">{service.technicianName}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-sm">
                            {format(new Date(service.completedDate), 'dd.MM.yyyy')}
                          </span>
                        </div>
                        {service.isAutoDetected && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Auto-detektovano
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <p className="font-bold">{Number(service.cost || 0).toFixed(2)}€</p>
                      </td>
                      <td className="p-2">
                        <Badge variant="default" className="bg-green-500">
                          Garantni
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Mode Info */}
      {billingData && enhancedMode && billingData.detectionSummary && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Enhanced Mode aktiviran:</strong> Automatski detektovano {billingData.detectionSummary.withCompletedDate} servisa sa datumom završetka i {billingData.detectionSummary.withUpdatedDateFallback} servisa sa backup datumom kreiranja.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}