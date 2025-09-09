import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield, Trash } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ServiceDeleteConfirmDialogProps {
  serviceId: number;
  serviceName: string;
  onConfirmDelete: (serviceId: number, reason: string) => Promise<void>;
  children: React.ReactNode;
}

export function ServiceDeleteConfirmDialog({ 
  serviceId, 
  serviceName, 
  onConfirmDelete, 
  children 
}: ServiceDeleteConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      setError("Razlog za brisanje je obavezan");
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await onConfirmDelete(serviceId, deleteReason.trim());
      setIsOpen(false);
      setDeleteReason("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Greška pri brisanju servisa");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setDeleteReason("");
    setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Potvrda brisanja servisa
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              <strong>Sigurno brisanje:</strong> Servis će biti sačuvan za moguće vraćanje.
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Servis:</strong> #{serviceId}</p>
            <p><strong>Naziv:</strong> {serviceName}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="delete-reason" className="text-sm font-medium">
              Razlog za brisanje *
            </Label>
            <Textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Unesite razlog zbog kojeg brišete ovaj servis..."
              className="min-h-[80px] resize-none"
              disabled={isDeleting}
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Otkaži
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting || !deleteReason.trim()}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Brišem...
              </>
            ) : (
              <>
                <Trash className="w-4 h-4 mr-2" />
                Potvrdi brisanje
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ServiceDeleteConfirmDialog;