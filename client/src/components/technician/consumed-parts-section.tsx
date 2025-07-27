import React, { useState } from 'react';
import { Camera, Package, Plus, Trash2, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import ConsumedPartsCamera from '../camera/consumed-parts-camera';

interface ConsumedPartsSection {
  serviceId: number;
  technicianId: number;
}

interface ConsumedPart {
  id: number;
  serviceId: number;
  technicianId: number;
  partNumber: string;
  partName: string;
  manufacturer?: string;
  quantity: number;
  unitCost?: string;
  totalCost?: string;
  supplierName?: string;
  warrantyPeriod?: string;
  installationNotes?: string;
  consumedDate: string;
  scannedFromLabel: boolean;
  ocrConfidence?: number;
  verifiedByTechnician: boolean;
  associatedCatalogPartId?: number;
  notes?: string;
}

export default function ConsumedPartsSection({ serviceId, technicianId }: ConsumedPartsSection) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dohvatanje potrošenih delova za servis
  const { data: consumedParts = [], isLoading } = useQuery({
    queryKey: ['consumed-parts', serviceId],
    queryFn: async () => {
      const response = await fetch(`/api/services/${serviceId}/consumed-parts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch consumed parts');
      }
      
      return response.json() as Promise<ConsumedPart[]>;
    }
  });

  // Mutation za verifikaciju dela
  const verifyPartMutation = useMutation({
    mutationFn: async (partId: number) => {
      const response = await fetch(`/api/consumed-parts/${partId}/verify`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify part');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumed-parts', serviceId] });
      toast({
        title: "Deo verifikovan",
        description: "Potrošeni deo je uspešno verifikovan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Nije moguće verifikovati deo",
        variant: "destructive",
      });
    }
  });

  // Mutation za brisanje dela (admin only)
  const deletePartMutation = useMutation({
    mutationFn: async (partId: number) => {
      const response = await fetch(`/api/consumed-parts/${partId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete part');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumed-parts', serviceId] });
      toast({
        title: "Deo obrisan",
        description: "Potrošeni deo je uspešno obrisan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Nije moguće obrisati deo",
        variant: "destructive",
      });
    }
  });

  const handlePartScanned = (partData: ConsumedPart) => {
    // Osvežavanje liste potrošenih delova
    queryClient.invalidateQueries({ queryKey: ['consumed-parts', serviceId] });
    
    toast({
      title: "Novi deo dodat!",
      description: `${partData.partName} je uspešno evidiran`,
    });
  };

  const handleVerifyPart = (partId: number) => {
    verifyPartMutation.mutate(partId);
  };

  const handleDeletePart = (partId: number) => {
    if (confirm('Da li ste sigurni da želite da obrišete ovaj potrošeni deo?')) {
      deletePartMutation.mutate(partId);
    }
  };

  const formatCurrency = (amount?: string) => {
    if (!amount) return '';
    const num = parseFloat(amount);
    return `${num.toFixed(2)} EUR`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Potrošeni delovi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Učitavanje...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Potrošeni delovi ({consumedParts.length})
          </CardTitle>
          <CardDescription>
            Evidencija rezervnih delova korišćenih tokom servisa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dugmad za akcije */}
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCameraOpen(true)}
              className="flex items-center gap-2"
              variant="default"
            >
              <Camera className="h-4 w-4" />
              OCR Kamera
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Manuelni unos
            </Button>
          </div>

          {/* Lista potrošenih delova */}
          {consumedParts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Još nema evidenciranih potrošenih delova</p>
              <p className="text-sm">Koristite OCR kameru za brzu evidenciju</p>
            </div>
          ) : (
            <div className="space-y-3">
              {consumedParts.map((part) => (
                <div
                  key={part.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Glavni red sa osnovnim podacima */}
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="font-medium text-lg">{part.partNumber}</span>
                          {part.scannedFromLabel && (
                            <Badge variant="secondary" className="ml-2">
                              <Camera className="h-3 w-3 mr-1" />
                              OCR
                            </Badge>
                          )}
                          {part.verifiedByTechnician && (
                            <Badge variant="default" className="ml-1">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verifikovano
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Naziv i proizvođač */}
                      <div>
                        <p className="font-medium text-gray-900">{part.partName}</p>
                        {part.manufacturer && (
                          <p className="text-sm text-gray-600">{part.manufacturer}</p>
                        )}
                      </div>

                      {/* Količina i cena */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Količina: {part.quantity}
                        </span>
                        
                        {part.unitCost && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            {formatCurrency(part.unitCost)} / kom
                          </span>
                        )}
                        
                        {part.totalCost && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                            Ukupno: {formatCurrency(part.totalCost)}
                          </span>
                        )}
                      </div>

                      {/* Dobavljač i datum */}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {part.supplierName && (
                          <span>Dobavljač: {part.supplierName}</span>
                        )}
                        <span>Potrošeno: {formatDate(part.consumedDate)}</span>
                      </div>

                      {/* OCR pouzdanost */}
                      {part.ocrConfidence && part.ocrConfidence > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800">
                            OCR pouzdanost: {part.ocrConfidence}%
                          </span>
                        </div>
                      )}

                      {/* Napomene */}
                      {part.installationNotes && (
                        <div className="text-sm bg-blue-50 p-2 rounded">
                          <strong>Ugradnja:</strong> {part.installationNotes}
                        </div>
                      )}

                      {part.notes && (
                        <div className="text-sm bg-gray-50 p-2 rounded">
                          <strong>Napomene:</strong> {part.notes}
                        </div>
                      )}
                    </div>

                    {/* Akcije */}
                    <div className="flex flex-col gap-2 ml-4">
                      {!part.verifiedByTechnician && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerifyPart(part.id)}
                          disabled={verifyPartMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Verifikuj
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Detalji
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ukupna statistika */}
          {consumedParts.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {consumedParts.length}
                  </div>
                  <div className="text-sm text-gray-600">Ukupno delova</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {consumedParts.reduce((sum, part) => sum + part.quantity, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Ukupna količina</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold text-purple-600">
                    {formatCurrency(
                      consumedParts
                        .filter(part => part.totalCost)
                        .reduce((sum, part) => sum + parseFloat(part.totalCost!), 0)
                        .toString()
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Ukupna vrednost</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR Kamera Dialog */}
      <ConsumedPartsCamera
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        serviceId={serviceId}
        technicianId={technicianId}
        onPartScanned={handlePartScanned}
      />
    </>
  );
}