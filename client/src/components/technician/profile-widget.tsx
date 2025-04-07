import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Lock, User, CheckCircle2, Settings } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { AuthHelper } from "@/auth-helper";

// Šema za validaciju promjene šifre
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Trenutna šifra je obavezna"),
  newPassword: z.string().min(6, "Nova šifra mora imati najmanje 6 karaktera"),
  confirmPassword: z.string().min(1, "Potvrda šifre je obavezna")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Šifre se ne podudaraju",
  path: ["confirmPassword"]
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function TechnicianProfileWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });
  
  async function onSubmit(data: ChangePasswordFormValues) {
    try {
      setSuccess(false);
      await AuthHelper.changePassword(data.currentPassword, data.newPassword);
      
      toast({
        title: "Šifra promijenjena",
        description: "Vaša šifra je uspješno promijenjena"
      });
      
      setSuccess(true);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Greška pri promjeni šifre",
        variant: "destructive"
      });
    }
  }
  
  if (!user) return null;
  
  // Generiši inicijale korisnika
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0]?.toUpperCase() || '')
      .join('');
  };
  
  return (
    <div className="flex items-center">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
              <span className="font-medium text-sm">
                {getInitials(user.fullName)}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-gray-500">{user.username}</p>
            </div>
            <Settings className="h-4 w-4 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <User className="mr-2 h-5 w-5" />
                Moj profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Korisničko ime:</p>
                <p className="text-sm">{user.username}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Ime i prezime:</p>
                <p className="text-sm">{user.fullName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Uloga:</p>
                <p className="text-sm">{user.role === "technician" ? "Serviser" : "Administrator"}</p>
              </div>
              
              <div className="pt-2">
                <div className="flex items-center mb-2">
                  <Lock className="mr-2 h-4 w-4" />
                  <h3 className="text-sm font-medium">Promjena šifre</h3>
                </div>
                
                {success ? (
                  <div className="text-center py-3">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Šifra uspješno promijenjena!</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setSuccess(false)}
                    >
                      Promijeni ponovo
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Trenutna šifra</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Unesite trenutnu šifru" 
                                className="h-8 text-sm" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Nova šifra</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Unesite novu šifru" 
                                className="h-8 text-sm" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Potvrda nove šifre</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Potvrdite novu šifru" 
                                className="h-8 text-sm" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" size="sm" className="w-full">
                        Promijeni šifru
                      </Button>
                    </form>
                  </Form>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-3 flex justify-between">
              <Link href="/tech/profile">
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Kompletan profil
                </Button>
              </Link>
              <Link href="/tech">
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Moji servisi
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}