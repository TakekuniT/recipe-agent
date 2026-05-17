// searchProducts, getProductDetails, listDepartments, addToCart, getCart, removeFromCart

import crypto from "crypto";

export class InstacartClient {
  constructor(private cookieHeader: string) {}

  private async graphql(operationName: string, variables: any, hash: string) {
    const url = "https://www.instacart.com/graphql";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",

        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",

        "x-client-identifier": "web",
        "x-page-view-id": variables.pageViewId,

        "x-ic-qp": "a7145ba7-0509-504a-98e9-366e6f244b11",
        "x-ic-view-layer": "true",

        referer: "https://www.instacart.com/store/s?k=tuna",

        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",

        Cookie: this.cookieHeader,
      },
      body: JSON.stringify({
        operationName,
        variables,
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: hash,
          },
        },
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`GraphQL error ${res.status}: ${text}`);
    }

    const json = JSON.parse(text);

    if (json.errors?.length) {
      throw new Error(JSON.stringify(json.errors));
    }

    return json;
  }

  async resolveLocation(postalCode: string) {
    const data = await this.graphql(
      "UpdateUserLocation",

      {
        postalCode,
      },
      "026db6726eb53a0e36f0b1368de6c274c15105ec0ae94a5ae73568b533016801",
    );

    const loc = data?.data?.updateUserLocation;

    return {
      postalCode: loc?.postalCode,
      zoneId: loc?.zoneId,

      coordinates: {
        latitude: loc?.coordinates?.latitude,
        longitude: loc?.coordinates?.longitude,
      },
    };
  }

  async searchProducts(params: {
    query: string;
    postalCode: string;
    shopIds: string[];
    pageViewId: string;
    //zoneId: string;
    first?: number;
  }) {
    const location = await this.resolveLocation(params.postalCode);

    const data = await this.graphql(
      "SearchCrossRetailerGroupResults",
      {
        searchSource: "cross_retailer_search",
        query: params.query,
        postalCode: params.postalCode,
        shopIds: params.shopIds,
        //zoneId: params.zoneId,
        zoneId: location.zoneId,
        shopId: "0",
        first: params.first ?? 10,
        disableAutocorrect: false,
        includeDebugInfo: false,
      },
      "f08e542882bd166bf16c6dc40fa05109e8e3e0bcadc60235c9fb5cb547638327",
    );

    const groups = data?.data?.searchCrossRetailerGroupResults?.results ?? [];

    return groups.flatMap((g: any) =>
      (g.items ?? []).map((item: any) => ({
        productId: item.productId,
        name: item.name,
        brand: item.brandName,
        size: item.size,
        price: item.price?.viewSection?.priceString ?? null,
        imageUrl: item.viewSection?.itemImage?.url ?? null,
        available: item.availability?.available,
      })),
    );
  }
}
