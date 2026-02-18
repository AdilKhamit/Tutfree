let io = null;

function setSocketServer(socketServer) {
  io = socketServer;
}

function emitStatusUpdated(payload) {
  if (!io) return;
  io.emit("live_status_updated", payload);
}

function emitBookingCreated(payload) {
  if (!io) return;
  io.to(`business:${payload.venueId}`).emit("booking_created", payload);
  io.emit("booking_created_public", payload);
}

function emitBookingDecision(payload) {
  if (!io) return;
  io.emit("booking_decision", payload);
}

module.exports = {
  setSocketServer,
  emitStatusUpdated,
  emitBookingCreated,
  emitBookingDecision,
};
