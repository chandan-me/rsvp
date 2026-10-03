async function runTests() {
  const BASE = "http://localhost:3000";
  console.log("==================================================================");
  console.log("=== Testing Station Checkpoint Security & Multi-Section Engine ===");
  console.log("==================================================================");

  // 1. Fetch events
  const eventsRes = await fetch(`${BASE}/api/events`);
  const { events } = await eventsRes.json();
  const event = events[0];
  console.log(`✓ Retrieved event: "${event.title}" (${event.id})`);

  // 2. Fetch existing credentials
  const credsRes = await fetch(`${BASE}/api/events/${event.id}/gate-credentials`);
  const { credentials: initialCreds } = await credsRes.json();
  console.log(`✓ Found ${initialCreds.length} configured credentials:`);
  initialCreds.forEach((c) => {
    console.log(`  - [${c.section_type || "gate"}] ${c.user_id} (${c.station_name})`);
  });

  // 3. Test Station Staff Universal Login (/api/events/${event.id}/gate-auth)
  console.log("\n--- Testing Universal Station Staff Login ---");
  const gateLoginRes = await fetch(`${BASE}/api/events/${event.id}/gate-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: "GBH-dec-2026-GATE-01",
      passcode: "GATE-4821",
    }),
  });
  const gateLoginData = await gateLoginRes.json();
  if (!gateLoginRes.ok || !gateLoginData.success) {
    throw new Error(`Gate staff login failed: ${JSON.stringify(gateLoginData)}`);
  }
  console.log(`✓ Station Login successful for Gate Staff: ${gateLoginData.credential.user_id}`);
  console.log(`  Event: ${gateLoginData.eventTitle} | Station: ${gateLoginData.credential.station_name}`);

  const foodLoginRes = await fetch(`${BASE}/api/events/${event.id}/gate-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: "GBH-dec-2026-FOOD-01",
      passcode: "FOOD-2026",
    }),
  });
  const foodLoginData = await foodLoginRes.json();
  if (!foodLoginRes.ok || !foodLoginData.success) {
    throw new Error(`Food staff login failed: ${JSON.stringify(foodLoginData)}`);
  }
  console.log(`✓ Station Login successful for Food Staff: ${foodLoginData.credential.user_id}`);
  console.log(`  Station: ${foodLoginData.credential.station_name} (${foodLoginData.credential.section_type})`);

  // 4. Create new section-specific station credentials
  console.log("\n--- Creating New Section-Specific Station Logins ---");
  const customSectionRes = await fetch(`${BASE}/api/events/${event.id}/gate-credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: `GBH-dec-2026-VIP-TEST`,
      station_name: "VIP Hacker Lounge Reception",
      section_type: "vip_lounge",
      passcode: "VIP-SECRET-8888",
      notes: "VIP Area Tablet Station",
    }),
  });
  const customSectionData = await customSectionRes.json();
  if (!customSectionRes.ok || !customSectionData.credential) {
    throw new Error(`Failed to create VIP station credential: ${JSON.stringify(customSectionData)}`);
  }
  console.log(`✓ Created station login: ${customSectionData.credential.user_id} [${customSectionData.credential.section_type}]`);

  // 5. Test Multi-Station Check-In Flow (Gate -> Food -> VIP Lounge)
  console.log("\n--- Testing Multi-Station Check-In Flow with Same Attendee ---");
  // Register a test guest with dietary preferences
  const testEmail = `builder.${Date.now()}@google.com`;
  const rsvpRes = await fetch(`${BASE}/api/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      first_name: "Marcus",
      last_name: "Vance",
      email: testEmail,
      company: "Google DeepMind",
      job_title: "AI Engineer",
      status: "attending",
      plus_ones_count: 0,
      answers: [
        {
          question_id: "GBH-dec-2026-Q1",
          answer_text: "Vegan & Gluten-Free",
        },
      ],
    }),
  });
  const rsvpData = await rsvpRes.json();
  if (!rsvpRes.ok || !rsvpData.guest) {
    throw new Error(`RSVP failed: ${JSON.stringify(rsvpData)}`);
  }
  const guest = rsvpData.guest;
  const ticketCode = rsvpData.ticket?.ticket_code || guest.qr_token;
  console.log(`✓ Registered attendee: ${guest.first_name} ${guest.last_name} (${ticketCode})`);

  // Station 1: Main Gate Check-In
  const gateCheckin = await fetch(`${BASE}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      code_or_token: ticketCode,
      gate_user_id: "GBH-dec-2026-GATE-01",
      checkpoint: "Main Gate Entrance",
      method: "manual",
    }),
  });
  const gateCheckinData = await gateCheckin.json();
  if (!gateCheckin.ok || !gateCheckinData.success) {
    throw new Error(`Main gate checkin failed: ${JSON.stringify(gateCheckinData)}`);
  }
  console.log(`✓ 1. MAIN GATE Check-In: SUCCESS! Station: "${gateCheckinData.checkin.checkpoint}"`);

  // Station 2: Food & Catering Check-In (Same Guest!)
  const foodCheckin = await fetch(`${BASE}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      code_or_token: ticketCode,
      gate_user_id: "GBH-dec-2026-FOOD-01",
      checkpoint: "Food & Catering",
      method: "manual",
    }),
  });
  const foodCheckinData = await foodCheckin.json();
  if (!foodCheckin.ok || !foodCheckinData.success) {
    throw new Error(`Food & Catering checkin failed: ${JSON.stringify(foodCheckinData)}`);
  }
  console.log(`✓ 2. FOOD & CATERING Check-In: SUCCESS! Dietary Note: "${foodCheckinData.dietary_restriction || 'Standard'}"`);

  // Station 3: VIP Lounge Check-In (Same Guest!)
  const vipCheckin = await fetch(`${BASE}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      code_or_token: ticketCode,
      gate_user_id: "GBH-dec-2026-VIP-TEST",
      checkpoint: "VIP Lounge",
      method: "manual",
    }),
  });
  const vipCheckinData = await vipCheckin.json();
  if (!vipCheckin.ok || !vipCheckinData.success) {
    throw new Error(`VIP Lounge checkin failed: ${JSON.stringify(vipCheckinData)}`);
  }
  console.log(`✓ 3. VIP LOUNGE Check-In: SUCCESS! Tier: "${vipCheckinData.ticket_tier || 'General'}"`);

  // Station 4: Repeat Check-In at Main Gate (Should identify duplicate for Main Gate)
  const duplicateGateCheckin = await fetch(`${BASE}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      code_or_token: ticketCode,
      gate_user_id: "GBH-dec-2026-GATE-01",
      checkpoint: "Main Gate Entrance",
      method: "manual",
    }),
  });
  const dupData = await duplicateGateCheckin.json();
  if (dupData.success) {
    throw new Error(`Duplicate gate check-in was incorrectly allowed: ${JSON.stringify(dupData)}`);
  }
  console.log(`✓ 4. DUPLICATE CHECK-IN PREVENTED: Successfully blocked re-entry at Main Gate ("${dupData.error}")`);

  // 6. Check Section Stats API (/api/events/[id]/station-stats)
  console.log("\n--- Checking Real-Time Section Stats API ---");
  const statsRes = await fetch(`${BASE}/api/events/${event.id}/station-stats`);
  const statsData = await statsRes.json();
  if (!statsRes.ok || !statsData.success) {
    throw new Error(`Station stats failed: ${JSON.stringify(statsData)}`);
  }
  console.log(`✓ Station Stats API Output:`, JSON.stringify(statsData.stats, null, 2));

  console.log("\n==================================================================");
  console.log("🎉 ALL MULTI-STATION CHECKPOINT & AUTH TESTS PASSED FLAWLESSLY!");
  console.log("==================================================================");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
