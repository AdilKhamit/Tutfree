const fs = require("fs");
const path = require("path");

const venuesPath = path.join(__dirname, "../../data/seed.json");
const bookingsPath = path.join(__dirname, "../../data/bookings.json");
const liveStatusesPath = path.join(__dirname, "../../data/live-statuses.json");
const claimsPath = path.join(__dirname, "../../data/claims.json");
const businessAccountsPath = path.join(__dirname, "../../data/business-accounts.json");

function ensureFile(filePath, fallback = "[]") {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, fallback, "utf-8");
  }
}

function readJson(filePath, fallback = "[]") {
  ensureFile(filePath, fallback);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function readVenues() {
  return readJson(venuesPath);
}

function replaceVenues(venues) {
  writeJson(venuesPath, venues);
}

function readBookings() {
  return readJson(bookingsPath);
}

function saveBookings(bookings) {
  writeJson(bookingsPath, bookings);
}

function readLiveStatuses() {
  return readJson(liveStatusesPath);
}

function saveLiveStatuses(statuses) {
  writeJson(liveStatusesPath, statuses);
}

function readClaims() {
  return readJson(claimsPath);
}

function saveClaims(claims) {
  writeJson(claimsPath, claims);
}

function readBusinessAccounts() {
  return readJson(businessAccountsPath);
}

function saveBusinessAccounts(accounts) {
  writeJson(businessAccountsPath, accounts);
}

module.exports = {
  readVenues,
  replaceVenues,
  readBookings,
  saveBookings,
  readLiveStatuses,
  saveLiveStatuses,
  readClaims,
  saveClaims,
  readBusinessAccounts,
  saveBusinessAccounts,
};
