#!/bin/bash
# Script za automatsko podešavanje Let's Encrypt SSL sertifikata

echo "🚀 Pokretanje Let's Encrypt SSL setup-a..."

# Instalacija certbot-a
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Dobijanje SSL sertifikata za glavnu domenu
sudo certbot --nginx -d www.frigosistemtodosijevic.me -d frigosistemtodosijevic.me --email admin@frigosistemtodosijevic.me --agree-tos --non-interactive

# Dobijanje SSL sertifikata za admin domenu
sudo certbot --nginx -d admin.me --email admin@frigosistemtodosijevic.me --agree-tos --non-interactive

# Automatsko obnavljanje sertifikata
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "✅ SSL sertifikati uspešno podešeni!"
