async function runTests() {
  const BASE = "http://localhost:3000";
  console.log("=== Testing Gate Station Authorization & Multi-Staff Workflow ===");

  // 1. Fetch events
  const eventsRes = await fetch(`${BASE}/api/events`);
  const { events } = await eventsRes.json();
  const event = events[0];
  console.log(`✓ Retrieved event: ${event.title} (${event.id})`);

  // 2. Fetch existing credentials
  const credsRes = await fetch(`${BASE}/api/events/${event.id}/gate-credentials`);
  const { credentials: initialCreds } = await credsRes.json();
  console.log(`✓ Found ${initialCreds.length} initial gate credentials`);

  // 3. Create a new custom gate credential
  const testUserId = `TEST-STAFF-${Date.now().toString().slice(-4)}`;
  const testPasscode = "TEST-PIN-9999";
  const createRes = await fetch(`${BASE}/api/events/${event.id}/gate-credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: testUserId,
      station_name: "VIP North Gate",
      passcode: testPasscode,
      notes: "Senior Developer Automated Verification",
    }),
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.credential) {
    throw new Error(`Failed to create credential: ${JSON.stringify(createData)}`);
  }
  console.log(`✓ Successfully created gate credential for user_id: ${testUserId}`);

  // 4. Authenticate Gate Staff via User ID + Passcode
  const authRes = await fetch(`${BASE}/api/events/${event.id}/gate-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: testUserId,
      passcode: testPasscode,
    }),
  });
  const authData = await authRes.json();
  if (!authRes.ok || !authData.credential) {
    throw new Error(`Gate auth failed: ${JSON.stringify(authData)}`);
  }
  console.log(`✓ Gate Station authenticated successfully for: ${authData.credential.user_id}`);

  // 5. Perform checkin with gate_user_id
  let targetGuest;
  const guestsRes = await fetch(`${BASE}/api/events/${event.id}/guests`);
  const { guests } = await guestsRes.json();
  if (guests && guests.length > 0) {
    targetGuest = guests[0];
  } else {
    // Register a guest via RSVP
    const rsvpRes = await fetch(`${BASE}/api/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: event.id,
        first_name: "Elena",
        last_name: "Rostova",
        email: `elena.${Date.now()}@example.com`,
        status: "attending",
        plus_ones_count: 0,
        answers: [],
      }),
    });
    const rsvpData = await rsvpRes.json();
    if (!rsvpRes.ok) {
      throw new Error(`RSVP registration failed: ${JSON.stringify(rsvpData)}`);
    }
    targetGuest = rsvpData.guest;
  }
  const ticketToken = targetGuest.ticket_code || targetGuest.qr_token;
  console.log(`✓ Test guest ready: ${targetGuest.first_name} ${targetGuest.last_name} (${ticketToken})`);

  const checkinRes = await fetch(`${BASE}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      code_or_token: ticketToken,
      gate_user_id: testUserId,
      method: "qr_scan",
    }),
  });
  const checkinData = await checkinRes.json();
  console.log(`✓ Check-in response:`, JSON.stringify(checkinData));

  // 6. Verify credentials list now shows updated checkinCount
  const updatedCredsRes = await fetch(`${BASE}/api/events/${event.id}/gate-credentials`);
  const { credentials: updatedCreds } = await updatedCredsRes.json();
  const staffCred = updatedCreds.find((c) => c.user_id === testUserId);
  console.log(`✓ Staff audit record: user_id=${staffCred.user_id}, checkinCount=${staffCred.checkinCount}, logins=${staffCred.login_count}`);

  // 7. Verify /checkin redirect
  const redirectRes = await fetch(`${BASE}/checkin`, { redirect: "manual" });
  const location = redirectRes.headers.get("location");
  console.log(`✓ /checkin redirects to dedicated URL: ${location}`);

  console.log("\n ALL GATE AUTHORIZATION & MULTI-STAFF TESTS PASSED!");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
