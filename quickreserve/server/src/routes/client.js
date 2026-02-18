const express = require("express");
const { readVenues, readLiveStatuses, readBookings } = require("../data/store");
const { mergeVenuesWithStatus } = require("../services/mergeService");

const router = express.Router();

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

router.get("/map", (req, res) => {
  const venues = readVenues();
  const liveStatuses = readLiveStatuses();
  const { lat, lng, radiusKm = "5", category, freeNow } = req.query;

  let merged = mergeVenuesWithStatus(venues, liveStatuses).map((venue) => ({
    ...venue,
    distanceKm:
      lat && lng
        ? haversineKm(Number(lat), Number(lng), venue.lat, venue.lng)
        : null,
  }));

  if (lat && lng) {
    merged = merged.filter((x) => x.distanceKm <= Number(radiusKm));
  }

  if (category) {
    merged = merged.filter((x) => x.category === category);
  }

  if (freeNow === "true") {
    merged = merged.filter((x) => x.tutfree.statusColor === "green");
  }

  merged.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) {
      return a.distanceKm - b.distanceKm;
    }
    return b.rating - a.rating;
  });

  return res.json({ items: merged });
});

router.get("/bookings/:bookingId", (req, res) => {
  const bookings = readBookings();
  const booking = bookings.find((item) => item.id === req.params.bookingId);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  return res.json({ booking });
});

module.exports = router;
