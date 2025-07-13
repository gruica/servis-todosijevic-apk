import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Calendar, User, Wrench, Plus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const serviceSchema = z.object({
  applianceId: z.string().min(1, "Odaberite uređaj"),
  description: z.string().min(10, "Opis mora imati najmanje 10 karaktera"),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
  scheduledDate: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export function CustomerServiceCreate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      applianceId: "",
      description: "",
      priority: "normal",
      scheduledDate: "",
    },
  });

  // Fetch user's appliances
  const { data: appliances = [], isLoading: isLoadingAppliances } = useQuery({
    queryKey: ["/api/customer/appliances"],
    queryFn: async () => {
      const response = await fetch("/api/customer/appliances");
      if (!response.ok) {
        throw new Error("Greška pri dobijanju uređaja");
      }
      return response.json();
    },
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      const response = await apiRequest("POST", "/api/customer/services", values);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Servis kreiran",
        description: "Vaš servisni zahtev je uspešno kreiran",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/services"] });
      navigate("/customer");
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri kreiranju servisa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ServiceFormValues) => {
    createServiceMutation.mutate(values);
  };

  if (!user) {
    return <div>Nemate dozvolu za pristup ovoj stranici</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Link href="/customer">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Nazad
                  </Button>
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Novi servisni zahtev</h1>
              <p className="text-gray-600">Kreirajte novi zahtev za servis vašeg uređaja</p>
            </div>

            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Detalji servisa
                </CardTitle>
                <CardDescription>
                  Popunite informacije o servisu koji želite da zahtevate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="applianceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uređaj</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Odaberite uređaj" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {appliances.map((appliance: any) => (
                                <SelectItem key={appliance.id} value={appliance.id.toString()}>
                                  {appliance.category?.name} - {appliance.model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opis problema</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Opišite problem sa uređajem..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioritet</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Odaberite prioritet" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">Normalan</SelectItem>
                              <SelectItem value="high">Visok</SelectItem>
                              <SelectItem value="urgent">Hitno</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Željeni datum (opciono)</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-4">
                      <Button type="button" variant="outline" onClick={() => navigate("/customer")}>
                        Otkaži
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createServiceMutation.isPending}
                      >
                        {createServiceMutation.isPending ? "Kreira se..." : "Kreiraj zahtev"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default CustomerServiceCreate;