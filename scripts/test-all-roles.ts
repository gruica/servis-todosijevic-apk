import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

interface TestResult {
  role: string;
  username: string;
  loginSuccess: boolean;
  canCreateService: boolean;
  canViewServices: boolean;
  canManageServices: boolean;
  specificTests: string[];
  errors: string[];
}

class RoleTester {
  private baseUrl = 'http://localhost:5000';
  private results: TestResult[] = [];

  async runCurl(command: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve) => {
      const process = spawn('curl', command);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({ stdout, stderr, code: code || 0 });
      });
    });
  }

  async testLogin(username: string, password: string): Promise<string | null> {
    const result = await this.runCurl([
      '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({ username, password }),
      '-c', `cookies_${username}.txt`,
      '-s',
      `${this.baseUrl}/api/login`
    ]);

    if (result.code === 0 && result.stdout.includes('"id"')) {
      return `cookies_${username}.txt`;
    }
    return null;
  }

  async testAdminRole(): Promise<TestResult> {
    const result: TestResult = {
      role: 'Administrator',
      username: 'testadmin',
      loginSuccess: false,
      canCreateService: false,
      canViewServices: false,
      canManageServices: false,
      specificTests: [],
      errors: []
    };

    try {
      // Test login
      const cookieFile = await this.testLogin('testadmin', 'admin123');
      result.loginSuccess = !!cookieFile;

      if (!cookieFile) {
        result.errors.push('Neuspešna prijava');
        return result;
      }

      // Test viewing services
      const servicesResult = await this.runCurl([
        '-X', 'GET',
        '-b', cookieFile,
        '-s',
        `${this.baseUrl}/api/services`
      ]);

      if (servicesResult.code === 0 && servicesResult.stdout.includes('[')) {
        result.canViewServices = true;
        result.specificTests.push('Može da vidi sve servise');
      }

      // Test creating service
      const createServiceResult = await this.runCurl([
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-b', cookieFile,
        '-d', JSON.stringify({
          clientId: 1,
          applianceId: 1,
          description: 'Test admin servis',
          technicianId: 1
        }),
        '-s',
        `${this.baseUrl}/api/services`
      ]);

      if (createServiceResult.code === 0 && createServiceResult.stdout.includes('"id"')) {
        result.canCreateService = true;
        result.specificTests.push('Može da kreira servise');
      }

      // Test user management
      const usersResult = await this.runCurl([
        '-X', 'GET',
        '-b', cookieFile,
        '-s',
        `${this.baseUrl}/api/users`
      ]);

      if (usersResult.code === 0 && usersResult.stdout.includes('[')) {
        result.canManageServices = true;
        result.specificTests.push('Može da upravlja korisnicima');
      }

    } catch (error) {
      result.errors.push(`Greška: ${error}`);
    }

    return result;
  }

  async testTechnicianRole(): Promise<TestResult> {
    const result: TestResult = {
      role: 'Serviser',
      username: 'testtech',
      loginSuccess: false,
      canCreateService: false,
      canViewServices: false,
      canManageServices: false,
      specificTests: [],
      errors: []
    };

    try {
      const cookieFile = await this.testLogin('testtech', 'tech123');
      result.loginSuccess = !!cookieFile;

      if (!cookieFile) {
        result.errors.push('Neuspešna prijava');
        return result;
      }

      // Test viewing assigned services
      const servicesResult = await this.runCurl([
        '-X', 'GET',
        '-b', cookieFile,
        '-s',
        `${this.baseUrl}/api/technician/services`
      ]);

      if (servicesResult.code === 0) {
        result.canViewServices = true;
        result.specificTests.push('Može da vidi dodeljene servise');
      }

      // Test updating service status
      const updateResult = await this.runCurl([
        '-X', 'PATCH',
        '-H', 'Content-Type: application/json',
        '-b', cookieFile,
        '-d', JSON.stringify({
          status: 'in_progress',
          technicianNotes: 'Test napomene'
        }),
        '-s',
        `${this.baseUrl}/api/services/1`
      ]);

      if (updateResult.code === 0) {
        result.canManageServices = true;
        result.specificTests.push('Može da ažurira status servisa');
      }

    } catch (error) {
      result.errors.push(`Greška: ${error}`);
    }

    return result;
  }

  async testCustomerRole(): Promise<TestResult> {
    const result: TestResult = {
      role: 'Klijent',
      username: 'testcustomer',
      loginSuccess: false,
      canCreateService: false,
      canViewServices: false,
      canManageServices: false,
      specificTests: [],
      errors: []
    };

    try {
      const cookieFile = await this.testLogin('testcustomer', 'customer123');
      result.loginSuccess = !!cookieFile;

      if (!cookieFile) {
        result.errors.push('Neuspešna prijava');
        return result;
      }

      // Test creating service request
      const createResult = await this.runCurl([
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-b', cookieFile,
        '-d', JSON.stringify({
          categoryId: 1,
          manufacturerId: 1,
          model: 'Test model',
          serialNumber: 'SN123',
          description: 'Test zahtev za servis'
        }),
        '-s',
        `${this.baseUrl}/api/customer/services`
      ]);

      if (createResult.code === 0 && createResult.stdout.includes('"id"')) {
        result.canCreateService = true;
        result.specificTests.push('Može da kreira zahteve za servis');
      }

      // Test viewing own services
      const servicesResult = await this.runCurl([
        '-X', 'GET',
        '-b', cookieFile,
        '-s',
        `${this.baseUrl}/api/customer/services`
      ]);

      if (servicesResult.code === 0) {
        result.canViewServices = true;
        result.specificTests.push('Može da vidi svoje servise');
      }

    } catch (error) {
      result.errors.push(`Greška: ${error}`);
    }

    return result;
  }

  async testBusinessPartnerRole(): Promise<TestResult> {
    const result: TestResult = {
      role: 'Poslovni partner',
      username: 'testpartner',
      loginSuccess: false,
      canCreateService: false,
      canViewServices: false,
      canManageServices: false,
      specificTests: [],
      errors: []
    };

    try {
      const cookieFile = await this.testLogin('testpartner', 'partner123');
      result.loginSuccess = !!cookieFile;

      if (!cookieFile) {
        result.errors.push('Neuspešna prijava');
        return result;
      }

      // Test creating service
      const createResult = await this.runCurl([
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-b', cookieFile,
        '-d', JSON.stringify({
          clientFullName: 'Test BP Klijent',
          clientPhone: '069123456',
          clientEmail: 'test@example.com',
          categoryId: '1',
          manufacturerId: '1',
          model: 'Test model',
          serialNumber: 'SN456',
          description: 'Test servis od BP'
        }),
        '-s',
        `${this.baseUrl}/api/business/services`
      ]);

      if (createResult.code === 0 && createResult.stdout.includes('"id"')) {
        result.canCreateService = true;
        result.specificTests.push('Može da kreira servise za klijente');
      }

      // Test viewing own services
      const servicesResult = await this.runCurl([
        '-X', 'GET',
        '-b', cookieFile,
        '-s',
        `${this.baseUrl}/api/business/services`
      ]);

      if (servicesResult.code === 0) {
        result.canViewServices = true;
        result.specificTests.push('Može da vidi svoje servise');
      }

    } catch (error) {
      result.errors.push(`Greška: ${error}`);
    }

    return result;
  }

  async runAllTests(): Promise<void> {
    console.log('=== TESTIRANJE FUNKCIONALNOSTI SVIH ULOGA ===\n');

    // Test all roles
    this.results.push(await this.testAdminRole());
    await sleep(1000);
    
    this.results.push(await this.testTechnicianRole());
    await sleep(1000);
    
    this.results.push(await this.testCustomerRole());
    await sleep(1000);
    
    this.results.push(await this.testBusinessPartnerRole());

    // Generate report
    this.generateReport();
  }

  generateReport(): void {
    console.log('\n=== IZVEŠTAJ O TESTIRANJU ULOGA ===\n');

    for (const result of this.results) {
      console.log(`🔍 ${result.role.toUpperCase()} (${result.username})`);
      console.log(`   Prijava: ${result.loginSuccess ? '✅ Uspešna' : '❌ Neuspešna'}`);
      console.log(`   Kreiranje servisa: ${result.canCreateService ? '✅ Može' : '❌ Ne može'}`);
      console.log(`   Pregled servisa: ${result.canViewServices ? '✅ Može' : '❌ Ne može'}`);
      console.log(`   Upravljanje: ${result.canManageServices ? '✅ Može' : '❌ Ne može'}`);
      
      if (result.specificTests.length > 0) {
        console.log('   Specifični testovi:');
        result.specificTests.forEach(test => console.log(`     ✓ ${test}`));
      }
      
      if (result.errors.length > 0) {
        console.log('   Greške:');
        result.errors.forEach(error => console.log(`     ❌ ${error}`));
      }
      
      console.log('');
    }

    // Summary
    const successful = this.results.filter(r => r.loginSuccess).length;
    const total = this.results.length;
    
    console.log(`📊 SAŽETAK: ${successful}/${total} uloga uspešno testirano`);
    console.log(`🔐 Autentifikacija: ${successful}/${total} uspešno`);
    
    const canCreate = this.results.filter(r => r.canCreateService).length;
    const canView = this.results.filter(r => r.canViewServices).length;
    const canManage = this.results.filter(r => r.canManageServices).length;
    
    console.log(`📝 Kreiranje servisa: ${canCreate}/${total} uloga`);
    console.log(`👁️  Pregled servisa: ${canView}/${total} uloga`);
    console.log(`⚙️  Upravljanje: ${canManage}/${total} uloga`);
  }
}

async function main() {
  const tester = new RoleTester();
  await tester.runAllTests();
  process.exit(0);
}

main().catch(console.error);