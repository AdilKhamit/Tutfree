function classifyLiveStatus(mode, nextAvailableMinutes) {
  if (mode === "free_now") {
    return "green";
  }
  if (mode === "next_window") {
    if (typeof nextAvailableMinutes === "number" && nextAvailableMinutes <= 60) {
      return "yellow";
    }
    return "red";
  }
  return "red";
}

function toClientBadge(status) {
  if (status === "green") return "available_now";
  if (status === "yellow") return "available_soon";
  return "busy_or_not_connected";
}

module.exports = {
  classifyLiveStatus,
  toClientBadge,
};
