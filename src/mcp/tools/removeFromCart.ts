import { z } from "zod";
import { InstacartClient } from "../../clients/instacart.js";
import { requireInstacartCookie } from "../../../scripts/login_instacart.js";

const cookie = await requireInstacartCookie();

const instacartClient = new InstacartClient(cookie);

export const removeFromCartTool = {
  name: "remove_from_cart",

  description: "Remove an item from the Instacart cart.",

  schema: z.object({
    product_id: z.string(),
    quantity: z.number().int().optional(),
    zip_code: z.string().optional(),
    store: z.string().optional(),
  }),

  handler: async (args: any) => {
    const result = await instacartClient.removeFromCart({
      product_id: args.product_id,
      quantity: args.quantity,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              action: "remove_from_cart",
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
