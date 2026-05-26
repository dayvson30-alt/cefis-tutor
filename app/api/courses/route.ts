import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const categories = searchParams.get("categories") || "";
  const count = searchParams.get("count") || "20";
  const cefisKey = req.headers.get("x-cefis-key");

  const params = new URLSearchParams({ count, page: "1" });
  if (search) params.set("search", search);
  if (categories) params.set("categories", categories);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (cefisKey) headers["Authorization"] = `Bearer ${cefisKey}`;

  const res = await fetch(`${process.env.CEFIS_API_V3_URL}/courses?${params}`, { headers });
  const data = await res.json();

  if (!res.ok) return NextResponse.json({ courses: [] }, { status: 200 });

  return NextResponse.json({ courses: data.data || [] });
}
