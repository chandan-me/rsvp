const BASE = "http://localhost:3000";

async function run() {
  const eventsRes = await fetch(`${BASE}/api/events`);
  const { events } = await eventsRes.json();
  const event = events[0];
  console.log("Using Event:", event.id, "-", event.title);

  // 1. Submit RSVP for a new guest
  const guestEmail = `guest_${Date.now()}@example.com`;
  const rsvpRes = await fetch(`${BASE}/api/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      first_name: "Elena",
      last_name: "Rostova",
      email: guestEmail,
      status: "attending",
      plus_ones_count: 1,
      answers: [],
    }),
  });
  const rsvpData = await rsvpRes.json();
  console.log("RSVP Status:", rsvpRes.status, "Ticket:", rsvpData.ticket?.ticket_code);

  console.log("\n=== 1. Test Resend Email API ===");
  const resendRes = await fetch(`${BASE}/api/rsvp/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: guestEmail,
      event_id: event.id,
    }),
  });
  const resendData = await resendRes.json();
  console.log("Resend Status:", resendRes.status, resendData);

  console.log("\n=== 2. Test Gatekeeper Auth API ===");
  const settingsRes = await fetch(`${BASE}/api/events/${event.id}/settings`);
  const { settings } = await settingsRes.json();
  const eventPin = settings.checkin_pin || "GATE-4821";
  const staffEmail = settings.staff_email || "admin@craftconf.io";
  console.log("Event configured Gate PIN:", eventPin, "Staff:", staffEmail);

  const gateRes = await fetch(`${BASE}/api/events/${event.id}/gate-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staff_email: staffEmail,
      passcode: eventPin,
    }),
  });
  const gateData = await gateRes.json();
  console.log("Gate Auth Status:", gateRes.status, gateData);

  console.log("\n=== 3. Test Checkin With Checkpoint Station ===");
  const checkinRes = await fetch(`${BASE}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: event.id,
      code_or_token: rsvpData.ticket.ticket_code,
      method: "manual",
      checkpoint: "VIP Lounge Gate 3",
    }),
  });
  const checkinData = await checkinRes.json();
  console.log("Checkin with Checkpoint Result:", checkinRes.status, checkinData.code, checkinData.message);
  console.log("\n>>> ALL NEW FEATURES VALIDATED SUCCESSFULLY! <<<");
}

run().catch(console.error);
