import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  ExternalLink,
  Users,
  Building
} from "lucide-react";
import { Link } from "wouter";

const contactInfo = [
  {
    title: "Glavni telefon",
    value: "067-077-092", 
    icon: Phone,
    action: () => window.open('tel:067077092'),
    color: "text-green-600 bg-green-100"
  },
  {
    title: "Email adresa",
    value: "jelena@frigosistemtodosijevic.com",
    icon: Mail,
    action: () => window.open('mailto:jelena@frigosistemtodosijevic.com'),
    color: "text-blue-600 bg-blue-100"
  },
  {
    title: "WhatsApp",
    value: "067-077-092",
    icon: MessageSquare,
    action: () => window.open('https://wa.me/382067077092', '_blank'),
    color: "text-green-600 bg-green-100"
  }
];

const officeHours = [
  { day: "Ponedeljak - Petak", hours: "08:00 - 17:00" },
  { day: "Subota", hours: "08:00 - 13:00" },
  { day: "Nedelja", hours: "Zatvoreno" }
];

const teamMembers = [
  {
    name: "Jelena Todosijević",
    role: "Direktor / Administrator",
    phone: "067-077-092",
    email: "jelena@frigosistemtodosijevic.com"
  },
  {
    name: "Teodora Todosijević", 
    role: "Com Plus koordinator",
    phone: "067-077-093",
    email: "teodora@frigosistemtodosijevic.com"
  }
];

export default function TechnicianContact() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
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
              <Phone className="h-6 w-6 text-purple-600" />
              Kontakt
            </h1>
            <p className="text-gray-600">Direktan kontakt sa administracijom i timom</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Quick Contact Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-600" />
                Brzi kontakt
              </CardTitle>
              <CardDescription>
                Direktan kontakt za hitne situacije i podršku
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactInfo.map((contact, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${contact.color}`}>
                      <contact.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{contact.title}</p>
                      <p className="text-sm text-gray-600">{contact.value}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={contact.action}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Kontaktiraj
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Radno vreme
              </CardTitle>
              <CardDescription>
                Vreme kada možete kontaktirati naš tim
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {officeHours.map((schedule, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <span className="font-medium text-gray-900">{schedule.day}</span>
                    <span className="text-gray-600">{schedule.hours}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Hitne situacije:</strong> Za hitne tehničke probleme možete kontaktirati WhatsApp 24/7
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Tim i kontakt osobe
              </CardTitle>
              <CardDescription>
                Direktan kontakt sa članovima tima
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamMembers.map((member, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{member.role}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <button 
                            onClick={() => window.open(`tel:${member.phone.replace(/[^0-9+]/g, '')}`)}
                            className="text-blue-600 hover:underline"
                          >
                            {member.phone}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <button 
                            onClick={() => window.open(`mailto:${member.email}`)}
                            className="text-blue-600 hover:underline"
                          >
                            {member.email}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-gray-600" />
                Informacije o kompaniji
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Frigo Sistem Todosijević</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>Kotor, Crna Gora</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>067-077-092</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>jelena@frigosistemtodosijevic.com</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Usluge</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Servis bele tehnike</li>
                    <li>• Garancijski i van-garancijski servisi</li>
                    <li>• Rezervni delovi i trgovina</li>
                    <li>• Tehnička podrška 24/7</li>
                    <li>• Preventivno održavanje</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Za hitne situacije</h4>
                <p className="text-sm text-purple-800">
                  Ako imate hitnu tehničku situaciju ili problem sa aplikacijom, možete direktno kontaktirati WhatsApp na 
                  <button 
                    onClick={() => window.open('https://wa.me/382067077092', '_blank')}
                    className="font-medium underline ml-1"
                  >
                    067-077-092
                  </button>
                  . Odgovorićemo u najkraćem mogućem roku.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}