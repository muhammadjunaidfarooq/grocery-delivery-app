import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// A product as stored in the cart (ids are plain strings in the browser)
export interface ICartItem {
  _id: string;
  name: string;
  category: string;
  price: string;
  unit: string;
  quantity: number;
  image: string;
}

interface ICartSlice {
  cartData: ICartItem[];
  subTotal: number;
  deliveryFee: number;
  finalTotal: number;
}

// Must match the server rule in src/lib/orderPricing.ts
const FREE_DELIVERY_ABOVE = 3500;
const DELIVERY_FEE = 120;

const initialState: ICartSlice = {
  cartData: [],
  subTotal: 0,
  deliveryFee: DELIVERY_FEE,
  finalTotal: DELIVERY_FEE,
};

type Id = string | { toString(): string };
const sameId = (a: Id, b: Id) => String(a) === String(b);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<ICartItem>) => {
      const existing = state.cartData.find((i) => sameId(i._id, action.payload._id));
      if (existing) {
        existing.quantity += action.payload.quantity || 1;
      } else {
        state.cartData.push({ ...action.payload, _id: String(action.payload._id) });
      }
      cartSlice.caseReducers.calculateTotals(state);
    },
    increaseQuantity: (state, action: PayloadAction<Id>) => {
      const item = state.cartData.find((i) => sameId(i._id, action.payload));
      if (item && item.quantity < 50) {
        item.quantity++;
      }
      cartSlice.caseReducers.calculateTotals(state);
    },
    decreseQuantity: (state, action: PayloadAction<Id>) => {
      const item = state.cartData.find((i) => sameId(i._id, action.payload));
      if (item && item.quantity > 1) {
        item.quantity--;
      } else {
        state.cartData = state.cartData.filter((i) => !sameId(i._id, action.payload));
      }
      cartSlice.caseReducers.calculateTotals(state);
    },
    removeFromCart: (state, action: PayloadAction<Id>) => {
      state.cartData = state.cartData.filter((i) => !sameId(i._id, action.payload));
      cartSlice.caseReducers.calculateTotals(state);
    },
    clearCart: (state) => {
      state.cartData = [];
      cartSlice.caseReducers.calculateTotals(state);
    },
    // Restores the cart saved in localStorage (see StoreProvider)
    hydrateCart: (state, action: PayloadAction<ICartItem[]>) => {
      state.cartData = Array.isArray(action.payload) ? action.payload : [];
      cartSlice.caseReducers.calculateTotals(state);
    },
    calculateTotals: (state) => {
      const subTotal = state.cartData.reduce((acc, item) => {
        return acc + Number(item.price) * item.quantity;
      }, 0);
      state.subTotal = Math.round(subTotal * 100) / 100;
      state.deliveryFee = state.subTotal > FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
      state.finalTotal = state.subTotal + state.deliveryFee;
    },
  },
});

export const {
  addToCart,
  increaseQuantity,
  decreseQuantity,
  removeFromCart,
  clearCart,
  hydrateCart,
  calculateTotals,
} = cartSlice.actions;
export default cartSlice.reducer;
