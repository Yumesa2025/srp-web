import { NextResponse } from "next/server";
import { getSpellLookup } from "@/app/lib/spellLookup";

const MAX_IDS = 120;

function parseSpellIds(value: string | null): string[] {
  if (!value) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((id) => {
      // Keep numeric spell IDs only.
      if (!/^\d+$/.test(id)) return;
      if (seen.has(id)) return;
      seen.add(id);
      out.push(id);
    });
  return out.slice(0, MAX_IDS);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = parseSpellIds(searchParams.get("ids"));
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids 파라미터가 필요합니다. 예: ?ids=1223364,1234699" }, { status: 400 });
  }

  const results = await Promise.all(ids.map((id) => getSpellLookup(id)));
  const spells: Record<string, { name: string; iconUrl: string; description: string }> = {};
  results.forEach((item) => {
    spells[item.id] = {
      name: item.name,
      iconUrl: item.iconUrl,
      description: item.description,
    };
  });

  return NextResponse.json(
    { spells },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    }
  );
}
