import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  Package, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';

interface EnhancedDashboardProps {
  stats: any;
  isLoading: boolean;
  enrichedApplianceStats: any[];
  getUserInitials: (name: string) => string;
  handleClientDetails: (id: number) => void;
}

export function EnhancedDashboard({ 
  stats, 
  isLoading, 
  enrichedApplianceStats, 
  getUserInitials, 
  handleClientDetails 
}: EnhancedDashboardProps) {
  const [, setLocation] = useLocation();

  const kpiCards = [
    {
      title: "Ukupno servisa",
      value: stats?.totalServices || 0,
      icon: Wrench,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      textColor: "text-blue-600"
    },
    {
      title: "Aktivni servisi", 
      value: stats?.activeCount || 0,
      icon: Activity,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "from-yellow-50 to-yellow-100", 
      textColor: "text-yellow-600"
    },
    {
      title: "Završeni servisi",
      value: stats?.completedCount || 0,
      icon: CheckCircle,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      textColor: "text-green-600"
    },
    {
      title: "Na čekanju",
      value: stats?.pendingCount || 0,
      icon: Clock,
      color: "from-orange-500 to-orange-600", 
      bgColor: "from-orange-50 to-orange-100",
      textColor: "text-orange-600"
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <Card key={index} className={`relative overflow-hidden bg-gradient-to-br ${card.bgColor} border-0 shadow-lg hover:shadow-xl transition-all duration-300`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${card.textColor} opacity-80`}>
                      {card.title}
                    </p>
                    <p className={`text-3xl font-bold ${card.textColor} mt-2`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className={`absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br ${card.color} rounded-full opacity-10`}></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-800">Brze akcije</CardTitle>
                <p className="text-sm text-gray-600">Najčešće korišćene funkcije</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              onClick={() => setLocation('/admin/services/new')}
              className="h-auto p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 flex flex-col space-y-2"
            >
              <Wrench className="w-6 h-6" />
              <span className="text-sm font-medium">Novi servis</span>
            </Button>
            
            <Button 
              onClick={() => setLocation('/clients/new')}
              variant="outline"
              className="h-auto p-4 border-green-200 text-green-600 hover:bg-green-50 flex flex-col space-y-2"
            >
              <Users className="w-6 h-6" />
              <span className="text-sm font-medium">Novi klijent</span>
            </Button>
            
            <Button 
              onClick={() => setLocation('/admin/spare-parts')}
              variant="outline" 
              className="h-auto p-4 border-orange-200 text-orange-600 hover:bg-orange-50 flex flex-col space-y-2"
            >
              <Package className="w-6 h-6" />
              <span className="text-sm font-medium">Rezervni delovi</span>
            </Button>
            
            <Button 
              onClick={() => setLocation('/admin/analytics')}
              variant="outline"
              className="h-auto p-4 border-purple-200 text-purple-600 hover:bg-purple-50 flex flex-col space-y-2"
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm font-medium">Analitika</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800">Nedavni klijenti</CardTitle>
                  <p className="text-sm text-gray-600">Poslednji registrovani klijenti</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="border-green-200 text-green-600 hover:bg-green-50"
                onClick={() => setLocation('/clients')}
              >
                <Users className="w-4 h-4 mr-2" />
                Svi klijenti
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {(!stats?.recentClients || stats.recentClients.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <div className="flex flex-col items-center space-y-2">
                  <Users className="w-8 h-8 text-gray-300" />
                  <span>Nema klijenata za prikaz</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentClients.map((client: any) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center shadow-sm">
                        <span className="text-xs font-medium">{getUserInitials(client.fullName)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">{client.fullName}</span>
                        <p className="text-sm text-gray-500">{client.phone}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-50"
                      onClick={() => handleClientDetails(client.id)}
                    >
                      →
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appliance Stats */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800">Najčešći uređaji</CardTitle>
                  <p className="text-sm text-gray-600">Statistike po kategorijama</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {enrichedApplianceStats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="flex flex-col items-center space-y-2">
                  <Package className="w-8 h-8 text-gray-300" />
                  <span>Nema podataka o uređajima</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {enrichedApplianceStats.map((stat: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="font-medium text-gray-800">{stat.categoryName}</span>
                    </div>
                    <span className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                      {stat.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}