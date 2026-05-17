import { InstacartClient } from "./instacart.js";
import crypto from "crypto";

async function main() {
  const client = new InstacartClient(process.env.INSTACART_COOKIE!);

  const pageViewId = crypto.randomUUID();

  console.log("=== SEARCH PRODUCTS ===");

  const results = await client.searchProducts({
    query: "milk",
    postalCode: "07090",
    shopIds: ["90247"], // IMPORTANT: must match real store list (see below)
    zoneId: "172",
    pageViewId,
    first: 10000000,
  });

  console.dir(results, { depth: 5 });
}

main().catch(console.error);
