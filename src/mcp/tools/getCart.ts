import { z } from "zod";
import { InstacartClient } from "../../clients/instacart.js";
import { requireInstacartCookie } from "../../../scripts/login_instacart.js";

const cookie = await requireInstacartCookie();

const instacartClient = new InstacartClient(cookie);

export const getCartTool = {
  name: "get_cart",

  description: "Retrieve the current contents of the Instacart cart.",

  schema: z.object({
    zip_code: z.string().optional(),
    store: z.string().optional(),
  }),

  handler: async (args: any) => {
    const cart = await instacartClient.getCart({
      zip_code: args.zip_code,
      store: args.store,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              action: "get_cart",
              cart,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
