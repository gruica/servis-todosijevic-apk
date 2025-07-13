#!/usr/bin/env node
/**
 * Script za podešavanje SSL sertifikata i sigurnosnih konfiguracija
 * za www.frigosistemtodosijevic.me i admin.me domene
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 Pokretanje SSL i sigurnosne konfiguracije...');

// Konfiguracija za domene
const domains = {
  primary: 'www.frigosistemtodosijevic.me',
  admin: 'admin.me',
  replit: process.env.REPLIT_DOMAIN || 'unknown.replit.app'
};

console.log(`📋 Domeni za konfiguraciju:
- Primarni: ${domains.primary}
- Admin: ${domains.admin}
- Replit: ${domains.replit}`);

// Kreiranje nginx konfiguracije za reverse proxy
const nginxConfig = `
# Nginx konfiguracija za Frigo Sistem Todosijević
server {
    listen 80;
    server_name ${domains.primary} frigosistemtodosijevic.me;
    
    # Redirekcija na HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domains.primary} frigosistemtodosijevic.me;
    
    # SSL konfiguracija
    ssl_certificate /etc/letsencrypt/live/${domains.primary}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domains.primary}/privkey.pem;
    
    # Sigurnosni header-i
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Proxy na Node.js aplikaciju
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Admin subdomain konfiguracija
server {
    listen 80;
    server_name ${domains.admin};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domains.admin};
    
    # SSL konfiguracija
    ssl_certificate /etc/letsencrypt/live/${domains.admin}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domains.admin}/privkey.pem;
    
    # Sigurnosni header-i
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy na Node.js aplikaciju sa admin rutama
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
`;

// Kreiranje Let's Encrypt SSL setup skripte
const letsEncryptScript = `#!/bin/bash
# Script za automatsko podešavanje Let's Encrypt SSL sertifikata

echo "🚀 Pokretanje Let's Encrypt SSL setup-a..."

# Instalacija certbot-a
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Dobijanje SSL sertifikata za glavnu domenu
sudo certbot --nginx -d ${domains.primary} -d frigosistemtodosijevic.me --email admin@frigosistemtodosijevic.me --agree-tos --non-interactive

# Dobijanje SSL sertifikata za admin domenu
sudo certbot --nginx -d ${domains.admin} --email admin@frigosistemtodosijevic.me --agree-tos --non-interactive

# Automatsko obnavljanje sertifikata
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "✅ SSL sertifikati uspešno podešeni!"
`;

// Kreiranje skripte za testiranje sigurnosti
const securityTestScript = `#!/bin/bash
# Script za testiranje sigurnosti i pristupačnosti

echo "🔍 Testiranje sigurnosnih konfiguracija..."

# Testiranje SSL sertifikata
echo "Testing SSL for ${domains.primary}..."
openssl s_client -connect ${domains.primary}:443 -servername ${domains.primary} < /dev/null

echo "Testing SSL for ${domains.admin}..."
openssl s_client -connect ${domains.admin}:443 -servername ${domains.admin} < /dev/null

# Testiranje sigurnosnih header-a
echo "Testing security headers..."
curl -I https://${domains.primary} | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)"

# Testiranje pristupačnosti
echo "Testing accessibility..."
curl -s https://${domains.primary} | grep -E "(lang=|alt=|role=)"

echo "✅ Sigurnosni testovi završeni!"
`;

// Kreiranje Replit deployment konfiguracije
const replitConfig = `# Replit konfiguracija za produkciju
{
  "name": "frigo-sistem-todosijevic",
  "deployment": {
    "build": "npm run build",
    "run": "npm start",
    "envVars": {
      "NODE_ENV": "production",
      "DOMAIN": "${domains.primary}",
      "ADMIN_DOMAIN": "${domains.admin}",
      "FORCE_HTTPS": "true"
    }
  },
  "domains": [
    "${domains.primary}",
    "${domains.admin}"
  ]
}
`;

// Kreiranje DNS konfiguracije
const dnsInstructions = `
# DNS konfiguracija za domene

## Za ${domains.primary}:
A record: @ → [IP ADRESA SERVERA]
CNAME record: www → ${domains.primary}

## Za ${domains.admin}:
A record: @ → [IP ADRESA SERVERA]

## Cloudflare konfiguracija (preporučeno):
1. Dodajte domene u Cloudflare
2. Postavite DNS record-e
3. Omogućite "Full (strict)" SSL mode
4. Omogućite "Always Use HTTPS"
5. Omogućite "HSTS"

## Testiranje DNS-a:
nslookup ${domains.primary}
nslookup ${domains.admin}
dig ${domains.primary} A
dig ${domains.admin} A
`;

// Kreiranje fajlova
const scriptsDir = path.join(__dirname, '../config/ssl');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// Pisanje konfiguracionih fajlova
fs.writeFileSync(path.join(scriptsDir, 'nginx.conf'), nginxConfig);
fs.writeFileSync(path.join(scriptsDir, 'letsencrypt-setup.sh'), letsEncryptScript);
fs.writeFileSync(path.join(scriptsDir, 'security-test.sh'), securityTestScript);
fs.writeFileSync(path.join(scriptsDir, 'replit-config.json'), replitConfig);
fs.writeFileSync(path.join(scriptsDir, 'dns-instructions.txt'), dnsInstructions);

// Dodavanje izvršnih dozvola
try {
  execSync(`chmod +x ${path.join(scriptsDir, 'letsencrypt-setup.sh')}`);
  execSync(`chmod +x ${path.join(scriptsDir, 'security-test.sh')}`);
  console.log('✅ Izvršne dozvole dodane');
} catch (error) {
  console.log('⚠️ Dodavanje izvršnih dozvola preskočeno (možda Windows)');
}

console.log(`
🎉 SSL i sigurnosne konfiguracije kreirane!

📁 Kreirani fajlovi:
- ${path.join(scriptsDir, 'nginx.conf')} - Nginx konfiguracija
- ${path.join(scriptsDir, 'letsencrypt-setup.sh')} - SSL setup script
- ${path.join(scriptsDir, 'security-test.sh')} - Sigurnosni testovi
- ${path.join(scriptsDir, 'replit-config.json')} - Replit konfiguracija
- ${path.join(scriptsDir, 'dns-instructions.txt')} - DNS uputstva

🔧 Sledeći koraci:
1. Podesiti DNS record-e prema uputstvima u dns-instructions.txt
2. Pokrenuti letsencrypt-setup.sh na serveru
3. Konfigurisati nginx sa nginx.conf
4. Testirati sigurnost sa security-test.sh
5. Deployovati na Replit sa novim domenima

⚠️ Napomena: Ova konfiguracija je pripremljena za server environment.
Za Replit deployment, koristite Replit's built-in custom domain feature.
`);