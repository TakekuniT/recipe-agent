# Instacart API Specification

## Overview

This document describes the undocumented Instacart web GraphQL APIs reverse engineered from the Instacart web application.

The implementation uses persisted GraphQL queries against:

https://www.instacart.com/graphql

The client supports:

- Product search
- Product detail retrieval
- Department/store discovery
- Cart management
- Location resolution
- Multi-store shopping support

---

# Base Endpoint

## GraphQL Endpoint

POST https://www.instacart.com/graphql

---

# Required Headers

These headers were required for successful requests.

```http
Content-Type: application/json
Accept: */*
User-Agent: Mozilla/5.0 ...
x-client-identifier: web
x-page-view-id: <uuid>
x-ic-qp: a7145ba7-0509-504a-98e9-366e6f244b11
x-ic-view-layer: true
referer: https://www.instacart.com/store/s?k=tuna
accept-language: en-US,en;q=0.9
cache-control: no-cache
pragma: no-cache

```

## Cookies

```
Cookie: ahoy_track; X-IC-bcx; privacy_opt_out; __stripe_mid=; build_sha=27a6eff0e01230c2b4173d3b5e00b1642e6d477a; _instacart_session_id; g_state,"i_b","i_e"; __Host-instacart_sid; known_visitor; bradius; __stripe_sid; forterToken; _dd_s',
```

## Limitations

getCartId only gives the first active cart id. This means that removeFromCart only works for the first active cart unless the AI is able to look through all active carts after removing the first one.
