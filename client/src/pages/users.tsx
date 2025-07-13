import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Pencil, 
  Trash, 
  UserPlus, 
  AlertCircle,
  Check,
  X,
  LucideIcon,
  Search
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

// Define user roles for dropdown
const userRoles = [
  { value: "admin", label: "Administrator" },
  { value: "technician", label: "Serviser" }
];

// Define the form schema for user creation/editing
const userFormSchema = z.object({
  id: z.number().optional(),
  username: z.string().email({ message: "Unesite validnu email adresu" }),
  password: z.string().min(6, { message: "Lozinka mora imati najmanje 6 karaktera" }).optional(),
  fullName: z.string().min(2, { message: "Ime mora imati najmanje 2 karaktera" }),
  role: z.enum(["admin", "technician"], { 
    required_error: "Uloga je obavezna"
  }),
  technicianId: z.number().nullable().optional()
}).refine((data) => {
  // Password is required when creating a new user (no id)
  return data.id !== undefined || (data.password !== undefined && data.password.length >= 6);
}, {
  message: "Lozinka je obavezna za nove korisnike",
  path: ["password"]
});

type UserFormValues = z.infer<typeof userFormSchema>;

// User interface matching backend model
interface User {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "technician";
  technicianId: number | null;
}

// Technician interface for dropdown
interface Technician {
  id: number;
  fullName: string;
  specialization: string | null;
}

export default function Users() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Get all users
  const { data: users = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/users", { signal });
      if (!response.ok) {
        throw new Error("Greška pri dobijanju korisnika");
      }
      return response.json();
    },
  });

  // Get technicians for dropdown (needed when creating technician users)
  const { data: technicians = [], isLoading: isLoadingTechnicians } = useQuery({
    queryKey: ["/api/technicians"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/technicians", { signal });
      if (!response.ok) {
        throw new Error("Greška pri dobijanju servisera");
      }
      return response.json();
    },
  });

  // Form setup
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "admin",
      technicianId: null
    },
  });

  // Watch role field to conditionally show technician dropdown
  const watchRole = form.watch("role");

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      // Remove id when creating a new user
      const { id, ...createData } = data;
      const res = await apiRequest("POST", "/api/users", createData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Korisnik kreiran",
        description: "Korisnički nalog je uspješno kreiran.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      closeForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri kreiranju korisnika",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      if (!data.id) throw new Error("ID korisnika je obavezan za ažuriranje");
      
      // If password is empty, remove it from update data (don't change password)
      let updateData = { ...data };
      if (!updateData.password || updateData.password.trim() === "") {
        const { password, ...rest } = updateData;
        updateData = rest;
      } else {
        // Make sure password is defined as expected by server
        updateData.password = updateData.password || "";
      }
      
      const res = await apiRequest("PUT", `/api/users/${data.id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Korisnik ažuriran",
        description: "Korisnički nalog je uspješno ažuriran.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      closeForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri ažuriranju korisnika",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return res.ok;
    },
    onSuccess: () => {
      toast({
        title: "Korisnik izbrisan",
        description: "Korisnički nalog je uspješno izbrisan.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška pri brisanju korisnika",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(data: UserFormValues) {
    if (editingUser) {
      updateUserMutation.mutate(data);
    } else {
      createUserMutation.mutate(data);
    }
  }

  // Open form in edit mode
  function handleEditUser(user: User) {
    setEditingUser(user);
    form.reset({
      id: user.id,
      username: user.username,
      password: "", // Leave password empty when editing
      fullName: user.fullName,
      role: user.role,
      technicianId: user.technicianId
    });
    setIsFormOpen(true);
  }

  // Open form in create mode
  function handleCreateUser() {
    setEditingUser(null);
    form.reset({
      username: "",
      password: "",
      fullName: "",
      role: "admin",
      technicianId: null
    });
    setIsFormOpen(true);
  }

  // Close form and reset state
  function closeForm() {
    setIsFormOpen(false);
    setEditingUser(null);
    form.reset();
  }

  // Filtered users based on search term
  const filteredUsers = users.filter((user: User) => 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if current user has permission to access this page
  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Pristup odbijen</CardTitle>
            <CardDescription>
              Nemate dozvolu za pristup ovoj stranici.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/">Natrag na početnu</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Upravljanje korisnicima</h1>
        <Button onClick={handleCreateUser} className="flex items-center gap-2">
          <UserPlus size={16} />
          <span>Dodaj korisnika</span>
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Input
          type="search"
          placeholder="Pretraga"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ime i prezime</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Uloga</TableHead>
                <TableHead>Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <div className="flex justify-center py-4">
                      <div className="animate-spin h-6 w-6 border-t-2 border-b-2 border-primary rounded-full"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    {searchTerm ? "Nema rezultata za vašu pretragu" : "Nema korisnika za prikaz"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? "Administrator" : "Serviser"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil size={16} />
                        </Button>
                        
                        {/* Delete confirmation dialog */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="text-red-500 hover:text-red-700">
                              <Trash size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Potvrdite brisanje</AlertDialogTitle>
                              <AlertDialogDescription>
                                Da li ste sigurni da želite da izbrišete korisnika{" "}
                                <strong>{user.fullName}</strong>? Ova akcija ne može biti poništena.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Odustani</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                className="bg-red-500 hover:bg-red-700 text-white"
                              >
                                Izbriši
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User form dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Izmeni korisnika" : "Dodaj novog korisnika"}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "Unesite nove informacije za ovog korisnika. Ostavite polje za lozinku prazno ako ne želite da je promenite."
                : "Popunite obrazac da kreirate novog korisnika."
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ime i prezime</FormLabel>
                    <FormControl>
                      <Input placeholder="Ime i prezime korisnika" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email adresa</FormLabel>
                    <FormControl>
                      <Input placeholder="ime.prezime@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingUser ? "Nova lozinka (opciono)" : "Lozinka"}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={editingUser ? "Ostavi prazno da zadržiš postojeću" : "Lozinka"} 
                        {...field} 
                        required={!editingUser}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uloga</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite ulogu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditionally show technician selection if role is technician */}
              {watchRole === "technician" && (
                <FormField
                  control={form.control}
                  name="technicianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviser</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || ""}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite servisera" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians.map((technician: Technician) => (
                            <SelectItem key={technician.id} value={technician.id.toString()}>
                              {technician.fullName} 
                              {technician.specialization && ` (${technician.specialization})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Odustani
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-background rounded-full"></div>
                      Učitavanje...
                    </>
                  ) : (
                    editingUser ? "Sačuvaj izmene" : "Kreiraj korisnika"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

