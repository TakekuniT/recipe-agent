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
        "x-page-view-id": crypto.randomUUID(), //variables.pageViewId,

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

    const shopIds = collections
      .map((s: any) => s?.id ?? s?.shopId)
      .filter(Boolean);

    // return {
    //   shopIds: Array.from(new Set(shopIds)),
    // };
    return collections.map((shop: any) => ({
      shopId: shop.id,
      retailerId: shop.retailerId,
      retailerLocationId: shop.retailerLocationId,

      storeName: shop.retailer?.name,
      storeSlug: shop.retailer?.slug,

      retailerType: shop.retailer?.retailerType,

      serviceType: shop.serviceType,
    }));
  }

  async searchProductsTest(params: { query: string; first?: number }) {
    //const location = await this.resolveLocation(params.postalCode);
    const location2 = await this.resolveLocation2();
    const location = await this.resolveLocation(location2.postalCode);
    const shopInfoIds = await this.resolveShopIds({
      postalCode: location.postalCode,
      zoneId: location.zoneId,
      addressId: location.addressId,
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
    });

    const shopIds = shopInfoIds.map((shopInfo: any) => shopInfo.shopId);

    const data = await this.graphql(
      "SearchCrossRetailerGroupResults",
      {
        searchSource: "cross_retailer_search",
        query: params.query,
        postalCode: location.postalCode,
        shopIds: shopIds,
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

  async searchProducts(params: {
    query: string;
    zip_code?: string;
    store?: string;
    page?: number;
    limit?: number;
  }) {
    const baseLocation = await this.resolveLocation2();

    const location = await this.resolveLocation(
      params.zip_code ?? baseLocation.postalCode,
    );

    const shops = await this.resolveShopIds({
      postalCode: location.postalCode,
      zoneId: location.zoneId,
      addressId: location.addressId,
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
    });

    let filteredShops = shops;

    if (params.store) {
      const search = params.store.toLowerCase();

      filteredShops = shops.filter((shop: any) => {
        return (
          shop.storeName?.toLowerCase().includes(search) ||
          shop.storeSlug?.toLowerCase().includes(search)
        );
      });
    }

    const deliveryShops = filteredShops.filter(
      (s: any) => s.serviceType === "delivery",
    );

    const finalShops = deliveryShops.length > 0 ? deliveryShops : filteredShops;

    const shopIds = Array.from(new Set(finalShops.map((s: any) => s.shopId)));

    if (shopIds.length === 0) {
      return {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        total: 0,
        results: [],
      };
    }

    const limit = params.limit ?? 10;
    const page = params.page ?? 1;

    const fetchCount = page * limit;

    const data = await this.graphql(
      "SearchCrossRetailerGroupResults",
      {
        searchSource: "cross_retailer_search",
        query: params.query,

        postalCode: location.postalCode,
        zoneId: location.zoneId,

        shopIds,
        shopId: "0",

        first: fetchCount,

        disableAutocorrect: false,
        includeDebugInfo: false,
      },
      "f08e542882bd166bf16c6dc40fa05109e8e3e0bcadc60235c9fb5cb547638327",
    );

    const groups = data?.data?.searchCrossRetailerGroupResults?.results ?? [];

    const products = groups.flatMap((group: any) =>
      (group.items ?? []).map((item: any, idx: number) => {
        const matchingShop = finalShops.find(
          (s: any) => s.shopId === group.shopId,
        );

        return {
          productId: item.productId,

          itemId: group.itemIds?.[idx] ?? null,

          //shopId: group.shopId,

          productName: item.name ?? null,

          brand: item.brandName ?? null,

          price:
            item.price?.viewSection?.priceString ?? item.price?.price ?? null,

          unitSize:
            item.size ?? item.quantityAttributes?.unitAriaString ?? null,

          availability: item.availability?.available ?? true,

          storeName: matchingShop?.storeName ?? null,

          //storeSlug: matchingShop?.storeSlug ?? null,

          //retailerId: matchingShop?.retailerId ?? null,

          //retailerLocationId: matchingShop?.retailerLocationId ?? null,

          //serviceType: matchingShop?.serviceType ?? null,

          imageUrl: item.viewSection?.itemImage?.url ?? null,

          productUrl:
            matchingShop?.storeSlug && item.productId
              ? `https://www.instacart.com/store/${matchingShop.storeSlug}/products/${item.productId}`
              : null,
        };
      }),
    );

    const deduped = Array.from(
      new Map(
        products.map((p: any) => [`${p.productId}-${p.shopId}`, p]),
      ).values(),
    );

    const start = (page - 1) * limit;
    const end = start + limit;

    const paginated = deduped.slice(start, end);

    return {
      page,
      limit,
      total: deduped.length,

      appliedFilters: {
        zip_code: location.postalCode,
        store: params.store ?? null,
      },

      results: paginated,
    };
  }

  async getProductDetailsTest(params: { id: string; shopId: string }) {
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

  async getProductDetails(params: { product_id?: string; url?: string }) {
    if (!params.product_id && !params.url) {
      throw new Error("At least one of product_id or url must be provided");
    }

    let productId = params.product_id;

    if (!productId && params.url) {
      const match = params.url.match(/products\/(\d+)/);

      if (!match) {
        throw new Error("Could not extract product ID from URL");
      }

      productId = match[1];
    }

    const location2 = await this.resolveLocation2();

    const location = await this.resolveLocation(location2.postalCode);

    const shops = await this.resolveShopIds({
      postalCode: location.postalCode,
      zoneId: location.zoneId,
      addressId: location.addressId,
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
    });

    if (!shops.length) {
      throw new Error("No shops found");
    }

    let results: any[] = [];
    for (const shop of shops) {
      try {
        const itemId = `items_${shop.retailerLocationId}-${productId}`;

        const data = await this.graphql(
          "Items",
          {
            ids: [itemId],
            shopId: shop.shopId,
            zoneId: location.zoneId,
            postalCode: location.postalCode,
          },
          "b2411f6acba21b2a6a277ca5616fdc5d1265ba647808895c05fe7ce1fd2fdcec",
        );

        const item = data?.data?.items?.[0];

        if (!item) {
          continue;
        }

        const priceView = item.price?.viewSection;

        const result = {
          productId: item.productId,

          name: item.name ?? null,

          brand: item.brandName ?? null,

          price:
            priceView?.itemDetails?.priceString ??
            priceView?.priceString ??
            null,

          pricePerUnit: priceView?.itemDetails?.pricePerUnitString ?? null,

          size: item.size ?? null,

          availability: item.availability?.available ?? false,

          category:
            item.viewSection?.trackingProperties?.product_category_name ?? null,

          nutrition:
            item.nutritionalAttributes ??
            item.dietary?.viewSection?.attributeSections?.map(
              (a: any) => a.attributeString,
            ) ??
            null,

          storeName: shop.storeName ?? null,

          productUrl:
            params.url ??
            `https://www.instacart.com/products/${item.productId}`,

          imageUrl:
            item.viewSection?.itemImage?.url ??
            item.viewSection?.itemTransparentImage?.url ??
            null,
        };
        results.push(result);
      } catch (err) {
        console.log("shop failed", shop.storeName, err);

        continue;
      }
      return results;
    }

    throw new Error(`Product ${productId} not found in any shop`);
  }

  async getCartId(): Promise<string> {
    const data = await this.graphql(
      "PersonalActiveCarts",
      {},
      "eac9d17bd45b099fbbdabca2e111acaf2a4fa486f2ce5bc4e8acbab2f31fd8c0",
    );
    //console.log("data", data);

    const carts = data?.data?.userCarts?.carts;

    if (!carts || carts.length === 0) {
      throw new Error("No active carts found for user");
    }

    //console.log("carts", carts);
    const activeCart = carts[0];

    if (!activeCart?.id) {
      throw new Error("Cart found but missing cart id");
    }

    return activeCart.id;
  }

  async getCart(params: { zip_code?: string; store?: string } = {}) {
    // params may be unnecessary
    const cartId = await this.getCartId();

    const data = await this.graphql(
      "UserCart",
      { id: cartId },
      "32a2c15d1cbda8f819ec107bacd83bc45add7e783d29cd0595b02254650918c1",
    );

    const items = data?.data?.userCart?.cartItemCollection?.cartItems ?? [];
    let subtotal = 0.0;
    const normalizedItems = await Promise.all(
      items.map(async (item: any) => {
        const product = item.basketProduct;

        const productId = product?.productId ?? null;
        const name = product?.name ?? null;
        const quantity = item.quantity ?? 1;

        const products = await this.getProductDetails({
          product_id: productId,
        });

        const productDetails = products[0];
        const unitPrice = Number(productDetails?.price?.replace("$", ""));

        const lineTotal = unitPrice * quantity;
        subtotal += lineTotal;

        return {
          product_id: productId,
          name,
          quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        };
      }),
    );

    return {
      items: normalizedItems,
      item_count: normalizedItems.length,
      subtotal: subtotal,
    };
  }
}
