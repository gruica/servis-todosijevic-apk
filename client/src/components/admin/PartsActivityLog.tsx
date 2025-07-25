import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, User, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sr } from "date-fns/locale";

interface ActivityLogEntry {
  id: number;
  partId: number | null;
  action: string;
  previousQuantity: number | null;
  newQuantity: number | null;
  technicianId: number | null;
  serviceId: number | null;
  userId: number;
  description: string | null;
  timestamp: string;
  userName: string | null;
  partName: string | null;
}

export function PartsActivityLog() {
  // Real-time fetching sa refresh svakih 3 sekunde
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/admin/parts-activity-log", { limit: 100 }],
    refetchInterval: 3000, // Real-time refresh
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'added':
        return <Badge variant="default" className="bg-green-100 text-green-800">Dodano</Badge>;
      case 'allocated':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Dodeljeno</Badge>;
      case 'returned':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Vraćeno</Badge>;
      case 'consumed':
        return <Badge variant="default" className="bg-red-100 text-red-800">Potrošeno</Badge>;
      case 'expired':
        return <Badge variant="destructive">Isteklo</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true, 
        locale: sr 
      });
    } catch {
      return new Date(timestamp).toLocaleString('sr-RS');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Log aktivnosti rezervnih delova
          </CardTitle>
          <CardDescription>
            Real-time praćenje svih aktivnosti sa rezervnim delovima
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Log aktivnosti rezervnih delova
          {activities && Array.isArray(activities) && (
            <Badge variant="outline" className="ml-auto">
              {(activities as ActivityLogEntry[]).length} aktivnosti
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Real-time praćenje svih aktivnosti sa rezervnim delovima (automatski refresh svakih 3s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities && Array.isArray(activities) && activities.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Akcija</TableHead>
                  <TableHead>Rezervni deo</TableHead>
                  <TableHead>Količina</TableHead>
                  <TableHead>Korisnik</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead>Vreme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activities as ActivityLogEntry[]).map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      {getActionBadge(activity.action)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {activity.partName || `Deo #${activity.partId || 'N/A'}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {activity.previousQuantity !== null && activity.newQuantity !== null ? (
                        <div className="text-sm">
                          <span className="text-gray-500">{activity.previousQuantity}</span>
                          <span className="mx-1">→</span>
                          <span className="font-medium">{activity.newQuantity}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{activity.userName || 'Nepoznat korisnik'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {activity.description || 'Nema opisa'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {formatTimestamp(activity.timestamp)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nema zabeleženih aktivnosti</p>
            <p className="text-sm">Aktivnosti će se pojaviti kada se dodaju ili dodeljuju rezervni delovi</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}