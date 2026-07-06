import { eventsToIcs } from "../modules/calendar/calendar.utils";

describe("calendar.utils", () => {
  it("builds ICS export with events", () => {
    const ics = eventsToIcs([
      {
        id: "evt-1",
        title: "Demo call",
        description: "With Acme",
        location: "Zoom",
        startsAt: new Date("2026-07-10T10:00:00.000Z"),
        endsAt: new Date("2026-07-10T11:00:00.000Z"),
        status: "CONFIRMED",
      },
    ]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Demo call");
    expect(ics).toContain("LOCATION:Zoom");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("skips cancelled events in ICS export", () => {
    const ics = eventsToIcs([
      {
        id: "evt-2",
        title: "Cancelled",
        startsAt: new Date("2026-07-10T10:00:00.000Z"),
        endsAt: new Date("2026-07-10T11:00:00.000Z"),
        status: "CANCELLED",
      },
    ]);

    expect(ics).not.toContain("SUMMARY:Cancelled");
  });
});
