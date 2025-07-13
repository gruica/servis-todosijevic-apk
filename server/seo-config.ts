/**
 * SEO Optimizacija za aplikaciju
 * Implementacija meta tagova, schema markup-a i optimizacija za pretragače
 */

import { Express, Request, Response, NextFunction } from 'express';
import { Client, Service } from '@shared/schema';

// SEO Configuration
export interface SEOConfig {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  defaultImage: string;
  organizationName: string;
  organizationPhone: string;
  organizationEmail: string;
  organizationAddress: string;
  organizationCity: string;
  organizationCountry: string;
}

const defaultSEOConfig: SEOConfig = {
  siteName: 'Frigo Sistem Todosijević',
  siteDescription: 'Profesionalni servis bele tehnike u Crnoj Gori. Popravka i održavanje frižidera, veš mašina, sudoper mašina i drugih kućnih aparata.',
  siteUrl: 'https://www.frigosistemtodosijevic.me',
  defaultImage: '/assets/logo.png',
  organizationName: 'Frigo Sistem Todosijević',
  organizationPhone: '+382 67 051 141',
  organizationEmail: 'info@frigosistemtodosijevic.me',
  organizationAddress: 'Budva',
  organizationCity: 'Budva',
  organizationCountry: 'Montenegro',
};

/**
 * Generiše osnovne meta tagove
 */
export function generateBasicMeta(config: SEOConfig, page?: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}) {
  const title = page?.title ? `${page.title} - ${config.siteName}` : config.siteName;
  const description = page?.description || config.siteDescription;
  const image = page?.image || config.defaultImage;
  const url = page?.url || config.siteUrl;

  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <meta name="keywords" content="servis bele tehnike, popravka frižidera, popravka veš mašina, servis sudoper mašina, Crna Gora, Budva, Montenegro">
    <meta name="author" content="${config.organizationName}">
    <meta name="robots" content="index, follow">
    <meta name="language" content="sr-ME">
    <meta name="geo.region" content="ME">
    <meta name="geo.placename" content="${config.organizationCity}">
    <meta name="geo.position" content="42.2777;18.8369">
    <meta name="ICBM" content="42.2777, 18.8369">
    
    <title>${title}</title>
    <link rel="canonical" href="${url}">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${config.siteName}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${config.siteUrl}${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="sr_ME">
    <meta property="og:locale:alternate" content="sr_RS">
    <meta property="og:locale:alternate" content="en_US">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${config.siteUrl}${image}">
    
    <!-- Mobile optimizacija -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="${config.siteName}">
    <meta name="theme-color" content="#2563eb">
    
    <!-- Preconnect za performance -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  `;
}

/**
 * Generiše schema.org markup za organizaciju
 */
export function generateOrganizationSchema(config: SEOConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": config.organizationName,
    "description": config.siteDescription,
    "url": config.siteUrl,
    "telephone": config.organizationPhone,
    "email": config.organizationEmail,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": config.organizationAddress,
      "addressLocality": config.organizationCity,
      "addressCountry": config.organizationCountry,
      "postalCode": "85310"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "42.2777",
      "longitude": "18.8369"
    },
    "serviceArea": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": "42.2777",
        "longitude": "18.8369"
      },
      "geoRadius": "50000"
    },
    "priceRange": "€€",
    "paymentAccepted": "Cash, Card",
    "currenciesAccepted": "EUR",
    "openingHours": "Mo-Fr 08:00-17:00, Sa 08:00-14:00",
    "image": `${config.siteUrl}${config.defaultImage}`,
    "sameAs": [
      config.siteUrl,
      `${config.siteUrl}/admin`,
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Usluge servisa",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Popravka frižidera",
            "description": "Profesionalna popravka i održavanje frižidera svih brendova"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Popravka veš mašina",
            "description": "Servis i popravka veš mašina svih tipova"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Popravka sudoper mašina",
            "description": "Održavanje i popravka sudoper mašina"
          }
        }
      ]
    }
  };
}

/**
 * Generiše schema.org markup za breadcrumbs
 */
export function generateBreadcrumbSchema(config: SEOConfig, breadcrumbs: Array<{name: string, url: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

/**
 * Generiše schema.org markup za servis
 */
export function generateServiceSchema(config: SEOConfig, service: Service & { client?: Client }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `Servis ${service.description}`,
    "description": service.description,
    "provider": {
      "@type": "Organization",
      "name": config.organizationName,
      "url": config.siteUrl,
      "telephone": config.organizationPhone
    },
    "areaServed": {
      "@type": "Country",
      "name": "Montenegro"
    },
    "serviceType": "Appliance Repair",
    "dateCreated": service.createdAt,
    "dateModified": service.scheduledDate || service.createdAt,
    "status": service.status
  };
}

/**
 * Middleware za SEO optimizaciju
 */
export function seoMiddleware(config: SEOConfig = defaultSEOConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Dodaj SEO helper funkcije u response
    res.locals.seo = {
      generateMeta: (page?: any) => generateBasicMeta(config, page),
      generateOrganizationSchema: () => generateOrganizationSchema(config),
      generateBreadcrumbSchema: (breadcrumbs: any[]) => generateBreadcrumbSchema(config, breadcrumbs),
      generateServiceSchema: (service: any) => generateServiceSchema(config, service),
      config,
    };

    next();
  };
}

/**
 * Generiše robots.txt
 */
export function generateRobotsTxt(config: SEOConfig) {
  return `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/

Sitemap: ${config.siteUrl}/sitemap.xml

# Crawl-delay
Crawl-delay: 1
  `.trim();
}

/**
 * Generiše sitemap.xml
 */
export function generateSitemap(config: SEOConfig, pages: Array<{url: string, lastmod?: string, changefreq?: string, priority?: number}>) {
  const urls = pages.map(page => `
    <url>
      <loc>${config.siteUrl}${page.url}</loc>
      <lastmod>${page.lastmod || new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>${page.changefreq || 'weekly'}</changefreq>
      <priority>${page.priority || 0.8}</priority>
    </url>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${config.siteUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls}
</urlset>`.trim();
}

/**
 * Konfiguracija SEO ruta
 */
export function configureSEO(app: Express, config: SEOConfig = defaultSEOConfig) {
  console.log('[SEO] Konfiguracija SEO optimizacije...');

  // Dodaj SEO middleware
  app.use(seoMiddleware(config));

  // Robots.txt
  app.get('/robots.txt', (req: Request, res: Response) => {
    res.type('text/plain');
    res.send(generateRobotsTxt(config));
  });

  // Sitemap.xml
  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const pages = [
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/services', changefreq: 'weekly', priority: 0.8 },
      { url: '/contact', changefreq: 'monthly', priority: 0.6 },
    ];

    res.type('application/xml');
    res.send(generateSitemap(config, pages));
  });

  // Manifest.json za PWA
  app.get('/manifest.json', (req: Request, res: Response) => {
    res.json({
      name: config.siteName,
      short_name: 'Frigo Sistem',
      description: config.siteDescription,
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#2563eb',
      icons: [
        {
          src: '/assets/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/assets/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    });
  });

  console.log('[SEO] SEO optimizacija aktivirana');
}