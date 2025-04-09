import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Building, User, Phone, Mail, MapPin } from "lucide-react";
import BusinessLayout from "@/components/layout/business-layout";

// Validaciona šema za promenu lozinke
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Trenutna lozinka je obavezna"),
  newPassword: z.string().min(6, "Nova lozinka mora imati najmanje 6 karaktera"),
  confirmPassword: z.string().min(1, "Potvrda lozinke je obavezna")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Lozinke se ne podudaraju",
  path: ["confirmPassword"],
});

// Validaciona šema za profile podatke
const profileSchema = z.object({
  fullName: z.string().min(1, "Ime i prezime je obavezno"),
  companyName: z.string().min(1, "Naziv kompanije je obavezan"),
  phone: z.string().min(1, "Kontakt telefon je obavezan"),
  address: z.string().min(1, "Adresa je obavezna"),
  city: z.string().min(1, "Grad je obavezan"),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;

export default function BusinessProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Forma za promenu lozinke
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Forma za ažuriranje profila
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      companyName: user?.companyName || "",
      phone: user?.phone || "",
      address: user?.address || "",
      city: user?.city || "",
    },
  });
  
  // Reset profil forme kada se podaci korisnika promene
  useState(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || "",
        companyName: user.companyName || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
      });
    }
  });
  
  // Mutacija za promenu lozinke
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const response = await apiRequest("POST", "/api/user/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Greška pri promeni lozinke");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lozinka uspešno promenjena",
        description: "Vaša lozinka je uspešno ažurirana.",
      });
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri promeni lozinke",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutacija za ažuriranje profila
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Greška pri ažuriranju profila");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil uspešno ažuriran",
        description: "Vaši podaci su uspešno sačuvani.",
      });
      setIsEditingProfile(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri ažuriranju profila",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onPasswordSubmit(values: PasswordFormValues) {
    changePasswordMutation.mutate(values);
  }
  
  function onProfileSubmit(values: ProfileFormValues) {
    updateProfileMutation.mutate(values);
  }
  
  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Moj profil</h2>
          <p className="text-muted-foreground">
            Upravljajte svojim poslovnim nalogom i podacima
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Podaci o profilu */}
          <Card>
            <CardHeader>
              <CardTitle>Podaci o profilu</CardTitle>
              <CardDescription>
                Informacije o vašem poslovnom nalogu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditingProfile ? (
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ime i prezime</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Naziv kompanije</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kontakt telefon</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresa</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grad</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        Otkaži
                      </Button>
                      <Button 
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Ažuriranje..." : "Sačuvaj promene"}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500 w-28">Ime i prezime:</span>
                    <span className="text-sm font-medium">{user?.fullName}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Building className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500 w-28">Kompanija:</span>
                    <span className="text-sm font-medium">{user?.companyName}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500 w-28">Email:</span>
                    <span className="text-sm font-medium">{user?.username}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500 w-28">Telefon:</span>
                    <span className="text-sm font-medium">{user?.phone || "Nije unesen"}</span>
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                    <span className="text-sm text-gray-500 w-28">Adresa:</span>
                    <div className="text-sm font-medium">
                      <div>{user?.address || "Nije unesena"}</div>
                      {user?.city && <div>{user.city}</div>}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      Izmeni profil
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Promena lozinke */}
          <Card>
            <CardHeader>
              <CardTitle>Bezbednost naloga</CardTitle>
              <CardDescription>
                Ažurirajte svoju lozinku za veću bezbednost
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trenutna lozinka</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova lozinka</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Lozinka mora imati najmanje 6 karaktera
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potvrda nove lozinke</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-2"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? "Promena lozinke..." : "Promeni lozinku"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        {/* Informacije o nalogu */}
        <Card>
          <CardHeader>
            <CardTitle>Informacije o nalogu</CardTitle>
            <CardDescription>
              Osnovne informacije o vašem nalogu i ulozi na platformi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Detalji naloga</h4>
                  <Separator />
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-gray-500">ID korisnika:</span>
                    <span className="text-sm">{user?.id}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-gray-500">Uloga:</span>
                    <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                      Poslovni partner
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Status i pristup</h4>
                  <Separator />
                  <div className="flex justify-between py-1">
                    <span className="text-sm text-gray-500">Status naloga:</span>
                    <span className="text-sm font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                      Aktivan
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-medium text-blue-800 mb-1">O poslovnom pristupu</h4>
                <p className="text-sm text-blue-700">
                  Kao poslovni partner, možete kreirati i pratiti servisne zahteve za vaše klijente.
                  Svi kreirani zahtevi biće vidljivi samo vama i našim administratorima.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-sm text-gray-500 border-t pt-4">
            Datum registracije: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('sr-RS') : "Nije dostupno"}
          </CardFooter>
        </Card>
      </div>
    </BusinessLayout>
  );
}