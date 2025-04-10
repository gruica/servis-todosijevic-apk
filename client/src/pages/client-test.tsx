import { useState, useEffect } from "react";
import { useParams } from "wouter";

export default function ClientTest() {
  const params = useParams<{ id: string }>();
  const clientId = parseInt(params.id);
  const [clientData, setClientData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Koristimo test rutu koja ne zahteva autentifikaciju
        const res = await fetch(`/api/test/clients/${clientId}/details`);
        if (!res.ok) {
          throw new Error("Klijent nije pronađen");
        }
        const data = await res.json();
        console.log("Detalji klijenta:", data);
        setClientData(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Greška:", err);
        setError((err as Error).message);
        setIsLoading(false);
      }
    }

    fetchData();
  }, [clientId]);

  if (isLoading) {
    return <div>Učitavanje...</div>;
  }

  if (error) {
    return <div>Greška: {error}</div>;
  }

  if (!clientData) {
    return <div>Klijent nije pronađen</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Detalji klijenta ID: {clientId}</h1>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Osnovne informacije</h2>
        <p>Ime i prezime: {clientData.fullName}</p>
        <p>Email: {clientData.email}</p>
        <p>Telefon: {clientData.phone}</p>
        <p>Adresa: {clientData.address}, {clientData.city}</p>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Uređaji ({clientData.appliances?.length || 0})</h2>
        {clientData.appliances?.length > 0 ? (
          <div className="space-y-2">
            {clientData.appliances.map((appliance: any) => (
              <div key={appliance.id} className="border p-2 rounded">
                <p><strong>Kategorija:</strong> {appliance.category?.name}</p>
                <p><strong>Proizvođač:</strong> {appliance.manufacturer?.name}</p>
                <p><strong>Model:</strong> {appliance.model}</p>
                <p><strong>Serijski broj:</strong> {appliance.serialNumber}</p>
                
                <div className="mt-2">
                  <h3 className="font-semibold">Servisi uređaja:</h3>
                  {appliance.services?.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {appliance.services.map((service: any) => (
                        <li key={service.id}>
                          ID: {service.id} - Status: {service.status}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Nema servisa za ovaj uređaj</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Nema uređaja</p>
        )}
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Servisi ({clientData.services?.length || 0})</h2>
        {clientData.services?.length > 0 ? (
          <div className="space-y-2">
            {clientData.services.map((service: any) => (
              <div key={service.id} className="border p-2 rounded">
                <p><strong>ID:</strong> {service.id}</p>
                <p><strong>Status:</strong> {service.status}</p>
                <p><strong>Opis:</strong> {service.description}</p>
                <p><strong>Datum:</strong> {new Date(service.createdAt).toLocaleDateString()}</p>
                
                <p><strong>Serviser:</strong> {service.technician?.fullName || 'Nije dodeljen'}</p>
                
                <div className="mt-2">
                  <h3 className="font-semibold">Istorija statusa:</h3>
                  {service.statusHistory?.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {service.statusHistory.map((history: any, index: number) => (
                        <li key={index}>
                          {history.oldStatus} → {history.newStatus} 
                          ({new Date(history.createdAt).toLocaleDateString()})
                          {history.notes && `: ${history.notes}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Nema istorije statusa</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Nema servisa</p>
        )}
      </div>
      
      <div className="mt-4">
        <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
          {JSON.stringify(clientData, null, 2)}
        </pre>
      </div>
    </div>
  );
}