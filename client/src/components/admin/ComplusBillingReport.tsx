import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Download, Euro, CheckCircle } from 'lucide-react';
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

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

            <div className="flex items-end">
              <Button 
                onClick={handleExportToCSV}
                disabled={!billingData?.services.length}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Izvezi CSV (Svi Complus)
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

              {/* Services Table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Complus Garancija (Svi Brendovi) - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Servis #</th>
                          <th className="text-left p-2">Klijent</th>
                          <th className="text-left p-2">Grad</th>
                          <th className="text-left p-2">Uređaj</th>
                          <th className="text-left p-2">Model</th>
                          <th className="text-left p-2">Serviser</th>
                          <th className="text-left p-2">Završeno</th>
                          <th className="text-left p-2">Cena</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingData.services.map(service => (
                          <tr key={service.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">#{service.serviceNumber}</td>
                            <td className="p-2">
                              <div>
                                <div className="font-medium">{service.clientName}</div>
                                <div className="text-xs text-gray-500">{service.clientPhone}</div>
                              </div>
                            </td>
                            <td className="p-2">{service.clientCity}</td>
                            <td className="p-2">
                              <div>
                                <div className="font-medium">{service.applianceCategory}</div>
                                <div className="text-xs text-gray-500">{service.manufacturerName}</div>
                              </div>
                            </td>
                            <td className="p-2">
                              <div>
                                <div className="font-medium">{service.applianceModel}</div>
                                <div className="text-xs text-gray-500">{service.serialNumber}</div>
                              </div>
                            </td>
                            <td className="p-2">{service.technicianName}</td>
                            <td className="p-2">
                              {format(new Date(service.completedDate), 'dd.MM.yyyy')}
                            </td>
                            <td className="p-2">
                              <Badge variant={service.cost > 0 ? "default" : "secondary"}>
                                {service.cost?.toFixed(2) || '0.00'} €
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
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