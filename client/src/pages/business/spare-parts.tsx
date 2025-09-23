import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import BusinessLayout from "@/components/layout/business-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Package, Eye, Calendar, User, Phone, Settings, CheckCircle, Clock, AlertCircle } from "lucide-react";

// Interface za rezervne delove
interface ApprovedSparePart {
  id: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  description?: string;
  supplierName?: string;
  unitCost?: string;
  location?: string;
  warrantyStatus: string;
  addedDate: string;
  serviceId?: number;
  clientName?: string;
  clientPhone?: string;
  applianceInfo?: string;
  serviceDescription?: string;
  status: string;
}

// Funkcija za prevod statusa
function translateWarrantyStatus(status: string) {
  const statusMap: Record<string, string> = {
    'u_garanciji': 'U garanciji',
    'van_garancije': 'Van garancije', 
    'under_warranty': 'U garanciji',
    'out_of_warranty': 'Van garancije'
  };
  return statusMap[status] || status;
}

// Funkcija za prevod lokacije
function translateLocation(location: string) {
  if (!location) return 'Magacin';
  return location;
}

export default function BusinessSpareParts() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // Dohvatanje odobrenih rezervnih dijelova
  const { data: approvedParts = [], isLoading } = useQuery<ApprovedSparePart[]>({
    queryKey: ["/api/business/approved-spare-parts"],
    queryFn: async () => {
      const response = await fetch("/api/business/approved-spare-parts", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch approved spare parts");
      }
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 sekundi cache
    refetchOnWindowFocus: false,
  });

  // Brojanje delova po statusima
  const totalParts = approvedParts.length;
  const inWarrantyParts = approvedParts.filter(part => 
    part.warrantyStatus === 'u_garanciji' || part.warrantyStatus === 'under_warranty'
  ).length;
  const outOfWarrantyParts = totalParts - inWarrantyParts;

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Učitavanje rezervnih dijelova...</p>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/business/complus")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nazad na Com Plus
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              Odobreni rezervni delovi
            </h2>
            <p className="text-muted-foreground">
              Rezervni delovi koje je administrator odobrio za poručivanje
            </p>
          </div>
        </div>

        {/* Statistike */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-blue-900">Ukupno delova</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{totalParts}</div>
              <p className="text-xs text-blue-700">Odobreni za poručivanje</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-green-900">U garanciji</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{inWarrantyParts}</div>
              <p className="text-xs text-green-700">Pokriveni garancijom</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-orange-900">Van garancije</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{outOfWarrantyParts}</div>
              <p className="text-xs text-orange-700">Naplaćuju se</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista odobrenih delova */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Odobreni rezervni delovi
            </CardTitle>
            <CardDescription>
              Lista rezervnih dijelova koje je administrator odobrio za poručivanje
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalParts === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nema odobrenih rezervnih dijelova
                </h3>
                <p className="text-gray-600 max-w-md">
                  Trenutno nema rezervnih dijelova koje je administrator odobrio za vaše Com Plus servise.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedParts.map((part) => (
                  <div 
                    key={part.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg text-gray-900">
                            {part.partName}
                          </h4>
                          <Badge 
                            variant={
                              part.warrantyStatus === 'u_garanciji' || part.warrantyStatus === 'under_warranty' 
                                ? "default" 
                                : "secondary"
                            }
                            className={
                              part.warrantyStatus === 'u_garanciji' || part.warrantyStatus === 'under_warranty'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-orange-100 text-orange-800 border-orange-200'
                            }
                          >
                            {translateWarrantyStatus(part.warrantyStatus)}
                          </Badge>
                        </div>
                        
                        {part.partNumber && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Kataloški broj:</strong> {part.partNumber}
                          </p>
                        )}
                        
                        {part.description && (
                          <p className="text-gray-700 mb-3">{part.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            <span><strong>Količina:</strong> {part.quantity}</span>
                          </div>
                          
                          {part.supplierName && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span><strong>Dobavljač:</strong> {part.supplierName}</span>
                            </div>
                          )}
                          
                          {part.unitCost && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-green-600">
                                Cena: {part.unitCost}€
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span><strong>Odobren:</strong> {new Date(part.addedDate).toLocaleDateString('sr-RS')}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-gray-500" />
                            <span><strong>Lokacija:</strong> {translateLocation(part.location || '')}</span>
                          </div>
                        </div>
                        
                        {/* Informacije o servisu */}
                        {(part.clientName || part.serviceDescription) && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <h5 className="font-medium text-blue-900 mb-2">Informacije o servisu:</h5>
                            <div className="text-sm space-y-1">
                              {part.clientName && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-blue-600" />
                                  <span><strong>Klijent:</strong> {part.clientName}</span>
                                  {part.clientPhone && (
                                    <>
                                      <Phone className="h-4 w-4 text-blue-600 ml-4" />
                                      <span>{part.clientPhone}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              
                              {part.applianceInfo && (
                                <p><strong>Uređaj:</strong> {part.applianceInfo}</p>
                              )}
                              
                              {part.serviceDescription && (
                                <p><strong>Opis servisa:</strong> {part.serviceDescription}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Informacijska napomena */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Eye className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  Informativna stranica
                </h4>
                <p className="text-blue-800 text-sm">
                  Ova stranica prikazuje rezervne delove koje je administrator odobrio za poručivanje. 
                  Delovi se automatski dodaju kada administrator odobri vaše zahteve za Com Plus brendove.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </BusinessLayout>
  );
}