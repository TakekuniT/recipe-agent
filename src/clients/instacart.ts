// searchProducts, getProductDetails, listDepartments, addToCart, getCart, removeFromCart

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

  async resolveLocation2() {
    const res = await this.graphql(
      "UserAddresses",
      {},
      "22e6dfa5cb0c9e731bfb696f34f573c1c2e31b8191e96c2b14329c33400a0ddc",
    );

    const addresses = res?.data?.userAddresses;

    if (!addresses || addresses.length === 0) {
      throw new Error(
        "No user addresses found. User is likely not authenticated.",
      );
    }

    const primary = addresses.find((a: any) => a.isPrimary) ?? addresses[0];

    return {
      addressId: primary.id,
      postalCode: primary.postalCode,
      zoneId: primary.zoneId ?? null,
      coordinates: primary.coordinates
        ? {
            latitude: primary.coordinates.latitude,
            longitude: primary.coordinates.longitude,
          }
        : null,
    };
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
      addressId: loc?.addressId,
      postalCode: loc?.postalCode,
      zoneId: loc?.zoneId,

      coordinates: {
        latitude: loc?.coordinates?.latitude,
        longitude: loc?.coordinates?.longitude,
      },
    };
  }

  async resolveShopIds(params: {
    postalCode: string;
    zoneId: string;
    addressId?: string;
    latitude: number;
    longitude: number;
  }) {
    const data = await this.graphql(
      "ShopCollectionUnscoped",
      {
        postalCode: params.postalCode,
        coordinates: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        addressId: params.addressId ?? null,
      },
      "814aa179ab4aaf604c50f65150a589ce17e048747de18a1e67c6ad8af626f7a8",
    );

    const collections = data?.data?.shopCollection?.shops ?? [];
    //console.log("collections", collections);

    const shopIds = collections
      .map((s: any) => s?.id ?? s?.shopId)
      .filter(Boolean);

    return {
      shopIds: Array.from(new Set(shopIds)),
    };
  }

  async searchProducts(params: { query: string; first?: number }) {
    //const location = await this.resolveLocation(params.postalCode);
    const location2 = await this.resolveLocation2();
    const location = await this.resolveLocation(location2.postalCode);
    const shopIds = await this.resolveShopIds({
      postalCode: location.postalCode,
      zoneId: location.zoneId,
      addressId: location.addressId,
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
    });

    const data = await this.graphql(
      "SearchCrossRetailerGroupResults",
      {
        searchSource: "cross_retailer_search",
        query: params.query,
        postalCode: location.postalCode,
        shopIds: shopIds.shopIds,
        zoneId: location.zoneId,
        shopId: "0",
        first: params.first ?? 10,
        disableAutocorrect: false,
        includeDebugInfo: false,
      },
      "f08e542882bd166bf16c6dc40fa05109e8e3e0bcadc60235c9fb5cb547638327",
    );

    const groups = data?.data?.searchCrossRetailerGroupResults?.results ?? [];
    // console.log("groups", groups);
    // return groups.flatMap((g: any) =>
    //   (g.items ?? []).map((item: any) => ({
    //     productId: item.productId,
    //     name: item.name,
    //     brand: item.brandName,
    //     size: item.size,
    //     price: item.price?.viewSection?.priceString ?? null,
    //     imageUrl: item.viewSection?.itemImage?.url ?? null,
    //     available: item.availability?.available,
    //   })),
    // );
    return groups.flatMap((g: any) =>
      (g.items ?? []).map((item: any, idx: number) => ({
        productId: item.productId,
        itemId: g.itemIds?.[idx] ?? null,
        shopId: g.shopId,
        name: item.name,
        brand: item.brandName,
        size: item.size,
        price: item.price?.viewSection?.priceString ?? null,
        imageUrl: item.viewSection?.itemImage?.url ?? null,
        available: item.availability?.available,
      })),
    );
  }

  async getProductDetails(params: { id: string; shopId: string }) {
    const data = await this.graphql(
      "ItemDetailData",
      {
        id: params.id,
        shopId: params.shopId,
        isFeatured: false,
      },
      "1498d8c45b80c63ada20d2a07c07bde2364a3c69e1252ed3dfd6a095c2f2e4c8",
    );

    const item = data?.data?.itemDetail;

    if (!item) {
      throw new Error("No item details found");
    }

    const view = item.viewSection;

    const tracking = view?.trackingProperties?.main_product_details ?? {};

    const details = view?.productDetailSections ?? [];

    const ingredients = details.find(
      (d: any) => d.sectionTypeVariant === "ingredients",
    );

    const detailText = details.find(
      (d: any) => d.sectionTypeVariant === "details",
    );

    return {
      productId: tracking.product_id,

      retailerLocationId: tracking.retailer_location_id,

      storeName: tracking.retailer_name ?? null,

      name: tracking.product_name,

      imageUrls: view?.detailImages?.map((img: any) => img.url) ?? [],

      imageUrl: view?.detailImages?.[0]?.url ?? null,

      ingredients: ingredients?.bodyString ?? null,

      details: detailText?.bodyString ?? null,

      nutrition: view?.nutritionSection?.nutritionHeaderString ?? null,

      availability: true,
    };
  }
}
