#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsInVzZXJuYW1lIjoiZ3J1aWNhQGZyaWdvc2lzdGVtdG9kb3NpamV2aWMuY29tIiwicm9sZSI6InRlY2huaWNpYW4iLCJ0ZWNobmljaWFuSWQiOjIsImlhdCI6MTc1MzczMTczOH0.olIt-mpyb-PfQGz0U3kYnQdjZxwJWLBUkfJjbshWr3c"

echo "Testing /api/my-services endpoint with curl..."
echo "Token: ${TOKEN:0:50}..."

curl -X GET "https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/my-services" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Origin: https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev" \
  -H "Referer: https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/tech" \
  -v