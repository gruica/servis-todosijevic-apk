import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PrinterIcon, Download, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ServiceReportDTO } from "@shared/schema";
import logoPng from "@assets/logo.png";

export default function ServiceReport() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  const { data: report, isLoading, error } = useQuery<ServiceReportDTO>({
    queryKey: ['/api/admin/services', id, 'report'],
    enabled: !!id
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Jednostavno pozovi print dialog - korisnik može izabrati "Save as PDF"
    window.print();
  };

  const handleBack = () => {
    setLocation('/admin/services');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Priprema izvještaja...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Greška</h1>
          <p className="text-gray-600 mb-4">Izvještaj nije moguće učitati.</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nazad na servise
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Toolbar - sakrij pri štampanju */}
      <div className="print:hidden bg-gray-50 border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button onClick={handleBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
            <h1 className="text-lg font-semibold">Izvještaj sa servisa #{report.service.orderNumber}</h1>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handlePrint} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <PrinterIcon className="h-4 w-4 mr-2" />
              Štampaj
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Preuzmi PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Glavni sadržaj izvještaja */}
      <div className="max-w-4xl mx-auto p-6 print:p-0 print:max-w-none">
        <div className="bg-white border border-gray-300 print:border-0" data-testid="service-report">
          
          {/* Zaglavlje sa logo-om i kontakt informacijama */}
          <div className="flex items-start justify-between p-6 border-b border-gray-300">
            <div className="flex items-center gap-4">
              <img src={logoPng} alt="Logo" className="h-16 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-red-600">{report.companyInfo.name}</h1>
                <p className="text-sm text-gray-600">SVIJET TEHNIKE</p>
              </div>
            </div>
            
            <div className="text-right text-sm">
              <p className="font-medium">{report.companyInfo.name} doo</p>
              <p>{report.companyInfo.address}</p>
              <p>PIB: {report.companyInfo.pib}</p>
              <p>PDV: {report.companyInfo.pdv}</p>
              <p>Tel: {report.companyInfo.phone}</p>
              <p>Email: {report.companyInfo.email}</p>
              <p>Web sajt: {report.companyInfo.website}</p>
            </div>
          </div>

          {/* Naslov izvještaja */}
          <div className="text-center py-4 border-b border-gray-300">
            <h2 className="text-xl font-bold">IZVJEŠTAJ SA SERVISA</h2>
          </div>

          {/* Osnovne informacije servisa */}
          <div className="p-6 space-y-4">
            <div className="flex gap-6">
              {/* Lijeva kolona */}
              <div className="flex-1 space-y-4">
                <div className="border border-gray-300 p-4 rounded">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Komitent:</span>
                      <p className="border-b border-gray-300 pb-1">{report.client.fullName}</p>
                    </div>
                    <div>
                      <span className="font-medium">Broj naloga:</span>
                      <p className="border-b border-gray-300 pb-1 text-lg font-bold">{report.service.orderNumber}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium">Mjesto isporuke:</span>
                      <p className="border-b border-gray-300 pb-1">{report.client.address}</p>
                    </div>
                    <div>
                      <span className="font-medium">Dat. naloga:</span>
                      <p className="border-b border-gray-300 pb-1">{formatDate(report.dates.orderDate)}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium">Adresa:</span>
                      <p className="border-b border-gray-300 pb-1">{report.client.address}</p>
                    </div>
                    <div></div>
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <span className="font-medium">PDV broj:</span>
                        <p className="border-b border-gray-300 pb-1">{report.client.pdv || ''}</p>
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">PIB:</span>
                        <p className="border-b border-gray-300 pb-1">{report.client.pib || ''}</p>
                      </div>
                    </div>
                    <div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tehnički detalji uređaja */}
            <div className="border border-gray-300 p-4 rounded">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Poslovna jedinica:</span>
                  <p className="border-b border-gray-300 pb-1">mp.TehnoPlus Gornja Gorica</p>
                </div>
                <div>
                  <span className="font-medium">Ime kupca:</span>
                  <p className="border-b border-gray-300 pb-1">{report.client.fullName}</p>
                </div>
                
                <div>
                  <span className="font-medium">Artikal:</span>
                  <p className="border-b border-gray-300 pb-1">{report.appliance.category} {report.appliance.manufacturer}</p>
                </div>
                <div>
                  <span className="font-medium">Broj telefona:</span>
                  <p className="border-b border-gray-300 pb-1">{report.client.phone}</p>
                </div>
                
                <div>
                  <span className="font-medium">Serijski broj:</span>
                  <p className="border-b border-gray-300 pb-1">{report.appliance.serialNumber || ''}</p>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="border-b border-gray-300 pb-1">{report.client.email || ''}</p>
                </div>
                
                <div>
                  <span className="font-medium">Proizvo a:</span>
                  <p className="border-b border-gray-300 pb-1">{report.appliance.manufacturer}</p>
                </div>
                <div>
                  <span className="font-medium">Ra um:</span>
                  <p className="border-b border-gray-300 pb-1">{report.service.isWarranty ? 'DA' : 'NE'}</p>
                </div>
                
                <div>
                  <span className="font-medium">Zamjenski:</span>
                  <p className="border-b border-gray-300 pb-1"></p>
                </div>
                <div>
                  <span className="font-medium">Garancija:</span>
                  <p className="border-b border-gray-300 pb-1">{report.service.isWarranty ? 'DA' : 'NE'}</p>
                </div>
              </div>
            </div>

            {/* Datumi servisa */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-medium">Po etak:</span>
                <p className="border-b border-gray-300 pb-1 min-w-24">
                  {report.dates.startDate ? formatDate(report.dates.startDate) : formatDate(report.dates.orderDate)}
                </p>
              </div>
              <div>
                <span className="font-medium">Kraj servisa:</span>
                <p className="border-b border-gray-300 pb-1 min-w-24">
                  {report.dates.completionDate ? formatDate(report.dates.completionDate) : ''}
                </p>
              </div>
              <div>
                <span className="font-medium">Kupac obaviješten:</span>
                <p className="border-b border-gray-300 pb-1 min-w-24">
                  {report.dates.customerNotifiedAt ? formatDate(report.dates.customerNotifiedAt) : ''}
                </p>
              </div>
            </div>

            {/* Izvještaj servisera */}
            <div>
              <div className="bg-gray-100 p-2 text-sm font-medium border border-gray-300">
                Izvještaj servisera
              </div>
              <div className="border border-gray-300 border-t-0 p-4 min-h-20">
                <div className="text-sm space-y-2">
                  {report.techReport.initialDiagnosis && (
                    <p><strong>Dijagnoza:</strong> {report.techReport.initialDiagnosis}</p>
                  )}
                  {report.techReport.workPerformed && (
                    <p><strong>Obavljeni rad:</strong> {report.techReport.workPerformed}</p>
                  )}
                  {report.techReport.machineNotes && (
                    <p><strong>Napomene o uređaju:</strong> {report.techReport.machineNotes}</p>
                  )}
                  {report.techReport.finalNotes && (
                    <p><strong>Finalne napomene:</strong> {report.techReport.finalNotes}</p>
                  )}
                  {!report.techReport.initialDiagnosis && !report.techReport.workPerformed && 
                   !report.techReport.machineNotes && !report.techReport.finalNotes && (
                    <p className="text-gray-500 italic">Nema dodatnih napomena od servisera</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabela troškova */}
            <div>
              <table className="w-full border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Usluga</th>
                    <th className="border border-gray-300 p-2 text-center">Garancija</th>
                    <th className="border border-gray-300 p-2 text-center">Kol.</th>
                    <th className="border border-gray-300 p-2 text-center">Rabat(%)</th>
                    <th className="border border-gray-300 p-2 text-center">Osnovica</th>
                    <th className="border border-gray-300 p-2 text-center">Porez(%)</th>
                    <th className="border border-gray-300 p-2 text-center">Iznos poreza</th>
                    <th className="border border-gray-300 p-2 text-center">Iznos</th>
                  </tr>
                </thead>
                <tbody>
                  {report.costs.length > 0 ? (
                    report.costs.map((cost, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2">{cost.description}</td>
                        <td className="border border-gray-300 p-2 text-center">{cost.isWarranty ? 'DA' : 'NE'}</td>
                        <td className="border border-gray-300 p-2 text-center">{cost.quantity.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-center">{cost.discount.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-center">{cost.unitPrice.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-center">21.00</td>
                        <td className="border border-gray-300 p-2 text-center">{(cost.total * 0.21).toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-center">({cost.total.toFixed(2)})</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="border border-gray-300 p-2">Usluga serviranja-servisni sat</td>
                      <td className="border border-gray-300 p-2 text-center">{report.service.isWarranty ? 'DA' : 'NE'}</td>
                      <td className="border border-gray-300 p-2 text-center">1.00</td>
                      <td className="border border-gray-300 p-2 text-center">100.00</td>
                      <td className="border border-gray-300 p-2 text-center">0.00</td>
                      <td className="border border-gray-300 p-2 text-center">21.00</td>
                      <td className="border border-gray-300 p-2 text-center">0.00</td>
                      <td className="border border-gray-300 p-2 text-center">(20.00)</td>
                    </tr>
                  )}
                  <tr className="bg-gray-50 font-medium">
                    <td className="border border-gray-300 p-2" colSpan={4}>Ukupno:</td>
                    <td className="border border-gray-300 p-2 text-center">{report.totals.subtotal.toFixed(2)}</td>
                    <td className="border border-gray-300 p-2 text-center"></td>
                    <td className="border border-gray-300 p-2 text-center">{report.totals.tax.toFixed(2)}</td>
                    <td className="border border-gray-300 p-2 text-center">({report.totals.total.toFixed(2)})</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}