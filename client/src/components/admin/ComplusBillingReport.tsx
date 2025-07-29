import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Download, Euro, CheckCircle, User, Phone, MapPin, Wrench, Package, Clock, Printer } from 'lucide-react';
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
  cost: number;
  description: string;
  warrantyStatus: string;
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
  brandBreakdown: BrandBreakdown[];
}

export default function ComplusBillingReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

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
    queryKey: ['/api/admin/billing/complus', selectedMonth, selectedYear],
    enabled: !!selectedMonth && !!selectedYear,
    queryFn: async () => {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear.toString()
      });
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Nema autentifikacije');
      
      const response = await fetch(`/api/admin/billing/complus?${params}`, {
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

  // Handle print functionality for comprehensive report
  const handlePrintReport = () => {
    if (!billingData?.services.length) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <html>
        <head>
          <title>ComPlus Fakturisanje - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .service-card { border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; page-break-inside: avoid; }
            .service-header { background: #e3f2fd; padding: 10px; margin: -15px -15px 15px -15px; border-radius: 5px 5px 0 0; }
            .info-section { display: inline-block; width: 30%; vertical-align: top; margin-right: 3%; margin-bottom: 15px; }
            .info-title { font-weight: bold; color: #1976d2; margin-bottom: 8px; }
            .info-item { margin-bottom: 5px; }
            .cost-highlight { font-size: 18px; font-weight: bold; color: #2e7d32; }
            @media print { body { margin: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ComPlus Fakturisanje</h1>
            <h2>${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</h2>
            <p>Detaljni izveštaj o završenim garancijskim servisima</p>
          </div>
          
          <div class="summary">
            <h3>Rezime meseca</h3>
            <p><strong>Ukupno servisa:</strong> ${billingData.totalServices}</p>
            <p><strong>Ukupna vrednost:</strong> ${billingData.totalCost.toFixed(2)} €</p>
            <p><strong>Brendovi:</strong> ${billingData.brandBreakdown.map(b => `${b.brand} (${b.count})`).join(', ')}</p>
          </div>
          
          ${billingData.services.map(service => `
            <div class="service-card">
              <div class="service-header">
                <h3>Servis #${service.serviceNumber} - <span class="cost-highlight">${service.cost?.toFixed(2) || '0.00'} €</span></h3>
                <p>Završeno: ${format(new Date(service.completedDate), 'dd.MM.yyyy')}</p>
              </div>
              
              <div class="info-section">
                <div class="info-title">📋 Podaci o klijentu</div>
                <div class="info-item"><strong>Ime:</strong> ${service.clientName}</div>
                <div class="info-item"><strong>Telefon:</strong> ${service.clientPhone}</div>
                <div class="info-item"><strong>Adresa:</strong> ${service.clientAddress}</div>
                <div class="info-item"><strong>Grad:</strong> ${service.clientCity}</div>
              </div>
              
              <div class="info-section">
                <div class="info-title">🔧 Podaci o aparatu</div>
                <div class="info-item"><strong>Tip:</strong> ${service.applianceCategory}</div>
                <div class="info-item"><strong>Brend:</strong> ${service.manufacturerName}</div>
                <div class="info-item"><strong>Model:</strong> ${service.applianceModel}</div>
                <div class="info-item"><strong>Serijski broj:</strong> ${service.serialNumber}</div>
              </div>
              
              <div class="info-section">
                <div class="info-title">👨‍🔧 Podaci o servisu</div>
                <div class="info-item"><strong>Serviser:</strong> ${service.technicianName}</div>
                <div class="info-item"><strong>Status:</strong> ${service.warrantyStatus}</div>
                <div class="info-item"><strong>Troškovi:</strong> <span class="cost-highlight">${service.cost?.toFixed(2) || '0.00'} €</span></div>
              </div>
              
              ${service.description ? `
                <div style="clear: both; margin-top: 15px; padding: 10px; background: #f9f9f9; border-left: 4px solid #ccc;">
                  <strong>Opis problema:</strong><br>
                  ${service.description}
                </div>
              ` : ''}
            </div>
          `).join('')}
          
          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            Izveštaj generisan: ${format(new Date(), 'dd.MM.yyyy HH:mm')} | Frigo Sistem Todosijević
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
                  <Card key={service.id} className="border-l-4 border-l-blue-500">
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
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              Završeno: {format(new Date(service.completedDate), 'dd.MM.yyyy')}
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