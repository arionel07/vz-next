/**
 * Express delivery price, shared by every place that needs to show or
 * charge it. Previously this "100" was hardcoded independently in
 * checkout-page.tsx (twice — the note text and the price shown in the
 * delivery-method list), api/orders/route.ts, and api/cart/quote/route.ts.
 * A future price change could easily miss one of those, making the
 * displayed price and the actually-charged price disagree silently.
 *
 * Regular delivery doesn't have this problem — its price already comes
 * from the `constants` DB table (SHIPPING_PRICE). If express delivery
 * pricing needs to become admin-editable too, move this into that same
 * table instead of changing the number here.
 */
export const EXPRESS_DELIVERY_PRICE = 100
