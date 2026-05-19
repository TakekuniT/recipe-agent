import { z } from "zod";
import { InstacartClient } from "../../clients/instacart.js";
import { requireInstacartCookie } from "../../../scripts/login_instacart.js";

// Cookie run once, then comment it out
// await saveInstacartCookie("...");

const cookie = await requireInstacartCookie();

const instacartClient = new InstacartClient(cookie);

export const getProductDetailsTool = {
  name: "get_product_details",

  description: "Get full product details from Instacart.",

  schema: z
    .object({
      product_id: z.string().optional(),

      url: z.string().url().optional(),
    })
    .refine((data) => data.product_id || data.url, {
      message: "At least one of product_id or url must be provided",
    }),

  handler: async (extra: any) => {
    const args = extra.arguments as {
      product_id?: string;
      url?: string;
    };

    if (!args.product_id && !args.url) {
      throw new Error("At least one of product_id or url must be provided");
    }

    const params: Parameters<typeof instacartClient.getProductDetails>[0] = {};

    if (args.product_id !== undefined) {
      params.product_id = args.product_id;
    }

    if (args.url !== undefined) {
      params.url = args.url;
    }

    const results = await instacartClient.getProductDetails(params);

    return {
      content: [
        {
          type: "text" as const,

          text: JSON.stringify(
            {
              total: results.length,

              results: results.map((product: any) => ({
                product_id: product.productId,

                name: product.name,

                brand: product.brand,

                price: product.price,

                price_per_unit: product.pricePerUnit,

                unit_size: product.size,

                availability: product.availability,

                category: product.category,

                nutrition: product.nutrition,

                store_name: product.storeName,

                product_url: product.productUrl,

                image_url: product.imageUrl,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
