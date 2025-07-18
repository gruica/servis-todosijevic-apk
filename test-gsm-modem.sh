#!/bin/bash

# GSM Modem Test Script
# Ovaj skript testira fizičku konekciju sa GSM modemom

echo "=== GSM MODEM PHYSICAL TEST ==="
echo "Testing GSM modem connection with SIM card 067028666"
echo

# 1. Proverava dostupne USB/Serial portove
echo "1. Checking available USB/Serial ports..."
echo "Available ports:"
if command -v ls &> /dev/null; then
    ls -la /dev/ttyUSB* 2>/dev/null || echo "No /dev/ttyUSB* devices found"
    ls -la /dev/ttyACM* 2>/dev/null || echo "No /dev/ttyACM* devices found"
    ls -la /dev/ttyS* 2>/dev/null | head -5 || echo "No /dev/ttyS* devices found"
else
    echo "ls command not available"
fi
echo

# 2. Testira Node.js SerialPort funkcionalnost
echo "2. Testing Node.js SerialPort functionality..."
node -e "
const { SerialPort } = require('serialport');
SerialPort.list().then(ports => {
    console.log('Available ports from Node.js SerialPort:');
    ports.forEach(port => {
        console.log(\`  - \${port.path} (\${port.manufacturer || 'Unknown'} - \${port.vendorId || 'N/A'})\`);
    });
    if (ports.length === 0) {
        console.log('  No serial ports detected');
    }
}).catch(err => {
    console.error('Error listing ports:', err.message);
});
"
echo

# 3. Testira GSM modem API endpoint
echo "3. Testing GSM modem API endpoints..."
echo "Testing /api/gsm-modem/ports endpoint..."
curl -s -X GET "http://localhost:3000/api/gsm-modem/ports" \
    -H "Accept: application/json" \
    -b "cookies.txt" \
    | jq '.' 2>/dev/null || echo "Could not fetch ports (API or authentication issue)"
echo

# 4. Testira GSM modem status
echo "4. Testing GSM modem status..."
curl -s -X GET "http://localhost:3000/api/gsm-modem/status" \
    -H "Accept: application/json" \
    -b "cookies.txt" \
    | jq '.' 2>/dev/null || echo "Could not fetch status (API or authentication issue)"
echo

# 5. Instrukcije za fizičku konekciju
echo "5. PHYSICAL CONNECTION INSTRUCTIONS:"
echo "   - Connect GSM modem/MiFi device to USB port"
echo "   - Insert SIM card 067028666 (PIN should be removed)"
echo "   - Wait for device to initialize and connect to network"
echo "   - Device should appear as /dev/ttyUSB0 or /dev/ttyACM0"
echo "   - LED indicators should show network connection"
echo

# 6. Instrukcije za konfiguraciju preko admin panela
echo "6. ADMIN PANEL CONFIGURATION:"
echo "   - Login to admin panel: http://localhost:3000/admin"
echo "   - Go to 'SMS Settings' page"
echo "   - Select 'GSM Modem' as provider"
echo "   - Configure port (usually /dev/ttyUSB0 or /dev/ttyACM0)"
echo "   - Set baud rate to 9600"
echo "   - Set phone number to +38267028666"
echo "   - Enable fallback to Twilio if needed"
echo "   - Click 'Configure GSM Modem'"
echo

echo "=== TEST COMPLETED ==="
echo "Next steps:"
echo "1. Physically connect GSM modem to USB"
echo "2. Run this script again to see detected ports"
echo "3. Configure through admin panel"
echo "4. Test SMS sending"