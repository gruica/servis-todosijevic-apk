import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, Clipboard, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function TechnicianProfile() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  // Fetch technician's profile
  const { data: technician, isLoading } = useQuery({
    queryKey: ["/api/technician-profile"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/technician-profile", { signal });
      if (!response.ok) {
        throw new Error("Greška pri dobijanju profila");
      }
      return response.json();
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Odjava uspješna",
          description: "Uspješno ste se odjavili.",
        });
      },
      onError: (error) => {
        toast({
          title: "Greška pri odjavi",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Profil servisera</h1>
        <p className="text-gray-500">Vaše informacije i podaci</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lični podaci</CardTitle>
            <CardDescription>Vaše lične informacije</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{technician?.fullName}</p>
                <p className="text-sm text-gray-500">Serviser</p>
              </div>
            </div>

            {technician?.phone && (
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefon</p>
                  <p>{technician.phone}</p>
                </div>
              </div>
            )}

            {technician?.email && (
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p>{technician.email}</p>
                </div>
              </div>
            )}

            {technician?.specialization && (
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Clipboard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Specijalizacija</p>
                  <p>{technician.specialization}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 md:flex-row">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/tech">
              <Clipboard className="mr-2 h-4 w-4" />
              Moji servisi
            </Link>
          </Button>
          
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Odjavi se
          </Button>
        </div>
      </div>
    </div>
  );
}