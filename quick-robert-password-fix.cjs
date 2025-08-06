const { Client } = require('pg');

async function fixPassword() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('📊 Povezan sa bazom...');

    // Check current password hash
    const currentResult = await client.query(
      'SELECT username, password FROM users WHERE username = $1',
      ['robert.ivezic@tehnoplus.me']
    );
    console.log('Trenutni hash:', currentResult.rows[0]?.password.substring(0, 50) + '...');

    // Generate new hash using simple crypto approach
    const crypto = require('crypto');
    const password = 'pass123';
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const newPasswordHash = `${hash}.${salt}`;

    console.log('Novi hash:', newPasswordHash.substring(0, 50) + '...');

    // Update password
    const updateResult = await client.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username',
      [newPasswordHash, 'robert.ivezic@tehnoplus.me']
    );

    if (updateResult.rowCount > 0) {
      console.log('✅ Password uspešno ažuriran!');
      console.log('Updated user:', updateResult.rows[0]);
    } else {
      console.log('❌ Nema ažuriranja');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

fixPassword();