import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { insertClientSchema, type InsertClient, type Client } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, User, Phone, Mail, MapPin, Building } from "lucide-react";

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: (client: Client) => void;
  title?: string;
}

export function CreateClientDialog({ 
  open, 
  onOpenChange, 
  onClientCreated,
  title = "Kreiraj novog klijenta"
}: CreateClientDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      companyName: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      // Koristimo business partner API endpoint ako je korisnik business partner
      const endpoint = user?.role === "business_partner" ? "/api/business/clients" : "/api/clients";
      const response = await apiRequest("POST", endpoint, data);
      return response.json();
    },
    onSuccess: (newClient: Client) => {
      // Invalidate oba endpoint-a za sigurnost
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business/clients"] });
      toast({
        title: "Uspeh",
        description: "Klijent je uspešno kreiran",
      });
      
      if (onClientCreated) {
        onClientCreated(newClient);
      }
      
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri kreiranju klijenta",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertClient) => {
    createClientMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Ime i prezime *
              </Label>
              <Input
                id="fullName"
                placeholder="Unesite ime i prezime"
                {...form.register("fullName")}
                className={form.formState.errors.fullName ? "border-red-500" : ""}
              />
              {form.formState.errors.fullName && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefon *
              </Label>
              <Input
                id="phone"
                placeholder="Unesite broj telefona"
                {...form.register("phone")}
                className={form.formState.errors.phone ? "border-red-500" : ""}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Unesite email adresu"
                {...form.register("email")}
                className={form.formState.errors.email ? "border-red-500" : ""}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Grad
              </Label>
              <Input
                id="city"
                placeholder="Unesite grad"
                {...form.register("city")}
                className={form.formState.errors.city ? "border-red-500" : ""}
              />
              {form.formState.errors.city && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Adresa
              </Label>
              <Input
                id="address"
                placeholder="Unesite adresu"
                {...form.register("address")}
                className={form.formState.errors.address ? "border-red-500" : ""}
              />
              {form.formState.errors.address && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Naziv firme
              </Label>
              <Input
                id="companyName"
                placeholder="Unesite naziv firme (opciono)"
                {...form.register("companyName")}
                className={form.formState.errors.companyName ? "border-red-500" : ""}
              />
              {form.formState.errors.companyName && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.companyName.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createClientMutation.isPending}
            >
              Otkaži
            </Button>
            <Button 
              type="submit" 
              disabled={createClientMutation.isPending}
              className="min-w-[100px]"
            >
              {createClientMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Kreiranje...
                </>
              ) : (
                "Kreiraj"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}