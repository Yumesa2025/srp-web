import { NextResponse } from "next/server";
import { getSpellLookup } from "@/app/lib/spellLookup";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spellId = searchParams.get("spellId");

  if (!spellId) {
    return NextResponse.json({ error: "spellId가 필요합니다." }, { status: 400 });
  }

  try {
    const data = await getSpellLookup(spellId);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch {
    const fallback = await getSpellLookup(spellId);
    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=600, stale-while-revalidate=600",
      },
    });
  }
}

