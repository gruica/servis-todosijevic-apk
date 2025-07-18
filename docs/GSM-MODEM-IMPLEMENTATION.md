# GSM Modem Implementation Documentation

## Overview
Comprehensive GSM modem integration system for Frigo Sistem - enables local SMS sending through physical GSM modem with SIM card 067028666, providing cost-effective alternative to Twilio with automatic fallback capabilities.

## Architecture Components

### 1. GSMModemService (`server/gsm-modem-service.ts`)
Core service handling direct communication with GSM modem hardware.

**Key Features:**
- Serial port communication with AT commands
- Command queue management for thread-safe operations
- Automatic modem initialization and network registration
- SMS sending with proper encoding (Serbian language support)
- Connection monitoring and error handling

**Key Methods:**
- `configure()` - Setup modem parameters
- `connect()` - Establish serial connection
- `sendSms()` - Send SMS message
- `testConnection()` - Verify modem functionality
- `getAvailablePorts()` - Detect connected devices

### 2. HybridSMSService (`server/hybrid-sms-service.ts`)
Intelligent SMS routing system managing multiple providers.

**Key Features:**
- Provider selection (GSM modem primary, Twilio fallback)
- Automatic failover mechanism
- Configuration management
- Status monitoring for all providers
- Unified API for different SMS providers

**Provider Logic:**
1. **Primary**: GSM modem (if available and configured)
2. **Fallback**: Twilio (if GSM modem fails)
3. **Auto**: Intelligent selection based on availability

### 3. API Endpoints (`server/routes.ts`)
RESTful API for GSM modem management.

**Endpoints:**
```
GET /api/gsm-modem/ports       - List available serial ports
POST /api/gsm-modem/configure  - Configure modem settings
GET /api/gsm-modem/status      - Get modem status
POST /api/gsm-modem/test       - Send test SMS
POST /api/gsm-modem/restart    - Restart modem connection
```

### 4. Admin Panel Integration (`client/src/pages/admin/sms-settings.tsx`)
User interface for GSM modem configuration.

**Features:**
- Port detection and selection
- Configuration form with validation
- Status monitoring dashboard
- Test SMS functionality
- Error handling and user feedback

## Configuration Parameters

### GSM Modem Settings
```typescript
interface GSMModemConfig {
  port: string;        // Serial port (e.g., "/dev/ttyUSB0")
  baudRate: number;    // Communication speed (default: 9600)
  phoneNumber: string; // SIM card number (+38267028666)
  pin?: string;        // SIM PIN (optional if removed)
}
```

### Hybrid SMS Configuration
```typescript
interface HybridSMSConfig {
  preferredProvider: 'gsm_modem' | 'twilio' | 'auto';
  fallbackEnabled: boolean;
  gsmModemConfig?: GSMModemConfig;
}
```

## SMS Message Flow

### 1. Service Status Update
```
Admin/Technician triggers status change
↓
SMS service receives update request
↓
HybridSMSService determines provider
↓
If GSM modem available: GSMModemService.sendSms()
↓
If GSM fails and fallback enabled: Twilio SMS
↓
Response with success/failure status
```

### 2. AT Command Sequence
```
AT                    - Test communication
AT+CMGF=1            - Set text mode
AT+CSCS="GSM"        - Set character set
AT+CMGS="+38267..."  - Set recipient
Message text         - Send message content
Ctrl+Z (ASCII 26)    - End message
```

## Error Handling

### Connection Errors
- **Serial Port Not Found**: Fallback to Twilio
- **Modem Not Responding**: Automatic retry with timeout
- **Network Registration Failed**: Status monitoring and alerts

### SMS Sending Errors
- **Invalid Number Format**: Validation before sending
- **No Signal**: Automatic retry or fallback
- **SIM Card Issues**: Detailed error reporting

### Recovery Mechanisms
- **Automatic Reconnection**: On connection loss
- **Command Queue**: Prevents concurrent AT commands
- **Timeout Handling**: Prevents hanging operations

## Monitoring and Logging

### Log Levels
```
[GSM MODEM] Inicijalizacija GSM Modem servisa
[GSM MODEM] Konfiguracija modema: port=/dev/ttyUSB0...
[GSM MODEM] ✅ Serial port otvoren
[GSM MODEM] ✅ Modem uspešno inicijalizovan
[GSM MODEM] Slanje SMS-a na +38267123456...
[GSM MODEM] ✅ SMS uspešno poslat
[GSM MODEM] ❌ Greška pri slanju SMS-a: ...
```

### Status Monitoring
- Connection status (connected/disconnected)
- Signal strength monitoring
- Network registration status
- SMS sending statistics
- Error rate tracking

## Security Considerations

### Authentication
- Admin-only access to GSM modem configuration
- Role-based endpoint protection
- Session validation for all operations

### Data Protection
- No sensitive data stored in logs
- Secure configuration parameter handling
- PIN protection for SIM card access

## Performance Optimization

### Connection Management
- Persistent serial connection
- Command queue for sequential operations
- Timeout management for responsiveness

### Resource Usage
- Minimal memory footprint
- Efficient AT command processing
- Automatic resource cleanup

## Testing and Validation

### Test Script (`test-gsm-modem.sh`)
Comprehensive testing suite for:
- Port detection
- API endpoint functionality
- Physical connection validation
- Integration testing

### Manual Testing
1. **Port Detection**: Verify USB device recognition
2. **Configuration**: Test admin panel settings
3. **SMS Sending**: Validate message delivery
4. **Fallback**: Test Twilio backup functionality

## Deployment Considerations

### Production Environment
- Physical USB connection required
- Serial port drivers must be installed
- SIM card must be active and funded

### Development Environment
- Simulation mode for testing
- Twilio fallback for development
- Mock responses for UI testing

## Troubleshooting Guide

### Common Issues
1. **Port Not Detected**: Check USB connection and drivers
2. **Permission Denied**: Verify port permissions
3. **No Network**: Check SIM card and signal
4. **AT Command Timeout**: Verify baud rate and port

### Solutions
1. **Restart Connection**: Use `/api/gsm-modem/restart`
2. **Check Logs**: Monitor console output
3. **Test Fallback**: Verify Twilio configuration
4. **Physical Check**: Verify LED indicators

## Future Enhancements

### Planned Features
- Multiple SIM card support
- Advanced signal monitoring
- SMS delivery receipts
- Bulk SMS optimization
- Statistics dashboard

### Scalability
- Support for multiple GSM modems
- Load balancing between providers
- Queue management for high volume
- Performance metrics collection

## Integration Points

### With Existing Systems
- **Service Management**: Automatic status updates
- **Maintenance Alerts**: Scheduled reminders
- **Notification System**: Real-time alerts
- **Admin Panel**: Configuration management

### External Dependencies
- **SerialPort**: Hardware communication
- **AT Commands**: GSM standard protocol
- **Twilio**: Fallback SMS provider
- **PostgreSQL**: Configuration storage

## Maintenance

### Regular Tasks
- Monitor SIM card credit
- Check signal strength
- Review error logs
- Test fallback functionality

### Periodic Tasks
- Restart modem connection
- Update configuration
- Review SMS statistics
- Performance optimization

## Support

### Technical Support
- Phone: +382 67 028 666
- Email: jelena@frigosistemtodosijevic.me
- Documentation: This file and setup guide

### Development Support
- Code review and testing
- Feature enhancement requests
- Bug reports and fixes
- Performance optimization