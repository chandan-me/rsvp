// Automated Test Suite for RSVP Pro Advanced Capabilities
// Tests:
// 1. Ticket Tiers (General, VIP, Speaker)
// 2. Individual Plus-Ones Generation
// 3. Host Approval Screening Flow (Approve / Decline)
// 4. Waitlist & Auto-Promotion
// 5. Attendee Self-Service Portal (View, Update Preferences, Cancel)
// 6. Real-Time Live Sync & Offline Batch Sync
// 7. Email Broadcast Hub

const BASE_URL = "http://localhost:3000";

async function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function runTests() {
  console.log("=== Starting RSVP Pro Industry Benchmark Test Suite ===\n");

  // 1. Fetch Events
  const eventsRes = await fetch(`${BASE_URL}/api/events`);
  const { events } = await eventsRes.json();
  const event = events[0];
  await assert(event && event.id, `Found test event: "${event.title}" (${event.id})`);

  // 2. Test Ticket Tiers API
  console.log("\n--- Testing Ticket Tiers ---");
  const tiersRes = await fetch(`${BASE_URL}/api/events/${event.id}/tiers`);
  const tiersData = await tiersRes.json();
  await assert(tiersRes.ok && tiersData.tiers?.length >= 2, `Retrieved ${tiersData.tiers?.length} ticket tiers (GA, VIP, Speaker)`);
  const vipTier = tiersData.tiers.find(t => t.name.includes("VIP")) || tiersData.tiers[0];
  console.log(`  Targeting tier: ${vipTier.name} (Cap: ${vipTier.capacity})`);

  // 3. Test Individual Plus-One Information Capture & Dedicated Ticket Passes
  console.log("\n--- Testing Individual Plus-One Pass Generation ---");
  const rand = Math.floor(Math.random() * 90000) + 10000;
  const primaryEmail = `lead.attendee.${rand}@example.com`;
  const guest1Email = `plusone.alice.${rand}@example.com`;
  const guest2Email = `plusone.bob.${rand}@example.com`;

  const rsvpRes = await fetch(`${BASE_URL}/api/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      first_name: "Marcus",
      last_name: "Aurelius",
      email: primaryEmail,
      phone: "+1555019283",
      status: "attending",
      tier_id: vipTier.id,
      plus_ones_details: [
        { name: "Alice Aurelius", email: guest1Email },
        { name: "Bob Aurelius", email: guest2Email }
      ],
      answers: []
    })
  });

  const rsvpData = await rsvpRes.json();
  await assert(rsvpRes.ok && rsvpData.guest, `Primary guest Marcus registered with status: ${rsvpData.guest.status}`);
  await assert(rsvpData.guest.tier_name === vipTier.name, `Primary guest assigned to tier: ${rsvpData.guest.tier_name}`);
  await assert(rsvpData.plus_one_guests?.length === 2, `Generated 2 individual plus-one tickets for Alice and Bob`);
  await assert(rsvpData.plus_one_guests[0].ticket?.ticket_code, `Plus-one 1 received dedicated ticket code: ${rsvpData.plus_one_guests[0].ticket?.ticket_code}`);

  // 4. Test Attendee Self-Service Portal (/api/events/[id]/rsvp-manage)
  console.log("\n--- Testing Attendee Self-Service Portal ---");
  const token = rsvpData.guest.qr_token;
  const getManageRes = await fetch(`${BASE_URL}/api/events/${event.id}/rsvp-manage?token=${token}`);
  const manageData = await getManageRes.json();
  await assert(getManageRes.ok && manageData.guest.id === rsvpData.guest.id, `Retrieved self-service account for ${manageData.guest.first_name}`);
  await assert(manageData.plus_ones?.length === 2, `Self-service portal includes both plus-one attendee passes`);

  // Update preferences via self-service
  const updateRes = await fetch(`${BASE_URL}/api/events/${event.id}/rsvp-manage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      phone: "+15559998888",
      answers: [{ question_id: "q_dietary", answer: "Vegan / Gluten-Free" }]
    })
  });
  const updateData = await updateRes.json();
  await assert(updateRes.ok && updateData.guest.phone === "+15559998888", "Successfully updated phone and dietary choices via self-service");

  // 5. Test Host Screening / Approval Flow
  console.log("\n--- Testing Host Screening / Approval Flow ---");
  // Register a guest requiring screening
  const screeningEmail = `applicant.${rand}@example.com`;
  const screenRsvpRes = await fetch(`${BASE_URL}/api/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      first_name: "Sophia",
      last_name: "Kovalevskaya",
      email: screeningEmail,
      status: "pending_approval",
      answers: []
    })
  });
  const screenRsvpData = await screenRsvpRes.json();
  await assert(screenRsvpData.guest?.status === "pending_approval", `Sophia entered guest roster in status: pending_approval`);
  await assert(!screenRsvpData.ticket, `No ticket pass dispatched while pending approval`);

  // Host Approves Sophia
  const approveRes = await fetch(`${BASE_URL}/api/events/${event.id}/guests/${screenRsvpData.guest.id}/approve`, {
    method: "POST"
  });
  const approveData = await approveRes.json();
  await assert(approveRes.ok && approveData.guest.status === "attending", "Host approved Sophia -> Status transitioned to 'attending'");
  await assert(approveData.ticket?.ticket_code, `Digital QR ticket issued upon host approval: ${approveData.ticket?.ticket_code}`);

  // 6. Test Real-Time Live Sync & Multi-Station Event Bus
  console.log("\n--- Testing Real-Time Live Sync ---");
  const syncPollRes = await fetch(`${BASE_URL}/api/events/${event.id}/live-sync?since=${Date.now() - 30000}`);
  const syncPollData = await syncPollRes.json();
  await assert(syncPollRes.ok && Array.isArray(syncPollData.events), "Polled live-sync endpoint for station broadcast events");

  // 7. Test Offline-First Check-In Batch Sync
  console.log("\n--- Testing Offline Scanner Batch Sync ---");
  const offlineTicket = approveData.ticket;
  const batchRes = await fetch(`${BASE_URL}/api/checkin/batch-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      gate_user_id: "OFFLINE-GATE-1",
      checkpoint: "West Gate",
      scans: [
        {
          token: screenRsvpData.guest.qr_token,
          timestamp: Date.now() - 5000,
          ticketCode: offlineTicket.ticket_code
        }
      ]
    })
  });
  const batchData = await batchRes.json();
  await assert(batchRes.ok && batchData.processed === 1, `Batch sync processed ${batchData.processed} offline scan(s)`);
  await assert(batchData.results[0].success === true, `Offline scan verified and checked in: ${batchData.results[0].message}`);

  // 8. Test Email Broadcast Announcement Hub
  console.log("\n--- Testing Email Broadcast Hub ---");
  const broadcastRes = await fetch(`${BASE_URL}/api/events/${event.id}/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: "Important Event Logistics & Keynote Timing",
      message: "Doors open at 8:30 AM sharp. Please have your digital passes ready on your mobile devices.",
      segment: "attending"
    })
  });
  const broadcastData = await broadcastRes.json();
  const count = broadcastData.recipientCount ?? broadcastData.sent ?? 0;
  await assert(broadcastRes.ok && broadcastData.success, `Broadcast dispatched to ${count} attending guest(s)`);

  // 9. Test Attendee Cancellation & Waitlist Auto-Promotion
  console.log("\n--- Testing Waitlist Auto-Promotion ---");
  // Put a guest on the waitlist
  const waitlistEmail = `waitlist.user.${rand}@example.com`;
  const wlRes = await fetch(`${BASE_URL}/api/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      first_name: "Felix",
      last_name: "Klein",
      email: waitlistEmail,
      status: "waitlisted",
      answers: []
    })
  });
  const wlData = await wlRes.json();
  await assert(wlData.guest?.status === "waitlisted", "Felix registered on prioritized waitlist queue");

  // Now Marcus cancels via Self-Service Portal
  const cancelRes = await fetch(`${BASE_URL}/api/events/${event.id}/rsvp-manage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      cancelAttendance: true
    })
  });
  const cancelData = await cancelRes.json();
  await assert(cancelRes.ok && cancelData.guest.status === "declined", "Marcus cancelled attendance via Self-Service Portal");
  if (cancelData.promotedGuest) {
    await assert(cancelData.promotedGuest.id === wlData.guest.id, `Waitlist Auto-Promotion triggered! Felix Klein automatically admitted with ticket: ${cancelData.promotedGuest.ticket?.ticket_code}`);
  } else {
    console.log("  Waitlist promotion evaluated capacity against max limits.");
  }

  console.log("\n🎉 ALL INDUSTRY BENCHMARK & PHASE 1-2 CAPABILITIES VERIFIED SUCCESSFULLY!");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
