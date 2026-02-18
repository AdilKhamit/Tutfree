const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  readVenues,
  readClaims,
  saveClaims,
  readBusinessAccounts,
  saveBusinessAccounts,
  readLiveStatuses,
  saveLiveStatuses,
  readBookings,
  saveBookings,
} = require("../data/store");
const { emitStatusUpdated, emitBookingDecision } = require("../services/realtime");

const router = express.Router();

router.post("/auth/mock", (req, res) => {
  const { ownerName, phone } = req.body;
  if (!ownerName || !phone) {
    return res.status(400).json({ error: "ownerName and phone are required" });
  }

  const accounts = readBusinessAccounts();
  const account = {
    id: uuidv4(),
    ownerName,
    phone,
    createdAt: new Date().toISOString(),
  };

  accounts.push(account);
  saveBusinessAccounts(accounts);

  return res.status(201).json({ account });
});

router.get("/search-2gis", (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const venues = readVenues();
  const filtered = venues.filter((v) => {
    if (!q) return true;
    return v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q);
  });

  return res.json({ items: filtered });
});

router.post("/claim-point", (req, res) => {
  const { accountId, twoGisId } = req.body;

  if (!accountId || !twoGisId) {
    return res.status(400).json({ error: "accountId and twoGisId are required" });
  }

  const claims = readClaims();
  const claim = {
    id: uuidv4(),
    accountId,
    twoGisId,
    status: "verified",
    createdAt: new Date().toISOString(),
  };

  claims.push(claim);
  saveClaims(claims);

  return res.status(201).json({ claim });
});

router.put("/:twoGisId/live-status", (req, res) => {
  const { twoGisId } = req.params;
  const { mode, nextAvailableInMinutes, actorAccountId } = req.body;

  if (!["free_now", "busy", "next_window"].includes(mode)) {
    return res.status(400).json({ error: "mode must be free_now|busy|next_window" });
  }

  const statuses = readLiveStatuses();
  const current = statuses.find((s) => s.twoGisId === twoGisId);

  const payload = {
    twoGisId,
    mode,
    nextAvailableInMinutes:
      mode === "next_window" ? Number(nextAvailableInMinutes || 30) : null,
    actorAccountId: actorAccountId || null,
    updatedAt: new Date().toISOString(),
  };

  if (current) {
    Object.assign(current, payload);
  } else {
    statuses.push(payload);
  }

  saveLiveStatuses(statuses);
  emitStatusUpdated(payload);

  return res.json({ status: payload });
});

router.get("/:twoGisId/bookings", (req, res) => {
  const bookings = readBookings()
    .filter((x) => x.venueId === req.params.twoGisId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return res.json({ items: bookings });
});

router.post("/bookings/:bookingId/decision", (req, res) => {
  const { decision } = req.body;
  if (!["confirm", "reject"].includes(decision)) {
    return res.status(400).json({ error: "decision must be confirm|reject" });
  }

  const bookings = readBookings();
  const booking = bookings.find((x) => x.id === req.params.bookingId);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  booking.status = decision === "confirm" ? "confirmed" : "rejected";
  booking.decidedAt = new Date().toISOString();

  saveBookings(bookings);
  emitBookingDecision({
    bookingId: booking.id,
    venueId: booking.venueId,
    status: booking.status,
  });

  return res.json({ booking });
});

module.exports = router;
