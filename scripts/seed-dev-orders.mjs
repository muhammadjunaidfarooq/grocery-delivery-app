// DEV-ONLY: creates fake orders so you can try the admin dashboard.
//
//   node scripts/seed-dev-orders.mjs          (dry run: shows the plan, writes nothing)
//   node scripts/seed-dev-orders.mjs --yes    (creates about 30 fake orders)
//   node scripts/seed-dev-orders.mjs --delete --yes   (removes every fake order)
//
// Every fake order has the customer name "SEED" (address.fullName), and that
// is the only thing --delete removes. It never touches real orders.
// It refuses to run when NODE_ENV is "production".
//
// It uses MONGODB_URL from .env.local, so check which database that is first.

import mongoose from "mongoose";
import nextEnv from "@next/env";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run: NODE_ENV is production.");
  process.exit(1);
}

nextEnv.loadEnvConfig(process.cwd());
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run: NODE_ENV is production.");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const confirmed = args.has("--yes");
const wantsDelete = args.has("--delete");
const MARK = "SEED";

const url = process.env.MONGODB_URL;
if (!url) {
  console.error("MONGODB_URL is not set (.env.local).");
  process.exit(1);
}

await mongoose.connect(url);
const db = mongoose.connection.db;
console.log(`Database: ${db.databaseName}`);
const orders = db.collection("orders");
const seeded = { "address.fullName": MARK };

try {
  const existing = await orders.countDocuments(seeded);

  if (wantsDelete) {
    console.log(`Fake orders found: ${existing}`);
    if (!confirmed) {
      console.log("Dry run. Add --yes to delete them.");
    } else {
      const result = await orders.deleteMany(seeded);
      console.log(`Deleted ${result.deletedCount} fake orders.`);
    }
  } else if (existing > 0) {
    console.error(
      `${existing} fake orders already exist. Run with --delete --yes first.`,
    );
    process.exitCode = 1;
  } else {
    // Small seeded random generator, so the data looks the same every time
    let seed = 20261001;
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = (list) => list[Math.floor(rand() * list.length)];

    // Products: use your real ones if there are enough, otherwise samples
    let products = (await db.collection("groceries").find({}).limit(12).toArray()).map(
      (g) => ({
        _id: g._id,
        name: g.name,
        price: g.price,
        unit: g.unit,
        image: g.image,
      }),
    );
    if (products.length < 5) {
      products = [
        ["Fresh Apples", "320", "kg"],
        ["Milk 1L", "260", "liter"],
        ["Basmati Rice", "540", "kg"],
        ["Eggs", "380", "piece"],
        ["Tea Pack", "450", "pack"],
        ["Bananas", "180", "kg"],
      ].map(([name, price, unit]) => ({
        _id: new mongoose.Types.ObjectId(),
        name,
        price,
        unit,
        image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      }));
    }
    const user = await db.collection("users").findOne({ role: "user" });
    const userId = user?._id ?? new mongoose.Types.ObjectId();

    // Dates: some today, some this month, the rest over the last year.
    // Pakistan is UTC+5 all year (no daylight saving).
    const HOUR = 3600 * 1000;
    const DAY = 24 * HOUR;
    const now = Date.now();
    const pktNow = new Date(now + 5 * HOUR);
    const startToday =
      Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), pktNow.getUTCDate()) -
      5 * HOUR;
    const startMonth =
      Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), 1) - 5 * HOUR;
    const startYear = Date.UTC(pktNow.getUTCFullYear(), 0, 1) - 5 * HOUR;
    const between = (from, to) => from + rand() * (to - from);

    const times = [];
    for (let i = 0; i < 4; i++) times.push(between(startToday, now)); // today
    for (let i = 0; i < 7; i++) times.push(between(startMonth, now)); // this month
    for (let i = 0; i < 9; i++) times.push(between(startYear, now)); // this year
    for (let i = 0; i < 10; i++) times.push(between(now - 365 * DAY, now)); // last 12 months

    const docs = times.map((time) => {
      const itemCount = 1 + Math.floor(rand() * 4);
      const items = [];
      for (let i = 0; i < itemCount; i++) {
        const p = pick(products);
        items.push({
          grocery: p._id,
          name: p.name,
          price: String(p.price),
          unit: p.unit,
          image: p.image,
          quantity: 1 + Math.floor(rand() * 3),
        });
      }
      const subTotal = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
      const totalAmount = subTotal + (subTotal > 3500 ? 0 : 120);

      const online = rand() < 0.4;
      const roll = rand();
      const status =
        roll < 0.55 ? "delivered" : roll < 0.8 ? "out of delivery" : "pending";
      // Card orders are mostly paid; a few were abandoned at the payment page
      const isPaid = online ? rand() < 0.85 : false;
      const created = new Date(Math.floor(time));

      return {
        user: userId,
        items,
        isPaid,
        totalAmount,
        paymentMethod: online ? "online" : "cod",
        address: {
          fullName: MARK,
          mobile: "+923000000000",
          city: "Karachi",
          state: "Sindh",
          pincode: "75000",
          fullAddress: "SEED test address, Karachi",
          latitude: 24.86 + (rand() - 0.5) * 0.1,
          longitude: 67.01 + (rand() - 0.5) * 0.1,
        },
        assignment: null,
        status,
        createdAt: created,
        updatedAt: created,
        __v: 0,
      };
    });

    const revenue = docs
      .filter((d) => d.status === "delivered" || d.isPaid)
      .reduce((s, d) => s + d.totalAmount, 0);
    console.log(`Plan: ${docs.length} fake orders (customer name "${MARK}")`);
    for (const s of ["delivered", "out of delivery", "pending"]) {
      console.log(`  ${s}: ${docs.filter((d) => d.status === s).length}`);
    }
    console.log(
      `  cod: ${docs.filter((d) => d.paymentMethod === "cod").length}, online: ${docs.filter((d) => d.paymentMethod === "online").length}`,
    );
    console.log(`  revenue (delivered or paid online): Rs.${revenue}`);

    if (!confirmed) {
      console.log("Dry run, nothing written. Add --yes to create them.");
    } else {
      const result = await orders.insertMany(docs);
      console.log(`Created ${result.insertedCount} fake orders.`);
      console.log("Remove them with: node scripts/seed-dev-orders.mjs --delete --yes");
    }
  }
} finally {
  await mongoose.disconnect();
}
