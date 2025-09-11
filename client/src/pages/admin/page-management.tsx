import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Eye, Save, RefreshCw, FileText, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface StaticPage {
  name: string;
  filename: string;
  title: string;
  description: string;
  content?: string;
}

const STATIC_PAGES: StaticPage[] = [
  {
    name: 'Privacy Policy',
    filename: 'privacy-policy.html',
    title: 'Uslovi korišćenja - Frigo Sistem Todosijević',
    description: 'GDPR compliant privacy policy za Facebook App Review'
  },
  {
    name: 'Data Deletion',
    filename: 'data-deletion.html',
    title: 'Brisanje podataka - Frigo Sistem Todosijević',
    description: 'Stranica za zahtev brisanja ličnih podataka'
  },
  {
    name: 'Reviewer Instructions',
    filename: 'reviewer-instructions.html',
    title: 'Facebook App Review Instructions',
    description: 'Instrukcije za Facebook reviewere'
  },
  {
    name: 'Resubmission Guide',
    filename: 'facebook-resubmission-guide.html',
    title: 'Facebook App Review Resubmission Guide',
    description: 'Vodič za ponovo submitovanje aplikacije'
  }
];

export default function PageManagement() {
  const [selectedPage, setSelectedPage] = useState<string>('privacy-policy.html');
  const [pageContent, setPageContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  // Load page content when selected page changes - but wait for auth to load
  useEffect(() => {
    if (authLoading || !user) {
      return; // Wait for auth to load
    }
    loadPageContent();
  }, [selectedPage, user, authLoading]);

  const loadPageContent = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest(`/api/admin/static-pages/${selectedPage}`);
      const data = await response.json();
      setPageContent(data.content || '');
      setLastSaved(data.lastModified || '');
    } catch (error: any) {
      console.error('Error loading page content:', error);
      
      // Check if it's a 401 error (unauthorized)
      if (error.message && error.message.includes('401')) {
        toast({
          title: "Sesija istekla",
          description: "Molimo prijavite se ponovo",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Greška",
        description: "Ne mogu da učitam sadržaj stranice",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePageContent = async () => {
    setIsSaving(true);
    try {
      const response = await apiRequest(`/api/admin/static-pages/${selectedPage}`, {
        method: 'PUT',
        body: JSON.stringify({ content: pageContent }),
      });

      const data = await response.json();
      setLastSaved(new Date().toLocaleString('sr-RS'));
      toast({
        title: "Uspešno",
        description: "Stranica je uspešno sačuvana",
      });
    } catch (error) {
      console.error('Error saving page content:', error);
      toast({
        title: "Greška",
        description: "Greška pri čuvanju stranice",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const previewPage = () => {
    window.open(`/${selectedPage}`, '_blank');
  };

  const getPageInfo = () => {
    return STATIC_PAGES.find(page => page.filename === selectedPage);
  };

  const currentPage = getPageInfo();

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              Upravljanje stranicama
            </h1>
            <p className="text-gray-600 mt-2">
              Upravljanje statičkim HTML stranicama za Facebook App Review
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={previewPage} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Pregled
            </Button>
            <Button 
              onClick={loadPageContent}
              variant="outline"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Osveži
            </Button>
            <Button 
              onClick={savePageContent}
              disabled={isSaving || !pageContent.trim()}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Čuvam...' : 'Sačuvaj'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Page Selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Stranice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {STATIC_PAGES.map((page) => (
                  <div
                    key={page.filename}
                    onClick={() => setSelectedPage(page.filename)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedPage === page.filename 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium text-sm">{page.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{page.filename}</div>
                    <div className="text-xs text-gray-400 mt-1">{page.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Page Info */}
            {currentPage && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Informacije</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium">Naslov stranice</Label>
                    <div className="text-sm text-gray-600 mt-1">{currentPage.title}</div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">URL</Label>
                    <div className="text-sm text-blue-600 mt-1">/{currentPage.filename}</div>
                  </div>
                  {lastSaved && (
                    <div>
                      <Label className="text-xs font-medium">Poslednje izmene</Label>
                      <div className="text-sm text-gray-600 mt-1">{lastSaved}</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-600">Aktivna</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Content Editor */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {currentPage?.name || 'Stranica'}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    HTML Editor
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="h-full">
                <Tabs defaultValue="editor" className="h-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="editor">HTML Editor</TabsTrigger>
                    <TabsTrigger value="info">Informacije</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="editor" className="h-full mt-4">
                    <div className="space-y-4 h-full">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="content" className="text-sm font-medium">
                          HTML Sadržaj
                        </Label>
                        <div className="text-xs text-gray-500">
                          {pageContent.length} karaktera
                        </div>
                      </div>
                      
                      <Textarea
                        id="content"
                        value={pageContent}
                        onChange={(e) => setPageContent(e.target.value)}
                        placeholder="Učitavam sadržaj stranice..."
                        className="font-mono text-sm min-h-[500px] resize-none"
                        disabled={isLoading}
                      />
                      
                      {pageContent && (
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>✓ HTML sintaksa</span>
                          <span>✓ Meta tagovi</span>
                          <span>✓ Responsive dizajn</span>
                          <span>✓ Facebook crawler kompatibilno</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="info" className="mt-4">
                    <div className="space-y-6">
                      <div className="grid gap-4">
                        <div>
                          <Label className="text-sm font-medium">Svrha stranice</Label>
                          <p className="text-sm text-gray-600 mt-1">
                            {currentPage?.description}
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Facebook App Review</Label>
                          <p className="text-sm text-gray-600 mt-1">
                            Ova stranica je kreirana specijalno za Facebook App Review proces. 
                            Statički HTML omogućava Facebook crawler-ima da čitaju sadržaj bez potrebe za JavaScript izvršavanjem.
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Tehnički detalji</Label>
                          <ul className="text-sm text-gray-600 mt-1 space-y-1">
                            <li>• Statička HTML stranica</li>
                            <li>• Bez JavaScript zavisnosti</li>
                            <li>• SEO optimizovana</li>
                            <li>• Meta Open Graph tagovi</li>
                            <li>• GDPR compliant sadržaj</li>
                          </ul>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Napomene za uređivanje</Label>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-1">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                              <div className="text-sm text-yellow-800">
                                <strong>Pažljivo uređujte:</strong> Ove stranice su kritične za Facebook App Review. 
                                Proverite da li su svi linkovi i meta tagovi ispravni pre čuvanja.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}