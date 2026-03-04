import { NextResponse } from "next/server";
import { getItemLookup } from "@/app/lib/itemLookup";

const MAX_IDS = 120;

function parseItemIds(value: string | null): string[] {
  if (!value) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((id) => {
      if (!/^\d+$/.test(id)) return;
      if (seen.has(id)) return;
      seen.add(id);
      out.push(id);
    });

  return out.slice(0, MAX_IDS);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = parseItemIds(searchParams.get("ids"));

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids 파라미터가 필요합니다. 예: ?ids=264183,260650" }, { status: 400 });
  }

  const results = await Promise.all(ids.map((id) => getItemLookup(id)));
  const items: Record<string, { name: string; iconUrl: string }> = {};
  results.forEach((item) => {
    items[item.id] = {
      name: item.name,
      iconUrl: item.iconUrl,
    };
  });

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    }
  );
}
