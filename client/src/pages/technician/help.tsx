import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  Phone,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Package
} from "lucide-react";
import { Link } from "wouter";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: "basic" | "services" | "technical" | "troubleshooting";
  isOpen?: boolean;
}

const faqData: FAQItem[] = [
  {
    id: 1,
    question: "Kako da promenim status servisa?",
    answer: "Na glavnoj stranici, kliknite na servis koji želite ažurirati. U detaljima servisa ćete videti dugmad za promenu statusa kao što su 'Počni rad', 'Završi servis', ili 'Poruči delove'. Kliknite na odgovarajuće dugme i pratite instrukcije.",
    category: "services"
  },
  {
    id: 2,
    question: "Kako da naručim rezervne dijelove?",
    answer: "Otvorite detalje servisa i kliknite na 'Poruči rezervni dio'. Unesite naziv dela, kod proizvoda (ako je poznat), količinu i opis. Sistem će automatski poslati zahtev dobavljaču i obavestiti klijenta.",
    category: "services"
  },
  {
    id: 3,
    question: "Šta znače različiti statusi servisa?",
    answer: "Pending - novi servis čeka dodelu; Assigned - servis vam je dodeljen; In Progress - radite na servisu; Waiting Parts - čekate rezervne dijelove; Completed - servis je završen; Cancelled - servis je otkazan.",
    category: "basic"
  },
  {
    id: 4,
    question: "Kako da kontaktiram klijenta?",
    answer: "U detaljima servisa kliknite na telefon broj klijenta da ga pozovete direktno, ili na adresu da otvorite Google Maps navigaciju. Svi kontakt podaci su dostupni u kartici servisa.",
    category: "basic"
  },
  {
    id: 5,
    question: "Aplikacija se sporo učitava - šta da radim?",
    answer: "Proverite internet konekciju. Zatvorite i ponovo otvorite aplikaciju. Ako se problem nastavi, obratite se tehničkoj podršci na 067-077-092.",
    category: "troubleshooting"
  },
  {
    id: 6,
    question: "Kako da promenim svoju lozinku?",
    answer: "Idite na Moj profil > Bezbednost i kliknite 'Promeni lozinku'. Unesite trenutnu lozinku i novu lozinku dva puta za potvrdu.",
    category: "basic"
  },
  {
    id: 7,
    question: "Šta da radim ako klijent nije kod kuće?",
    answer: "U detaljima servisa kliknite 'Klijent nije dostupan' i odaberite razlog (nije kod kuće ili se ne javlja). Sistem će automatski obavestiti klijenta i administratore o potrebi ponovnog zakazivanja.",
    category: "services"
  }
];

const tutorials = [
  {
    id: 1,
    title: "Osnovno korišćenje aplikacije",
    description: "Upoznajte se sa osnovnim funkcijama mobilne aplikacije za servisere",
    duration: "5 min",
    difficulty: "Početnik"
  },
  {
    id: 2,
    title: "Upravljanje servisima",
    description: "Kako efikasno upravljati dodeljenim servisima od početka do kraja",
    duration: "8 min", 
    difficulty: "Srednji"
  },
  {
    id: 3,
    title: "Naručivanje rezervnih dijelova",
    description: "Kompletan proces naručivanja i praćenja rezervnih dijelova",
    duration: "6 min",
    difficulty: "Početnik"
  }
];

export default function TechnicianHelp() {
  const [openFAQs, setOpenFAQs] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const toggleFAQ = (id: number) => {
    setOpenFAQs(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFAQs = selectedCategory === "all" 
    ? faqData 
    : faqData.filter(faq => faq.category === selectedCategory);

  const categoryNames = {
    basic: "Osnove",
    services: "Servisi", 
    technical: "Tehnička pitanja",
    troubleshooting: "Rešavanje problema"
  };

  const categoryIcons = {
    basic: <HelpCircle className="h-4 w-4" />,
    services: <CheckCircle className="h-4 w-4" />,
    technical: <Package className="h-4 w-4" />,
    troubleshooting: <AlertCircle className="h-4 w-4" />
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/tech">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-green-600" />
              Pomoć i podrška
            </h1>
            <p className="text-gray-600">Uputstva, česta pitanja i tutorijali</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Brza pomoć</CardTitle>
              <CardDescription>Direktan kontakt za hitnu podršku</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-12"
                  onClick={() => window.open('tel:067077092')}
                >
                  <Phone className="h-4 w-4 text-green-600" />
                  Pozovi podršku
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-12"
                  onClick={() => window.open('https://wa.me/382067077092', '_blank')}
                >
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  WhatsApp chat
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 h-12"
                  onClick={() => window.open('mailto:jelena@frigosistemtodosijevic.com')}
                >
                  <FileText className="h-4 w-4 text-green-600" />
                  Pošalji email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Video Tutorials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                Video tutorijali
              </CardTitle>
              <CardDescription>
                Korak-po-korak uputstva za korišćenje aplikacije
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tutorials.map(tutorial => (
                <div key={tutorial.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{tutorial.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{tutorial.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {tutorial.duration}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {tutorial.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" className="ml-4">
                    <Play className="h-4 w-4 mr-1" />
                    Gledaj
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle>Česta pitanja (FAQ)</CardTitle>
              <CardDescription>
                Odgovori na najčešće postavljena pitanja
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                >
                  Sve kategorije
                </Button>
                {Object.entries(categoryNames).map(([key, name]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(key)}
                    className="flex items-center gap-2"
                  >
                    {categoryIcons[key as keyof typeof categoryIcons]}
                    {name}
                  </Button>
                ))}
              </div>

              {/* FAQ Items */}
              <div className="space-y-2">
                {filteredFAQs.map(faq => (
                  <Collapsible key={faq.id}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-4 h-auto text-left hover:bg-gray-50"
                        onClick={() => toggleFAQ(faq.id)}
                      >
                        <div className="flex items-center gap-3">
                          {categoryIcons[faq.category]}
                          <span className="font-medium">{faq.question}</span>
                        </div>
                        {openFAQs.includes(faq.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="pl-7 text-sm text-gray-600 leading-relaxed">
                        {faq.answer}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>

              {filteredFAQs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nema pitanja u izabranoj kategoriji.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Kontakt informacije</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Tehnička podrška</h4>
                  <p className="text-gray-600">Telefon: 067-077-092</p>
                  <p className="text-gray-600">Email: jelena@frigosistemtodosijevic.com</p>
                  <p className="text-gray-600">Radno vreme: 08:00 - 17:00</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Adresa kancelarije</h4>
                  <p className="text-gray-600">Frigo Sistem Todosijević</p>
                  <p className="text-gray-600">Kotor, Crna Gora</p>
                  <p className="text-gray-600">Pon-Pet: 08:00 - 17:00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}