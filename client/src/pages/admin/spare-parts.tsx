import { AdminLayout } from "@/components/layout/admin-layout";
import { SparePartsManagement } from "@/components/admin/SparePartsManagement";
import SparePartsOrders from "@/components/admin/SparePartsOrders";
import { SparePartsWorkflowEnhanced } from "@/components/admin/SparePartsWorkflow";
import { AvailablePartsManagement } from "@/components/admin/AvailablePartsManagement";
import { PartsActivityLog } from "@/components/admin/PartsActivityLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminSparePartsPage() {
  return (
    <AdminLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Rezervni delovi</h1>
          <p className="text-muted-foreground mt-1">
            Upravljanje rezervnim delovima i porudžbinama
          </p>
        </div>
        
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="workflow">🔄 Workflow</TabsTrigger>
            <TabsTrigger value="orders">Trenutne porudžbine</TabsTrigger>
            <TabsTrigger value="available">Djelovi na stanju</TabsTrigger>
            <TabsTrigger value="activity">Real-time aktivnost</TabsTrigger>
            <TabsTrigger value="management">Upravljanje delovima</TabsTrigger>
          </TabsList>
          
          <TabsContent value="workflow" className="space-y-4">
            <SparePartsWorkflowEnhanced />
          </TabsContent>
          
          <TabsContent value="orders" className="space-y-4">
            <SparePartsOrders />
          </TabsContent>
          
          <TabsContent value="available" className="space-y-4">
            <AvailablePartsManagement />
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-4">
            <PartsActivityLog />
          </TabsContent>
          
          <TabsContent value="management" className="space-y-4">
            <SparePartsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}