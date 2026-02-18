const { classifyLiveStatus, toClientBadge } = require("./statusClassifier");

function buildLiveStatusIndex(liveStatuses) {
  const index = new Map();
  for (const status of liveStatuses) {
    index.set(status.twoGisId, status);
  }
  return index;
}

function mergeVenuesWithStatus(venues, liveStatuses) {
  const index = buildLiveStatusIndex(liveStatuses);
  const now = new Date().toISOString();

  return venues.map((venue) => {
    const dynamic = index.get(venue.id) || null;

    if (!dynamic) {
      return {
        ...venue,
        tutfree: {
          connected: false,
          mode: "not_connected",
          statusColor: "red",
          badge: "busy_or_not_connected",
          updatedAt: now,
        },
      };
    }

    const statusColor = classifyLiveStatus(dynamic.mode, dynamic.nextAvailableInMinutes);

    return {
      ...venue,
      tutfree: {
        connected: true,
        mode: dynamic.mode,
        statusColor,
        badge: toClientBadge(statusColor),
        nextAvailableInMinutes: dynamic.nextAvailableInMinutes ?? null,
        updatedAt: dynamic.updatedAt,
      },
    };
  });
}

module.exports = {
  mergeVenuesWithStatus,
};
