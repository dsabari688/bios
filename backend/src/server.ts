import "dotenv/config";
import app from "./app.js";
import { startScheduler } from "./scheduler/scheduler.js";

const PORT = Number(process.env.PORT ?? 5000);

app.listen(PORT, () => {
  console.log(`[LIFE-OS] Server running on port ${PORT}`);
  startScheduler();
});
