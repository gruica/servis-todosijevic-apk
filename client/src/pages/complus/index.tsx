import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, 
  Users, 
  Settings, 
  Package, 
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

// Com Plus brendovi
const COM_PLUS_BRANDS = ["Electrolux", "Elica", "Candy", "Hoover", "Turbo Air"];

interface Service {
  id: number;
  clientName: string;
  clientPhone: string;
  clientCity: string;
  categoryName: string;
  manufacturerName: string;
  model: string;
  serialNumber: string;
  description: string;
  status: string;
  warrantyStatus: string;
  technicianName: string;
  createdAt: string;
  scheduledDate: string;
  completedDate: string;
  cost: number;
}

export default function ComplusDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [warrantyFilter, setWarrantyFilter] = useState("all");

  // Query za Com Plus servise
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/complus/services", statusFilter, brandFilter, warrantyFilter],
  });

  // Query za Com Plus statistike
  const { data: stats = {} } = useQuery<{
    total: number;
    active: number;
    completedThisMonth: number;
    warranty: number;
  }>({
    queryKey: ["/api/complus/stats"],
  });

  // Filtriranje servisa
  const filteredServices = services.filter((service: Service) => {
    const matchesSearch = 
      service.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.clientPhone.includes(searchTerm) ||
      service.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || service.status === statusFilter;
    const matchesBrand = brandFilter === "all" || service.manufacturerName === brandFilter;
    const matchesWarranty = warrantyFilter === "all" || service.warrantyStatus === warrantyFilter;
    
    return matchesSearch && matchesStatus && matchesBrand && matchesWarranty;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "assigned": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Završen";
      case "in_progress": return "U toku";
      case "assigned": return "Dodeljen";
      case "pending": return "Na čekanju";
      case "cancelled": return "Otkazan";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Com Plus Administrativni Panel</h1>
              <p className="text-gray-600">Upravljanje servisima za Electrolux, Elica, Candy, Hoover, Turbo Air</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Izvoz CSV
              </Button>
              <Button className="flex items-center bg-blue-600 hover:bg-blue-700">
                <Package className="w-4 h-4 mr-2" />
                Novi servis
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Statistike */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno servisa</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Com Plus brendovi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktivni servisi</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.active || 0}</div>
              <p className="text-xs text-muted-foreground">U toku i dodeljeni</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Završeni ovaj mesec</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">Tekući mesec</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Garancijski servisi</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.warranty || 0}</div>
              <p className="text-xs text-muted-foreground">U garanciji</p>
            </CardContent>
          </Card>
        </div>

        {/* Filteri */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filteri i pretraga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pretraži klijente, telefon, model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi statusi</SelectItem>
                  <SelectItem value="pending">Na čekanju</SelectItem>
                  <SelectItem value="assigned">Dodeljen</SelectItem>
                  <SelectItem value="in_progress">U toku</SelectItem>
                  <SelectItem value="completed">Završen</SelectItem>
                  <SelectItem value="cancelled">Otkazan</SelectItem>
                </SelectContent>
              </Select>

              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Brend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi brendovi</SelectItem>
                  {COM_PLUS_BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={warrantyFilter} onValueChange={setWarrantyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Garancija" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sve garancije</SelectItem>
                  <SelectItem value="u garanciji">U garanciji</SelectItem>
                  <SelectItem value="van garancije">Van garancije</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setBrandFilter("all");
                setWarrantyFilter("all");
              }}>
                Resetuj filtere
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista servisa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Com Plus servisi ({filteredServices.length})</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{brandFilter === "all" ? "Svi brendovi" : brandFilter}</Badge>
                <Badge variant="outline">{statusFilter === "all" ? "Svi statusi" : getStatusText(statusFilter)}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Učitavanje Com Plus servisa...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nema Com Plus servisa koji odgovaraju filterima</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">ID</th>
                      <th className="text-left py-3 px-4">Klijent</th>
                      <th className="text-left py-3 px-4">Telefon</th>
                      <th className="text-left py-3 px-4">Grad</th>
                      <th className="text-left py-3 px-4">Brend</th>
                      <th className="text-left py-3 px-4">Model</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Garancija</th>
                      <th className="text-left py-3 px-4">Serviser</th>
                      <th className="text-left py-3 px-4">Cena</th>
                      <th className="text-left py-3 px-4">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((service: Service) => (
                      <tr key={service.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">#{service.id}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{service.clientName}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{service.clientPhone}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{service.clientCity}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {service.manufacturerName}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="font-medium">{service.model}</div>
                          <div className="text-gray-500 text-xs">{service.serialNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(service.status)}>
                            {getStatusText(service.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={service.warrantyStatus === "u garanciji" ? "default" : "secondary"}>
                            {service.warrantyStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {service.technicianName || "Nedodeljen"}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {service.cost ? `${service.cost}€` : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <Button size="sm" variant="ghost" className="p-1">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="p-1">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="p-1 text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}