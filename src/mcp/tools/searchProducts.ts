import { z } from "zod";
import { InstacartClient } from "../../clients/instacart.js";
import { requireInstacartCookie } from "../../../scripts/login_instacart.js";

// Cookie run once, then comment it out
//   await saveInstacartCookie(
//     'ahoy_track=true; X-IC-bcx=1; privacy_opt_out=false; __stripe_mid=2d1ac97f-9e24-4439-bd05-6795af76eaf2bd5bf6; build_sha=27a6eff0e01230c2b4173d3b5e00b1642e6d477a; _instacart_session_id=SEtwbXErY0pkQUxaVGdEamdCTWRQKzIzb3paVlUreldaVHFwdnRMMEU0NG5Jdm5heE5HRWw5MVJpcHV5L1d2eG5ESWRLTkx6U2RRWU9OQkVwYkhVbm5rM1BJODEveCt3VjMrNFpqbGVBa1dOL0tMdDNsSi9lekdxc3lWdlRzL3dCVjdxNUZaUHdTNmY5UVR3VVBGNU4wUlNDM01WWVNZT1NjTnZBNVg1MjdrPS0tbkdUSFBiUjlsRFVxOEwwTW13WDhLUT09--fc176b3660df51db405adb4500d40cef6a21a4e0; g_state={"i_l":0,"i_ll":1779045220911,"i_b":"qTDqAaY804FkL20brOOl+1zsuX9moRdIodKgOjh/7Ss","i_e":{"enable_itp_optimization":0},"i_et":1779045002590}; __Host-instacart_sid=v2.477b9d03452fdc.uuQ9xl7NxU6NE0qCJKuT4XWKv2znZeSxSOQs3ZD3thU; known_visitor=%7Ctakekuni%40tanemori.org%7Cemail_code; bradius=rate_limit_on; __stripe_sid=3325671f-d005-4153-8780-837912ec9c6aae16cf; forterToken=f8e3f25f1aa9424fa39cedb63a2115cf_1779054903449_42_UDAD43-mnts-a9-r8-n4_24ck_; _dd_s=',
//   );
const cookie = await requireInstacartCookie();
const instacartClient = new InstacartClient(cookie);
export const searchProductsTool = {
  name: "search_products",

  description: "Search Instacart for grocery products.",

  schema: z.object({
    query: z.string(),

    zip_code: z.string().optional(),
    store: z.string().optional(),

    page: z.number().int().optional().default(1),
    limit: z.number().int().optional().default(10),
  }),

  handler: async (args: any) => {
    console.log("SEARCH_PRODUCTS");
    console.log("TOOLS INPUT", args);

    if (!args.query) {
      throw new Error("query is required");
    }

    const searchParams: {
      query: string;
      zip_code?: string;
      store?: string;
      page?: number;
      limit?: number;
    } = {
      query: args.query,
      page: args.page ?? 1,
      limit: args.limit ?? 10,
    };

    if (args.zip_code) searchParams.zip_code = args.zip_code;
    if (args.store) searchParams.store = args.store;

    const result = await instacartClient.searchProducts(searchParams);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
