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
  const [adminPrintEnabled, setAdminPrintEnabled] = useState<boolean>(false); // Admin kontrola štampanja

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

  // Nova funkcija za direktno štampanje Beko izvještaja
  const handlePrintReport = () => {
    if (!billingData?.services.length) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <html>
        <head>
          <title>Beko Fakturisanje - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              font-size: 9px; 
              line-height: 1.2; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 15px; 
              border-bottom: 2px solid #dc2626; 
              padding-bottom: 8px; 
            }
            .header h1 { margin: 0; font-size: 18px; color: #dc2626; }
            .header h2 { margin: 5px 0; font-size: 16px; color: #dc2626; }
            .header p { margin: 0; font-size: 10px; }
            .warranty-badge { 
              background: #059669; 
              color: white; 
              padding: 4px 8px; 
              border-radius: 12px; 
              font-size: 10px; 
              margin-top: 5px; 
              display: inline-block; 
            }
            .summary { 
              background: #fef2f2; 
              border: 1px solid #fecaca; 
              padding: 8px; 
              margin-bottom: 10px; 
              font-size: 10px;
              display: flex;
              justify-content: space-between;
            }
            .services-table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 8px;
            }
            .services-table th { 
              background: #dc2626; 
              color: white;
              border: 1px solid #ccc; 
              padding: 4px 2px; 
              text-align: left; 
              font-weight: bold;
              white-space: nowrap;
            }
            .services-table td { 
              border: 1px solid #ccc; 
              padding: 3px 2px; 
              vertical-align: top;
              max-width: 80px;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .services-table tr:nth-child(even) { background: #fef2f2; }
            .services-table tr:hover { background: #fee2e2; }
            .service-number { font-weight: bold; color: #dc2626; }
            .cost { font-weight: bold; color: #059669; }
            .brand { font-size: 7px; color: #666; }
            .phone { font-size: 7px; }
            .serial { font-size: 6px; font-family: monospace; }
            .warranty-indicator { 
              background: #059669; 
              color: white; 
              padding: 2px 4px; 
              border-radius: 4px; 
              font-size: 6px; 
              font-weight: bold; 
            }
            .footer { 
              margin-top: 10px; 
              text-align: center; 
              font-size: 8px; 
              color: #666; 
              border-top: 1px solid #dc2626;
              padding-top: 8px;
            }
            @media print { 
              body { margin: 0; } 
              .no-print { display: none; }
              .services-table { page-break-inside: auto; }
              .services-table tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔧 Beko Fakturisanje</h1>
            <h2>${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</h2>
            <p>Završeni garantni servisi - Beko brandovi</p>
            <div class="warranty-badge">✅ SAMO GARANTNI SERVISI</div>
          </div>
          
          <div class="summary">
            <div><strong>Ukupno servisa:</strong> ${billingData.totalServices}</div>
            <div><strong>Ukupna vrednost:</strong> ${Number(billingData.totalCost || 0).toFixed(2)} €</div>
            <div><strong>Brendovi:</strong> ${billingData.brandBreakdown.map(b => `${b.brand} (${b.count})`).join(', ')}</div>
            ${billingData.autoDetectedCount ? `<div><strong>Auto-detektovano:</strong> ${billingData.autoDetectedCount} servisa</div>` : ''}
          </div>
          
          <table class="services-table">
            <thead>
              <tr>
                <th style="width: 6%;">Servis #</th>
                <th style="width: 14%;">Klijent</th>
                <th style="width: 9%;">Telefon</th>
                <th style="width: 12%;">Adresa</th>
                <th style="width: 8%;">Grad</th>
                <th style="width: 10%;">Uređaj</th>
                <th style="width: 8%;">Brend</th>
                <th style="width: 10%;">Model</th>
                <th style="width: 9%;">Serijski #</th>
                <th style="width: 9%;">Serviser</th>
                <th style="width: 7%;">Završeno</th>
                <th style="width: 6%;">Cena</th>
                <th style="width: 4%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${billingData.services.map(service => `
                <tr>
                  <td class="service-number">#${service.serviceNumber}</td>
                  <td>${service.clientName}</td>
                  <td class="phone">${service.clientPhone}</td>
                  <td>${service.clientAddress}</td>
                  <td>${service.clientCity}</td>
                  <td>${service.applianceCategory}</td>
                  <td class="brand">${service.manufacturerName}</td>
                  <td>${service.applianceModel}</td>
                  <td class="serial">${service.serialNumber}</td>
                  <td>${service.technicianName}</td>
                  <td>${format(new Date(service.completedDate), 'dd.MM.yy')}${service.isAutoDetected ? '*' : ''}</td>
                  <td class="cost">${Number(service.cost || 0).toFixed(2)}€</td>
                  <td><span class="warranty-indicator">GAR</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            ${billingData.autoDetectedCount ? '<p>* Auto-detektovani servisi (korišten datum kreiranja)</p>' : ''}
            <p>Izveštaj generisan: ${format(new Date(), 'dd.MM.yyyy HH:mm')} | Frigo Sistem Todosijević | Beko Garantni Servisi</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
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

            <div className="flex items-end space-x-2">
              <Button 
                onClick={handleExportToCSV} 
                disabled={!billingData?.services.length}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              {adminPrintEnabled && (
                <Button 
                  onClick={handlePrintReport}
                  disabled={!billingData?.services.length}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Štampaj
                </Button>
              )}
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

      {/* Admin Kontrola Štampanja - Dodato na kraj komponente */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Printer className="h-5 w-5" />
            Admin Kontrola - Direktno Štampanje
          </CardTitle>
          <p className="text-sm text-red-700">
            Opcija za aktiviranje direktnog štampanja Beko fakturisanja za partnere
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              <div>
                <h3 className="font-medium text-red-900">Omogući direktno štampanje</h3>
                <p className="text-sm text-red-700">
                  Kada je aktivno, partneri mogu direktno da štampaju Beko fakturisanja
                </p>
              </div>
            </div>
            <Switch
              checked={adminPrintEnabled}
              onCheckedChange={setAdminPrintEnabled}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
          {adminPrintEnabled && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Direktno štampanje je aktivno!</strong> Dugme za štampanje je sada dostupno partnerima za Beko fakturisanja.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}