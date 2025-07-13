#!/bin/bash
# Script za testiranje sigurnosti i pristupačnosti

echo "🔍 Testiranje sigurnosnih konfiguracija..."

# Testiranje SSL sertifikata
echo "Testing SSL for www.frigosistemtodosijevic.me..."
openssl s_client -connect www.frigosistemtodosijevic.me:443 -servername www.frigosistemtodosijevic.me < /dev/null

echo "Testing SSL for admin.me..."
openssl s_client -connect admin.me:443 -servername admin.me < /dev/null

# Testiranje sigurnosnih header-a
echo "Testing security headers..."
curl -I https://www.frigosistemtodosijevic.me | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)"

# Testiranje pristupačnosti
echo "Testing accessibility..."
curl -s https://www.frigosistemtodosijevic.me | grep -E "(lang=|alt=|role=)"

echo "✅ Sigurnosni testovi završeni!"
