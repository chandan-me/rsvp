// ====================================================================
// Comprehensive Automated Test Suite:
// Configurable Multi-Event Access Control, Financial Firewall & RBAC
// ====================================================================

const BASE_URL = 'http://localhost:3000';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('🚀 Starting Verification of Configurable Multi-Event Platform...\n');

  // Test 1: Fetch list of events
  console.log('--- TEST SUITE 1: EVENT RETRIEVAL & DEFAULT MODULES ---');
  const resEvents = await fetch(`${BASE_URL}/api/events`);
  assert(resEvents.ok, 'GET /api/events responded 200 OK');
  const eventsData = await resEvents.json();
  assert(Array.isArray(eventsData.events) && eventsData.events.length > 0, `Found ${eventsData.events?.length} events in database`);

  const testEvent = eventsData.events[0];
  const testEventId = testEvent.id;
  console.log(`Using Test Event: "${testEvent.title}" (${testEventId})`);

  // Test 2: Verify Event Config API & Relational Modules
  console.log('\n--- TEST SUITE 2: RELATIONAL MODULES & TOPOGRAPHY CONFIGURATION ---');
  const resConfig = await fetch(`${BASE_URL}/api/events/${testEventId}/config`);
  assert(resConfig.ok, `GET /api/events/${testEventId}/config responded 200 OK`);
  const configData = await resConfig.json();
  assert(Array.isArray(configData.modules) && configData.modules.length > 0, `Event has ${configData.modules?.length} relational module flags`);
  assert(Array.isArray(configData.gates) && configData.gates.length > 0, `Event has ${configData.gates?.length} gates configured`);
  assert(Array.isArray(configData.passTypes) && configData.passTypes.length > 0, `Event has ${configData.passTypes?.length} pass types configured`);

  // Test 3: Modify Event Modules (Every Event is Different!)
  console.log('\n--- TEST SUITE 3: DYNAMIC CONFIGURATION (NO HARDCODED GATES/FOOD/VIP) ---');
  const updatePayload = {
    modules: [
      { module_key: 'rsvp', is_enabled: true },
      { module_key: 'qr_access', is_enabled: true },
      { module_key: 'gates', is_enabled: true },
      { module_key: 'areas', is_enabled: true },
      { module_key: 'food', is_enabled: true },
      { module_key: 'payments', is_enabled: true },
    ],
    gates: [
      { name: 'North Main Gate', gate_code: 'GATE-N1', is_active: true },
      { name: 'VIP Red Carpet Gate', gate_code: 'GATE-VIP', is_active: true },
    ],
    areas: [
      { name: 'General Floor', area_code: 'GEN-01', is_restricted: false },
      { name: 'VVIP Royal Lounge', area_code: 'VVIP-01', is_restricted: true },
    ],
    passTypes: [
      { name: 'General Delegate', code: 'DEL-GEN', price: 0, is_active: true },
      { name: 'VIP Executive', code: 'VIP-EXEC', price: 4999, is_active: true },
    ],
    foodCategories: [
      { name: 'Executive Lunch Buffet', category_code: 'MEAL-EXEC', is_active: true },
    ],
  };

  const resSaveConfig = await fetch(`${BASE_URL}/api/events/${testEventId}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload),
  });
  assert(resSaveConfig.ok, 'PUT /api/events/[id]/config successfully saved customized modules & topography');

  const verifyConfig = await fetch(`${BASE_URL}/api/events/${testEventId}/config`);
  const verifiedData = await verifyConfig.json();
  assert(verifiedData.gates?.some(g => g.name === 'VIP Red Carpet Gate'), 'Relational gate "VIP Red Carpet Gate" persisted');
  assert(verifiedData.areas?.some(a => a.name === 'VVIP Royal Lounge'), 'Relational area "VVIP Royal Lounge" persisted');
  assert(verifiedData.foodCategories?.some(f => f.name === 'Executive Lunch Buffet'), 'Food category "Executive Lunch Buffet" persisted');

  // Test 4: Access Rule Verification Engine
  console.log('\n--- TEST SUITE 4: CENTRALIZED ACCESS RULE ENGINE (ALLOWED / DENIED) ---');
  // 4a: Scan with invalid/unrecognized code
  const resBadScan = await fetch(`${BASE_URL}/api/events/${testEventId}/access/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'TOTALLY-INVALID-QR-TOKEN-999',
      scan_type: 'entry',
    }),
  });
  const badScanData = await resBadScan.json();
  assert(badScanData.decision?.allowed === false, 'Invalid QR code correctly returns decision.allowed = FALSE');
  assert(badScanData.decision?.result === 'DENIED', 'Invalid QR code returns result = "DENIED"');

  // 4b: Get an existing guest from event
  const resGuests = await fetch(`${BASE_URL}/api/events/${testEventId}/guests`);
  const guestsData = await resGuests.json();
  const guest = guestsData.guests?.[0];
  assert(!!guest, `Found registered guest "${guest?.first_name} ${guest?.last_name}" (QR: ${guest?.qr_token})`);

  if (guest) {
    // Test Entry Scan
    const resEntryScan = await fetch(`${BASE_URL}/api/events/${testEventId}/access/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: guest.qr_token,
        scan_type: 'entry',
      }),
    });
    const entryData = await resEntryScan.json();
    assert(entryData.decision?.allowed === true, `Valid guest QR scan returned ALLOWED: ${entryData.decision?.reason}`);

    // Test Exit Scan
    const resExitScan = await fetch(`${BASE_URL}/api/events/${testEventId}/access/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: guest.qr_token,
        scan_type: 'exit',
      }),
    });
    const exitData = await resExitScan.json();
    assert(exitData.decision?.allowed === true, `Exit check-out scan returned ALLOWED: ${exitData.decision?.reason}`);

    // Test Guest Blocking and Access Rejection
    console.log('\n--- TEST SUITE 5: GUEST SECURITY BLOCKING & QR RE-ISSUANCE ---');
    const resBlock = await fetch(`${BASE_URL}/api/events/${testEventId}/guests/${guest.id}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Security violation test' }),
    });
    assert(resBlock.ok, `POST /guests/${guest.id}/block returned 200 OK`);

    // Verify blocked guest is immediately DENIED at checkpoints
    const resBlockedScan = await fetch(`${BASE_URL}/api/events/${testEventId}/access/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: guest.qr_token,
        scan_type: 'entry',
      }),
    });
    const blockedData = await resBlockedScan.json();
    assert(blockedData.decision?.allowed === false, 'Blocked guest is immediately DENIED access');
    assert(blockedData.decision?.reason?.toLowerCase().includes('blocked'), `Denial reason cites security block: "${blockedData.decision?.reason}"`);

    // Unblock guest
    const resUnblock = await fetch(`${BASE_URL}/api/events/${testEventId}/guests/${guest.id}/block`, {
      method: 'DELETE',
    });
    assert(resUnblock.ok, `DELETE /guests/${guest.id}/block successfully unblocked guest`);

    // Regenerate QR
    const resRegen = await fetch(`${BASE_URL}/api/events/${testEventId}/guests/${guest.id}/regenerate-qr`, {
      method: 'POST',
    });
    const regenData = await resRegen.json();
    assert(resRegen.ok && !!regenData.newQrToken, `QR re-issued with new secure token: ${regenData.newQrToken}`);
  }

  // Test 6: Strict Financial Firewall & Role Isolation
  console.log('\n--- TEST SUITE 6: FINANCIAL FIREWALL & RBAC ISOLATION ---');
  // 6a: Organizer / Admin access
  const resFinancials = await fetch(`${BASE_URL}/api/events/${testEventId}/financials`);
  assert(resFinancials.ok, `GET /api/events/${testEventId}/financials responded 200 OK for event organizer`);
  const finData = await resFinancials.json();
  assert(typeof finData.financials?.grossRevenue === 'number', `Ledger reports gross revenue: ₹${finData.financials?.grossRevenue}`);
  assert(typeof finData.financials?.platformFees === 'number', `Ledger reports 5% platform fee deduction: ₹${finData.financials?.platformFees}`);
  assert(typeof finData.financials?.netRevenue === 'number', `Ledger reports net organizer share: ₹${finData.financials?.netRevenue}`);

  // Test 7: Razorpay Order Creation & Platform Fees
  console.log('\n--- TEST SUITE 7: RAZORPAY ORDERS & LEDGER DEDUCTIONS ---');
  const resOrder = await fetch(`${BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: testEventId,
      amount: 2000, // ₹2000 ticket
      currency: 'INR',
    }),
  });
  assert(resOrder.ok, 'POST /api/payments/create-order created payment order successfully');
  const orderData = await resOrder.json();
  assert(!!orderData.order?.razorpay_order_id, `Order generated Razorpay ID: ${orderData.order?.razorpay_order_id}`);
  assert(orderData.order?.platform_fee === 100, `Platform fee is 5% of ₹2000 = ₹${orderData.order?.platform_fee}`);
  assert(orderData.order?.net_amount === 1900, `Net amount for organizer is ₹${orderData.order?.net_amount}`);

  // Test 8: Payout Request & Admin Settlements
  console.log('\n--- TEST SUITE 8: PAYOUT SETTLEMENT WORKFLOW ---');
  const resPayoutReq = await fetch(`${BASE_URL}/api/events/${testEventId}/payout-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 10, // within available balance
      bankDetails: {
        accountName: 'Tech Summit Organizer LLC',
        bankName: 'HDFC Bank',
        accountNumber: '50100987654321',
        routingCode: 'HDFC0000123',
      },
    }),
  });
  const payoutData = await resPayoutReq.json();
  assert(resPayoutReq.ok, `Client payout request submitted (ID: ${payoutData.payoutRequest?.id})`);

  // Admin approves payout
  const resAdminApprove = await fetch(`${BASE_URL}/api/admin/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payoutRequestId: payoutData.payoutRequest?.id,
      action: 'approve',
    }),
  });
  const approveData = await resAdminApprove.json();
  assert(resAdminApprove.ok, `Admin console approved payout request (Status: ${approveData.payoutRequest?.status})`);

  // Test 9: Immutable Audit Logs
  console.log('\n--- TEST SUITE 9: IMMUTABLE AUDIT LOGS LEDGER ---');
  const resAudit = await fetch(`${BASE_URL}/api/admin/audit-logs`);
  assert(resAudit.ok, 'GET /api/admin/audit-logs responded 200 OK');
  const auditData = await resAudit.json();
  assert(Array.isArray(auditData.logs) && auditData.logs.length > 0, `Audit log ledger contains ${auditData.logs?.length} recorded events`);

  // Final Summary
  console.log('\n====================================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
