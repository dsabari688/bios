import "dotenv/config";
import dns from "node:dns";
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
import app from "./app.js";
import { startScheduler } from "./scheduler/scheduler.js";

const PORT = Number(process.env.PORT ?? 5000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[LIFE-OS] Server running on port ${PORT}`);
  startScheduler();
});
