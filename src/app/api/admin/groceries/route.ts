import { checkCategory } from "@/lib/groceryOptions";
import connectDb from "@/lib/mongodb";
import { requireAuth } from "@/lib/requireAuth";
import Grocery from "@/models/grocery.model";
import { NextRequest, NextResponse } from "next/server";

const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/admin/groceries?search=milk&category=Dairy%20%26%20Eggs
// Lists products for the admin, with optional name search and category filter.
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(["admin"]);
    if ("error" in authResult) return authResult.error;

    const search = (req.nextUrl.searchParams.get("search") ?? "")
      .trim()
      .slice(0, 100);
    const category = req.nextUrl.searchParams.get("category");

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.name = { $regex: escapeRegex(search), $options: "i" };
    }
    if (category && category !== "all") {
      const checked = checkCategory(category);
      if (!checked.ok) {
        return NextResponse.json({ message: checked.message }, { status: 400 });
      }
      filter.category = checked.value;
    }

    await connectDb();
    const groceries = await Grocery.find(filter).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      // Older products have no inStock value: they count as in stock
      groceries.map((g) => ({ ...g, inStock: g.inStock !== false })),
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `get groceries error: ${error}` },
      { status: 500 },
    );
  }
}
