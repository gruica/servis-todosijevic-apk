import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Service {
  id: number;
  clientId: number;
  applianceId: number;
  technicianId: number | null;
  description: string;
  status: 'pending' | 'assigned' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  scheduledDate: string | null;
  completedDate: string | null;
  cost: number | null;
}

interface PaginatedResponse {
  services: Service[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ServicesPaginationTest() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'scheduledDate' | 'completedDate'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse>({
    queryKey: ['services-paginated', page, limit, status, search, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });
      
      if (status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/services/paginated?${params}`);
      if (!response.ok) throw new Error('Greška pri učitavanju servisa');
      return response.json();
    }
  });

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Na čekanju';
      case 'assigned': return 'Dodeljen';
      case 'scheduled': return 'Zakazan';
      case 'in_progress': return 'U toku';
      case 'completed': return 'Završen';
      case 'cancelled': return 'Otkazan';
      default: return status;
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Greška</CardTitle>
            <CardDescription>Došlo je do greške pri učitavanju servisa</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test paginacije servisa</h1>
        <div className="text-sm text-gray-500">
          {data && `Ukupno ${data.total} servisa`}
        </div>
      </div>

      {/* Filteri i kontrole */}
      <Card>
        <CardHeader>
          <CardTitle>Filteri i sortiranje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi statusi</SelectItem>
                  <SelectItem value="pending">Na čekanju</SelectItem>
                  <SelectItem value="assigned">Dodeljen</SelectItem>
                  <SelectItem value="scheduled">Zakazan</SelectItem>
                  <SelectItem value="in_progress">U toku</SelectItem>
                  <SelectItem value="completed">Završen</SelectItem>
                  <SelectItem value="cancelled">Otkazan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pretraživanje</label>
              <Input
                placeholder="Pretraži opise..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sortiranje</label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Datum kreiranja</SelectItem>
                  <SelectItem value="scheduledDate">Zakazano</SelectItem>
                  <SelectItem value="completedDate">Završeno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Redosled</label>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Opadajući</SelectItem>
                  <SelectItem value="asc">Rastući</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Po stranici</label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full">
                Pretraži
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela servisa */}
      <Card>
        <CardHeader>
          <CardTitle>Rezultati</CardTitle>
          <CardDescription>
            {data && (
              <>
                Stranica {data.page} od {data.totalPages} (ukupno {data.total} servisa)
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(limit)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Opis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Kreiran</TableHead>
                    <TableHead>Zakazan</TableHead>
                    <TableHead>Završen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.id}</TableCell>
                      <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(service.status)}>
                          {getStatusLabel(service.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {service.createdAt ? new Date(service.createdAt).toLocaleDateString('sr-RS') : '-'}
                      </TableCell>
                      <TableCell>
                        {service.scheduledDate ? new Date(service.scheduledDate).toLocaleDateString('sr-RS') : '-'}
                      </TableCell>
                      <TableCell>
                        {service.completedDate ? new Date(service.completedDate).toLocaleDateString('sr-RS') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginacija kontrole */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={!data.hasPrev}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Prethodna
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Stranica {page} od {data.totalPages}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!data.hasNext}
                  >
                    Sledeća
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}