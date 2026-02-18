const express = require("express");
const { readVenues, readLiveStatuses } = require("../data/store");
const { mergeVenuesWithStatus } = require("../services/mergeService");

const router = express.Router();

router.get("/", (_req, res) => {
  const venues = readVenues();
  const liveStatuses = readLiveStatuses();
  const merged = mergeVenuesWithStatus(venues, liveStatuses);
  res.json({ items: merged });
});

module.exports = router;
