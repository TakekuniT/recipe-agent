import { InstacartClient } from "./instacart.js";
import crypto from "crypto";
import {
  requireInstacartCookie,
  saveInstacartCookie,
} from "../../scripts/login_instacart.js";

async function main() {
  // Cookie run once, then comment it out
  //   await saveInstacartCookie(
  //     'ahoy_track=true; X-IC-bcx=1; privacy_opt_out=false; __stripe_mid=2d1ac97f-9e24-4439-bd05-6795af76eaf2bd5bf6; build_sha=27a6eff0e01230c2b4173d3b5e00b1642e6d477a; _instacart_session_id=SEtwbXErY0pkQUxaVGdEamdCTWRQKzIzb3paVlUreldaVHFwdnRMMEU0NG5Jdm5heE5HRWw5MVJpcHV5L1d2eG5ESWRLTkx6U2RRWU9OQkVwYkhVbm5rM1BJODEveCt3VjMrNFpqbGVBa1dOL0tMdDNsSi9lekdxc3lWdlRzL3dCVjdxNUZaUHdTNmY5UVR3VVBGNU4wUlNDM01WWVNZT1NjTnZBNVg1MjdrPS0tbkdUSFBiUjlsRFVxOEwwTW13WDhLUT09--fc176b3660df51db405adb4500d40cef6a21a4e0; g_state={"i_l":0,"i_ll":1779045220911,"i_b":"qTDqAaY804FkL20brOOl+1zsuX9moRdIodKgOjh/7Ss","i_e":{"enable_itp_optimization":0},"i_et":1779045002590}; __Host-instacart_sid=v2.477b9d03452fdc.uuQ9xl7NxU6NE0qCJKuT4XWKv2znZeSxSOQs3ZD3thU; known_visitor=%7Ctakekuni%40tanemori.org%7Cemail_code; bradius=rate_limit_on; __stripe_sid=3325671f-d005-4153-8780-837912ec9c6aae16cf; forterToken=f8e3f25f1aa9424fa39cedb63a2115cf_1779054903449_42_UDAD43-mnts-a9-r8-n4_24ck_; _dd_s=',
  //   );
  const cookie = await requireInstacartCookie();
  //   console.log("cookie", cookie);
  //const client = new InstacartClient(process.env.INSTACART_COOKIE!);
  const client = new InstacartClient(cookie);

  const pageViewId = crypto.randomUUID();

  console.log("=== RESOLVE LOCATION ===");

  const location = await client.resolveLocation("07090");

  console.dir(location, { depth: 5 });

  console.log("=== RESOLVE SHOP IDS ===");

  const shopIds = await client.resolveShopIds({
    postalCode: location.postalCode,
    zoneId: location.zoneId,
    addressId: location.addressId,
    latitude: location.coordinates.latitude,
    longitude: location.coordinates.longitude,
    pageViewId,
  });
  console.dir(shopIds, { depth: 5 });

  console.log("=== SEARCH PRODUCTS ===");
  const results = await client.searchProducts({
    query: "milk",
    postalCode: "07090",
    pageViewId,
    first: 10000000,
  });
  console.dir(results, { depth: 5 });
}

main().catch(console.error);
