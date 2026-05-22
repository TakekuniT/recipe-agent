import { z } from "zod";
import { InstacartClient } from "../../clients/instacart.js";
import { requireInstacartCookie } from "../../../scripts/login_instacart.js";

const cookie = await requireInstacartCookie();

const instacartClient = new InstacartClient(cookie);
export const addToCartTool = {
  name: "add_to_cart",

  description: "Add a product to the Instacart cart.",

  schema: z.object({
    product_id: z.string(),
    quantity: z.number().int().optional(),
    zip_code: z.string().optional(),
    store: z.string().optional(),
  }),

  handler: async (args: any) => {
    const result = await instacartClient.addToCart({
      product_id: args.product_id,
      quantity: args.quantity,
      zip_code: args.zip_code,
      store: args.store,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              action: "add_to_cart",
              result,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
