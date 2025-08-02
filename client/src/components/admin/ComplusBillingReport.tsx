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

interface BillingService {
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
  isAutoDetected?: boolean;
  detectionMethod?: string;
}

interface BrandBreakdown {
  brand: string;
  count: number;
  cost: number;
}

interface MonthlyReport {
  month: string;
  year: number;
  brandGroup: string;
  complusBrands: string[];
  services: BillingService[];
  servicesByBrand: Record<string, BillingService[]>;
  totalServices: number;
  totalCost: number;
  autoDetectedCount?: number;
  detectionSummary?: {
    withCompletedDate: number;
    withUpdatedDateFallback: number;
  };
  brandBreakdown: BrandBreakdown[];
}

export default function ComplusBillingReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [enhancedMode, setEnhancedMode] = useState<boolean>(true); // Defaultno koristi enhanced mode

  const complusBrands = ['Electrolux', 'Elica', 'Candy', 'Hoover', 'Turbo Air'];
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

  // Fetch warranty services for all Complus brands in selected period
  const { data: billingData, isLoading } = useQuery({
    queryKey: [enhancedMode ? '/api/admin/billing/complus/enhanced' : '/api/admin/billing/complus', selectedMonth, selectedYear, enhancedMode],
    enabled: !!selectedMonth && !!selectedYear,
    queryFn: async () => {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear.toString()
      });
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Nema autentifikacije');
      
      const endpoint = enhancedMode ? '/api/admin/billing/complus/enhanced' : '/api/admin/billing/complus';
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
      return await response.json() as MonthlyReport;
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
    link.setAttribute('download', `Complus_garancija_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle print functionality for horizontal table layout (20 services per page)
  const handlePrintReport = () => {
    if (!billingData?.services.length) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <html>
        <head>
          <title>ComPlus Fakturisanje - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</title>
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
              border-bottom: 2px solid #333; 
              padding-bottom: 8px; 
            }
            .header h1 { margin: 0; font-size: 16px; }
            .header h2 { margin: 5px 0; font-size: 14px; }
            .header p { margin: 0; font-size: 10px; }
            .summary { 
              background: #f5f5f5; 
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
              background: #e3f2fd; 
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
            .services-table tr:nth-child(even) { background: #f9f9f9; }
            .services-table tr:hover { background: #f0f8ff; }
            .service-number { font-weight: bold; color: #1976d2; }
            .cost { font-weight: bold; color: #2e7d32; }
            .brand { font-size: 7px; color: #666; }
            .phone { font-size: 7px; }
            .serial { font-size: 6px; font-family: monospace; }
            .footer { 
              margin-top: 10px; 
              text-align: center; 
              font-size: 8px; 
              color: #666; 
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
            <h1>ComPlus Fakturisanje</h1>
            <h2>${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</h2>
            <p>Završeni garancijski servisi - Svi ComPlus brendovi</p>
          </div>
          
          <div class="summary">
            <div><strong>Ukupno servisa:</strong> ${billingData.totalServices}</div>
            <div><strong>Ukupna vrednost:</strong> ${billingData.totalCost.toFixed(2)} €</div>
            <div><strong>Brendovi:</strong> ${billingData.brandBreakdown.map(b => `${b.brand} (${b.count})`).join(', ')}</div>
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
                  <td>${format(new Date(service.completedDate), 'dd.MM.yy')}</td>
                  <td class="cost">${service.cost?.toFixed(2) || '0.00'}€</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            Izveštaj generisan: ${format(new Date(), 'dd.MM.yyyy HH:mm')} | Frigo Sistem Todosijević | ComPlus Fakturisanje
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complus Fakturisanje - Svi Brendovi Zajedno
          </CardTitle>
          <p className="text-sm text-gray-600">
            Mesečna evidencija završenih garancijskih servisa za sve Complus brendove (Electrolux, Elica, Candy, Hoover, Turbo Air)
          </p>
        </CardHeader>
        <CardContent>
          {/* Enhanced Mode Toggle */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-900">Enhanced Mode - Automatsko hvatanje servisa</h3>
                  <p className="text-sm text-blue-700">
                    Hvata sve završene servise uključujući i one bez completedDate (kao Gruica Todosijević)
                  </p>
                </div>
              </div>
              <Switch
                checked={enhancedMode}
                onCheckedChange={setEnhancedMode}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>

          {/* Enhanced Mode Alert */}
          {enhancedMode && billingData?.autoDetectedCount > 0 && (
            <Alert className="mb-4 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Auto-detektovano {billingData.autoDetectedCount} servisa</strong> koji nemaju completedDate 
                (korišten createdAt kao fallback). Ovo rešava problem sa servisima od "Gruica Todosijević".
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

            <div>
              <label className="text-sm font-medium mb-2 block">Godina</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Mesec</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite mesec" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button 
                onClick={handlePrintReport}
                disabled={!billingData?.services.length}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Štampaj izveštaj
              </Button>
              <Button 
                onClick={handleExportToCSV}
                disabled={!billingData?.services.length}
                className="flex-1"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          {billingData && (
            <div className="space-y-4">
              {/* Brand Breakdown Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                {billingData.brandBreakdown.map(brand => (
                  <Card key={brand.brand}>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">{brand.brand}</p>
                        <p className="text-xl font-bold">{brand.count}</p>
                        <p className="text-xs text-gray-500">{brand.cost.toFixed(2)} €</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Ukupno servisa</p>
                        <p className="text-2xl font-bold">{billingData.totalServices}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Ukupna vrednost</p>
                        <p className="text-2xl font-bold">{billingData.totalCost.toFixed(2)} €</p>
                      </div>
                      <Euro className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Period</p>
                        <p className="text-2xl font-bold">
                          {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Services List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detaljni pregled servisa - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </h3>
                
                {billingData.services.map(service => (
                  <Card key={service.id} className={`border-l-4 ${service.isAutoDetected ? 'border-l-orange-500 bg-orange-50' : 'border-l-blue-500'}`}>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Service Header */}
                        <div className="lg:col-span-3 border-b pb-4 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="default" className="text-base px-3 py-1">
                                Servis #{service.serviceNumber}
                              </Badge>
                              <Badge 
                                variant={service.cost > 0 ? "default" : "secondary"}
                                className="text-base px-3 py-1"
                              >
                                {service.cost?.toFixed(2) || '0.00'} €
                              </Badge>
                              {service.isAutoDetected && (
                                <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Auto-detektovan
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              Završeno: {format(new Date(service.completedDate), 'dd.MM.yyyy')}
                              {service.isAutoDetected && (
                                <span className="text-xs text-orange-600">(datum kreiranja)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Client Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            Podaci o klijentu
                          </h4>
                          <div className="space-y-2 bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-600" />
                              <span className="font-medium">{service.clientName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-600" />
                              <span>{service.clientPhone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-600" />
                              <span>{service.clientAddress}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-600" />
                              <span className="font-medium">{service.clientCity}</span>
                            </div>
                          </div>
                        </div>

                        {/* Appliance Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Package className="h-4 w-4 text-green-600" />
                            Podaci o aparatu
                          </h4>
                          <div className="space-y-2 bg-green-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-600" />
                              <span className="font-medium">{service.applianceCategory}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {service.manufacturerName}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-gray-600">Model:</span>
                                <span className="font-medium ml-1">{service.applianceModel}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Serijski broj:</span>
                                <span className="font-mono text-xs ml-1">{service.serialNumber}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Service Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-orange-600" />
                            Podaci o servisu
                          </h4>
                          <div className="space-y-2 bg-orange-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-gray-600" />
                              <span className="font-medium">{service.technicianName}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-gray-600">Status:</span>
                                <Badge variant="default" className="ml-1 text-xs">
                                  {service.warrantyStatus}
                                </Badge>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Troškovi:</span>
                                <span className="font-bold text-green-600 ml-1">
                                  {service.cost?.toFixed(2) || '0.00'} €
                                </span>
                              </div>
                            </div>
                            {service.description && (
                              <div className="mt-3 p-3 bg-white rounded border-l-4 border-l-gray-300">
                                <div className="text-xs text-gray-600 mb-1">Opis problema:</div>
                                <div className="text-sm">{service.description}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Učitavam podatke...</p>
            </div>
          )}

          {!selectedMonth ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Izaberite mesec i godinu za pregled Complus fakturisanja</p>
            </div>
          ) : billingData && billingData.services.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nema završenih garancijskih servisa za izabrani period</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}