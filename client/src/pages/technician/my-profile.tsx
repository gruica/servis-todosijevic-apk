import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Wrench, 
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Lock,
  ArrowLeft,
  Star
} from "lucide-react";
import { Link } from "wouter";

interface Technician {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  specialization: string;
  experience_years: number;
  certification_level: string;
  is_active: boolean;
}

interface TechnicianStats {
  total_services: number;
  completed_services: number;
  pending_services: number;
  this_month_completed: number;
  average_completion_days: number;
  customer_rating: number;
}

export default function TechnicianMyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [stats, setStats] = useState<TechnicianStats | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user?.technicianId) {
      fetchTechnicianData();
      fetchTechnicianStats();
    }
  }, [user]);

  const fetchTechnicianData = async () => {
    try {
      const response = await fetch(`/api/technicians/${user?.technicianId}`);
      if (response.ok) {
        const data = await response.json();
        setTechnician(data);
      }
    } catch (error) {
      console.error("Greška pri učitavanju podataka:", error);
    }
  };

  const fetchTechnicianStats = async () => {
    try {
      const response = await fetch(`/api/technicians/${user?.technicianId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Greška pri učitavanju statistika:", error);
    }
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("/api/change-password", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lozinka promenjena",
        description: "Vaša lozinka je uspešno promenjena"
      });
      setIsChangingPassword(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri promeni lozinke",
        variant: "destructive"
      });
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Greška",
        description: "Nova lozinka i potvrda se ne poklapaju",
        variant: "destructive"
      });
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Greška", 
        description: "Nova lozinka mora imati najmanje 6 karaktera",
        variant: "destructive"
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  if (!technician) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Učitavam profil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/tech">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Moj profil</h1>
            <p className="text-gray-600">Pregled podataka i statistika</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Osnovne informacije */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Osnovne informacije
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Ime i prezime</p>
                      <p className="font-medium">{technician.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      <p className="font-medium">{technician.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{technician.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Adresa</p>
                      <p className="font-medium">{technician.address}</p>
                      <p className="text-sm text-gray-500">{technician.city}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Specijalizacija</p>
                      <Badge variant="secondary">{technician.specialization}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Iskustvo</p>
                      <p className="font-medium">{technician.experience_years} godina</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistike rada */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Statistike rada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{stats.completed_services}</p>
                    <p className="text-sm text-gray-600">Završeno ukupno</p>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-600">{stats.this_month_completed}</p>
                    <p className="text-sm text-gray-600">Ovaj mesec</p>
                  </div>
                  
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending_services}</p>
                    <p className="text-sm text-gray-600">U toku</p>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Star className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-purple-600">{stats.customer_rating.toFixed(1)}</p>
                    <p className="text-sm text-gray-600">Ocena</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">Prosečno vreme završetka</p>
                  <p className="text-lg font-semibold">{stats.average_completion_days} dana</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Promena lozinke */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                Bezbednost
              </CardTitle>
              <CardDescription>
                Promenite lozinku za pristup aplikaciji
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isChangingPassword ? (
                <Button 
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full"
                >
                  Promeni lozinku
                </Button>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Trenutna lozinka</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="newPassword">Nova lozinka</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Potvrdi novu lozinku</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={changePasswordMutation.isPending}
                      className="flex-1"
                    >
                      {changePasswordMutation.isPending ? "Menjam..." : "Sačuvaj"}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                      }}
                      className="flex-1"
                    >
                      Otkaži
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}