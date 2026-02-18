const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

const venuesRouter = require("./routes/venues");
const bookingsRouter = require("./routes/bookings");
const clientRouter = require("./routes/client");
const businessRouter = require("./routes/business");
const { importFrom2GIS } = require("./services/twogis");
const { replaceVenues } = require("./data/store");
const { setSocketServer } = require("./services/realtime");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
setSocketServer(io);

io.on("connection", (socket) => {
  socket.on("business:subscribe", ({ venueId }) => {
    if (!venueId) return;
    socket.join(`business:${venueId}`);
  });
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../web")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, brand: "TutFree" });
});

app.use("/api/venues", venuesRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/client", clientRouter);
app.use("/api/business", businessRouter);

app.post("/api/sync/2gis", async (req, res) => {
  try {
    const defaultQuery = process.env.TWO_GIS_QUERY || "service";
    const imported = await importFrom2GIS({
      apiKey: process.env.TWO_GIS_API_KEY,
      city: process.env.CITY || "almaty",
      q: req.body?.query || defaultQuery,
    });

    if (imported.length > 0) {
      replaceVenues(imported);
    }

    return res.json({ imported: imported.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const port = Number(process.env.PORT || 8080);
server.listen(port, () => {
  console.log(`TutFree started on http://localhost:${port}`);
});
