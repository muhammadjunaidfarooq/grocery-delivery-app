// Adds demo products and demo accounts so the app can be shown end to end.
//
//   node scripts/seed-demo-data.mjs          (dry run: shows the plan, writes nothing)
//   node scripts/seed-demo-data.mjs --yes    (writes the missing data)
//   npm run seed                             (same as --yes)
//
// It only ADDS data: a product is skipped when a product with the same name
// already exists, and an account is skipped when its email already exists.
// Nothing is updated or deleted. It uses MONGODB_URL from .env.local.

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const confirmed = process.argv.includes("--yes");
const url = process.env.MONGODB_URL;
if (!url) {
  console.error("MONGODB_URL is not set (.env.local).");
  process.exit(1);
}

// Images live in /public/products (Twemoji, CC-BY 4.0)
const PRODUCTS = [
  ["Fresh Apples", "Fruits & Vegetables", "320", "kg", "apples"],
  ["Bananas", "Fruits & Vegetables", "180", "kg", "bananas"],
  ["Tomatoes", "Fruits & Vegetables", "150", "kg", "tomatoes"],
  ["Carrots", "Fruits & Vegetables", "120", "kg", "carrots"],
  ["Onions", "Fruits & Vegetables", "140", "kg", "onions"],
  ["Black Grapes", "Fruits & Vegetables", "450", "kg", "grapes", false],
  ["Fresh Milk", "Dairy & Eggs", "230", "liter", "milk"],
  ["Farm Eggs (12)", "Dairy & Eggs", "380", "pack", "eggs"],
  ["Cheddar Cheese", "Dairy & Eggs", "650", "pack", "cheese"],
  ["Basmati Rice", "Rice, Atta & Grains", "540", "kg", "rice"],
  ["Whole Wheat Bread", "Rice, Atta & Grains", "180", "piece", "bread"],
  ["Chocolate Cookies", "Snacks & Biscuits", "250", "pack", "cookies"],
  ["Butter Popcorn", "Snacks & Biscuits", "150", "pack", "popcorn"],
  ["Red Chilli", "Spices & Masalas", "220", "pack", "chilli"],
  ["Green Tea", "Beverages & Drinks", "450", "pack", "green-tea"],
  ["Orange Juice", "Beverages & Drinks", "350", "liter", "juice"],
  ["Ground Coffee", "Beverages & Drinks", "900", "pack", "coffee"],
  ["Instant Noodles", "Instant & Packaged Food", "90", "pack", "noodles"],
  ["Bath Soap", "Personal Care", "120", "piece", "soap"],
  ["Tissue Rolls", "Household Essentials", "400", "pack", "tissue"],
  ["Baby Feeding Bottle", "Baby & Pet Care", "600", "piece", "baby-bottle"],
];

const DEMO_PASSWORD = "Demo@1234";
// Lahore (Mall Road area). The rider starts near the customer, so the admin's
// "out of delivery" step finds them (riders within 10 km are offered the job).
const ACCOUNTS = [
  { name: "Demo Admin", email: "admin@omnimart.demo", role: "admin", mobile: "+923000000001", coords: [74.3436, 31.5497] },
  { name: "Demo Customer", email: "customer@omnimart.demo", role: "user", mobile: "+923000000002", coords: [74.3587, 31.5204] },
  { name: "Demo Rider", email: "rider@omnimart.demo", role: "deliveryBoy", mobile: "+923000000003", coords: [74.3500, 31.5300] },
];

await mongoose.connect(url);
const db = mongoose.connection.db;
console.log(`Database: ${db.databaseName}`);

try {
  const groceries = db.collection("groceries");
  const users = db.collection("users");
  const now = new Date();

  const existingNames = new Set(
    (await groceries.find({}, { projection: { name: 1 } }).toArray()).map((g) => g.name),
  );
  const newProducts = PRODUCTS.filter(([name]) => !existingNames.has(name)).map(
    ([name, category, price, unit, image, inStock = true]) => ({
      name,
      category,
      price,
      unit,
      image: `/products/${image}.png`,
      inStock,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    }),
  );

  const existingEmails = new Set(
    (await users.find({ email: { $in: ACCOUNTS.map((a) => a.email) } }).toArray()).map((u) => u.email),
  );
  const missingAccounts = ACCOUNTS.filter((a) => !existingEmails.has(a.email));

  console.log(`Products to add: ${newProducts.length} (already there: ${PRODUCTS.length - newProducts.length})`);
  console.log(`Accounts to add: ${missingAccounts.map((a) => a.email).join(", ") || "none"}`);

  if (!confirmed) {
    console.log("Dry run, nothing written. Add --yes to write.");
  } else {
    if (newProducts.length) await groceries.insertMany(newProducts);
    if (missingAccounts.length) {
      const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
      await users.insertMany(
        missingAccounts.map((a) => ({
          name: a.name,
          email: a.email,
          password: hash,
          role: a.role,
          mobile: a.mobile,
          location: { type: "Point", coordinates: a.coords },
          socketId: null,
          isOnline: false,
          createdAt: now,
          updatedAt: now,
          __v: 0,
        })),
      );
    }
    console.log("Done.");
    console.log(`Demo logins (password ${DEMO_PASSWORD}): ${ACCOUNTS.map((a) => a.email).join(", ")}`);
  }
} finally {
  await mongoose.disconnect();
}
