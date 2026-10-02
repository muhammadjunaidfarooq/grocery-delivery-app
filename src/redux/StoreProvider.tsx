"use client";
import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import { hydrateCart } from "./cartSlice";

const CART_KEY = "omnimart-cart";

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  // Keep the cart after a page refresh (and after the Stripe redirect).
  // It is loaded after the first render so server and browser HTML match.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) store.dispatch(hydrateCart(JSON.parse(saved)));
    } catch {
      // Storage blocked or corrupted: start with an empty cart
    }
    let last = store.getState().cart.cartData;
    return store.subscribe(() => {
      const current = store.getState().cart.cartData;
      if (current === last) return;
      last = current;
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(current));
      } catch {
        // Ignore: the cart still works for this visit
      }
    });
  }, []);

  return <Provider store={store}>{children}</Provider>;
};

export default StoreProvider;
