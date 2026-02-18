const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readVenues, readBookings, saveBookings } = require("../data/store");
const { emitBookingCreated } = require("../services/realtime");

const router = express.Router();

router.post("/", (req, res) => {
  const { venueId, clientName, clientPhone, requestedAt } = req.body;

  if (!venueId || !clientName || !clientPhone) {
    return res.status(400).json({ error: "venueId, clientName, clientPhone are required" });
  }

  const venues = readVenues();
  const venue = venues.find((v) => v.id === venueId);
  if (!venue) {
    return res.status(404).json({ error: "Venue not found" });
  }

  const booking = {
    id: uuidv4(),
    venueId,
    requestedAt: requestedAt || new Date().toISOString(),
    clientName,
    clientPhone,
    status: "pending_confirmation",
    createdAt: new Date().toISOString(),
  };

  const bookings = readBookings();
  bookings.push(booking);
  saveBookings(bookings);

  emitBookingCreated({
    bookingId: booking.id,
    venueId: booking.venueId,
    clientName: booking.clientName,
    status: booking.status,
  });

  return res.status(201).json({
    booking,
    pushHook: {
      type: "new_booking",
      sound: "taxi_order_ping",
    },
  });
});

router.get("/:id", (req, res) => {
  const bookings = readBookings();
  const booking = bookings.find((b) => b.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  return res.json({ booking });
});

module.exports = router;
