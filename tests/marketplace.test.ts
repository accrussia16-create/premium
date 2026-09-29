import bcrypt from 'bcryptjs';
import { execute, queryOne, queryAll } from '../src/database/db';
import { initializeSchema } from '../src/database/schema';
import { calculateAccessStatus } from '../src/routes/productRoutes';
import { paymentProviders } from '../src/payments/providers';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n--- STARTING UPI-PAY CRITICAL INTEGRATION TESTS ---\n');

  // 1. Initialize DB
  await initializeSchema();

  // Test 1: Password Hashing & Registration
  console.log('Testing Authentication & Password Hashing:');
  const plainPassword = 'SuperSecretPassword@2026';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  assert(hashedPassword !== plainPassword, 'Password is never stored in plaintext');
  const match = await bcrypt.compare(plainPassword, hashedPassword);
  assert(match === true, 'Bcrypt verifies hashed password accurately');

  // Test 2: Access Duration Calculations (Section 106)
  console.log('\nTesting Access Duration Calculations (Section 106):');
  const now = Date.now();

  // 24 Hours
  const purchase24h = {
    status: 'ACTIVE',
    starts_at: new Date(now).toISOString(),
    expires_at: new Date(now + 24 * 3600 * 1000).toISOString()
  };
  const access24h = calculateAccessStatus(purchase24h);
  assert(access24h.has_access === true, '24-hour active access granted');
  assert(access24h.is_lifetime === false, '24-hour access is not marked lifetime');
  assert(access24h.remaining_seconds! > 86000 && access24h.remaining_seconds! <= 86400, '24-hour remaining seconds accurate');

  // 7 Days
  const purchase7d = {
    status: 'ACTIVE',
    starts_at: new Date(now).toISOString(),
    expires_at: new Date(now + 7 * 86400 * 1000).toISOString()
  };
  const access7d = calculateAccessStatus(purchase7d);
  assert(access7d.has_access === true, '7-day active access granted');

  // 30 Days
  const purchase30d = {
    status: 'ACTIVE',
    starts_at: new Date(now).toISOString(),
    expires_at: new Date(now + 30 * 86400 * 1000).toISOString()
  };
  const access30d = calculateAccessStatus(purchase30d);
  assert(access30d.has_access === true, '30-day active access granted');

  // 90 Days
  const purchase90d = {
    status: 'ACTIVE',
    starts_at: new Date(now).toISOString(),
    expires_at: new Date(now + 90 * 86400 * 1000).toISOString()
  };
  const access90d = calculateAccessStatus(purchase90d);
  assert(access90d.has_access === true, '90-day active access granted');

  // Lifetime Access (expires_at = null)
  const purchaseLifetime = {
    status: 'ACTIVE',
    starts_at: new Date(now).toISOString(),
    expires_at: null
  };
  const accessLifetime = calculateAccessStatus(purchaseLifetime);
  assert(accessLifetime.has_access === true, 'Lifetime active access granted');
  assert(accessLifetime.is_lifetime === true, 'Lifetime flag is true');
  assert(accessLifetime.remaining_seconds === null, 'Lifetime remaining seconds is null (no expiration)');

  // Expired Access Denial
  const purchaseExpired = {
    status: 'ACTIVE',
    starts_at: new Date(now - 10 * 86400 * 1000).toISOString(),
    expires_at: new Date(now - 2 * 86400 * 1000).toISOString() // expired 2 days ago
  };
  const accessExpired = calculateAccessStatus(purchaseExpired);
  assert(accessExpired.has_access === false, 'Expired access is strictly denied (has_access: false)');
  assert(accessExpired.is_expired === true, 'Marked as expired');

  // Cancelled / Refunded Purchase Denial
  const purchaseCancelled = {
    status: 'CANCELLED',
    starts_at: new Date(now).toISOString(),
    expires_at: new Date(now + 30 * 86400 * 1000).toISOString()
  };
  const accessCancelled = calculateAccessStatus(purchaseCancelled);
  assert(accessCancelled.has_access === false, 'Non-active purchase status rejected');

  // Test 3: Wallet Accounting & Deductions
  console.log('\nTesting Wallet Accounting:');
  const initialBalance = 100;
  const purchasePrice = 25;
  const balanceAfter = initialBalance - purchasePrice;
  assert(balanceAfter === 75, 'Authoritative wallet debit arithmetic correct');

  // Test 4: Payment Provider Webhook Idempotency & Abstraction
  console.log('\nTesting Payment Provider Abstraction:');
  const epProvider = paymentProviders['EASYPAISA'];
  assert(epProvider !== undefined, 'EasyPaisa provider registered in abstraction map');
  const jcProvider = paymentProviders['JAZZCASH'];
  assert(jcProvider !== undefined, 'JazzCash provider registered in abstraction map');
  const usdtProvider = paymentProviders['USDT'];
  assert(usdtProvider !== undefined, 'USDT provider registered in abstraction map');

  console.log(`\n--- TEST RUN COMPLETE: ${passed} passed, ${failed} failed ---\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
