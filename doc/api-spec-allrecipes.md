# Allrecipes Reverse Engineered API Specification

## Overview

This document describes the reverse engineered Allrecipes web surfaces used by the Recipe & Grocery Intelligence Agent.

The implementation intentionally avoids official APIs and instead uses the web scraping used by the Allrecipes frontend.

Primary goals:

- Recipe search
- Recipe retrieval
- Category browsing
- Structured recipe extraction
- Ingredient parsing integration

---

## Base URL

```txt
https://www.allrecipes.com
```

## Limitations

Use playwright to bypass the anti bot protection.

searchRecipes uses only query parameter, none of the other parameters.

getRecipe uses url parameter and cannot be used to get recipe by id alone.
