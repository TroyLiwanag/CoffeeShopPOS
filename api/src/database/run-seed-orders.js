import dotenv from "dotenv";
import { seedSampleOrders } from "./seed-orders.js";

dotenv.config();

const force = process.argv.includes("--force");

seedSampleOrders({ force })
  .then((result) => {
    if (result.skipped) process.exit(0);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Order seed failed:", err.message);
    process.exit(1);
  });
