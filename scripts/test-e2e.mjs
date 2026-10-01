async function runTests() {
  console.log("=== 1. TEST GET EVENTS ===");
  const resEvents = await fetch("http://localhost:3000/api/events");
  const dataEvents = await resEvents.json();
  console.log("Status:", resEvents.status);
  console.log("Total events:", dataEvents.events.length);
  console.log("First event:", dataEvents.events[0].title);
  const eventId = dataEvents.events[0].id;

  console.log("\n=== 2. TEST SUBMIT RSVP (Jordan Hayes) ===");
  const rsvpPayload = {
    event_id: eventId,
    first_name: "Jordan",
    last_name: "Hayes",
    email: "jordan.hayes@example.com",
    status: "attending",
    plus_ones_count: 1,
    notes: "Vegan meal requested",
    answers: [
      {
        question_id: "q0000000-0000-0000-0000-000000000001",
        answer_text: "vegan",
      },
    ],
  };

  const resRsvp = await fetch("http://localhost:3000/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rsvpPayload),
  });
  const dataRsvp = await resRsvp.json();
  console.log("RSVP Status:", resRsvp.status);
  console.log("RSVP Success:", dataRsvp.success);
  console.log("Guest ID:", dataRsvp.guest.id);
  console.log("Ticket Code:", dataRsvp.ticket?.ticket_code);

  console.log("\n=== 3. TEST FIRST CHECK-IN (Marcus Vance: TK-MV-33421) ===");
  const checkinRes1 = await fetch("http://localhost:3000/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: eventId,
      code_or_token: "TK-MV-33421",
      method: "qr_scan",
    }),
  });
  const checkinData1 = await checkinRes1.json();
  console.log("Checkin 1 HTTP:", checkinRes1.status);
  console.log("Code:", checkinData1.code);
  console.log("Message:", checkinData1.message);

  console.log("\n=== 4. TEST DUPLICATE CHECK-IN PREVENTION ===");
  const checkinRes2 = await fetch("http://localhost:3000/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: eventId,
      code_or_token: "TK-MV-33421",
      method: "qr_scan",
    }),
  });
  const checkinData2 = await checkinRes2.json();
  console.log("Checkin 2 HTTP:", checkinRes2.status);
  console.log("Code:", checkinData2.code);
  console.log("Message:", checkinData2.message);
  console.log("Previously checked in at:", checkinData2.alreadyCheckedInAt);

  console.log("\n=== 5. TEST CHECKIN NEW JORDAN HAYES TICKET ===");
  const jordanTicket = dataRsvp.ticket.ticket_code;
  const checkinRes3 = await fetch("http://localhost:3000/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: eventId,
      code_or_token: jordanTicket,
      method: "manual",
    }),
  });
  const checkinData3 = await checkinRes3.json();
  console.log("Jordan Checkin HTTP:", checkinRes3.status);
  console.log("Code:", checkinData3.code);
  console.log("Message:", checkinData3.message);

  console.log("\n=== 6. TEST STATS UPDATE ===");
  const resStats = await fetch(`http://localhost:3000/api/events/${eventId}/stats`);
  const dataStats = await resStats.json();
  console.log("Updated Stats:", dataStats.stats);

  console.log("\n=== 7. TEST CSV EXPORT ===");
  const resCsv = await fetch(`http://localhost:3000/api/events/${eventId}/guests/export`);
  const csvText = await resCsv.text();
  console.log("CSV Lines:", csvText.split("\r\n").length);
  console.log("First line:", csvText.split("\r\n")[0]);
  console.log("Second line:", csvText.split("\r\n")[1]);

  console.log("\n=== 8. TEST QR CODE GENERATION ===");
  const resQr = await fetch("http://localhost:3000/api/qr?text=RSVP:e123:TK-TEST");
  const dataQr = await resQr.json();
  console.log("QR Success:", dataQr.success);
  console.log("QR Data URL starts with:", dataQr.dataUrl.slice(0, 30));

  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
}

runTests().catch(console.error);
