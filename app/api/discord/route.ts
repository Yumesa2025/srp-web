import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

interface RosterPlayer {
  name: string;
  activeSpec?: string;
  itemLevel?: number;
  role: string;
}

interface RosterPayload {
  type: 'roster';
  players: RosterPlayer[];
}

interface MarketPayload {
  type: 'market';
  label: string;
  raidSize: number;
  totalGold: number;
  raidExpense: number;
  perPerson: number;
  items: { itemName: string; winner: string; gold: number }[];
}

type DiscordPayload = RosterPayload | MarketPayload;

const ROLE_LABEL: Record<string, string> = {
  TANK: '🛡️ 탱커',
  MELEE: '⚔️ 근접 딜러',
  RANGED: '🏹 원거리 딜러',
  HEALER: '💚 힐러',
  UNASSIGNED: '❓ 미분류',
};

function buildRosterEmbed(players: RosterPlayer[]) {
  const groups: Record<string, RosterPlayer[]> = {
    TANK: [], MELEE: [], RANGED: [], HEALER: [], UNASSIGNED: [],
  };
  players.forEach((p) => {
    const key = p.role in groups ? p.role : 'UNASSIGNED';
    groups[key].push(p);
  });

  const fields = (['TANK', 'HEALER', 'MELEE', 'RANGED', 'UNASSIGNED'] as const)
    .filter((role) => groups[role].length > 0)
    .map((role) => ({
      name: `${ROLE_LABEL[role]} (${groups[role].length})`,
      value: groups[role]
        .map((p) => {
          const spec = p.activeSpec ? ` · ${p.activeSpec}` : '';
          const ilvl = p.itemLevel ? ` \`${p.itemLevel}\`` : '';
          return `${p.name}${spec}${ilvl}`;
        })
        .join('\n')
        .slice(0, 1024),
      inline: true,
    }));

  return {
    embeds: [{
      title: '📋 공대 구성 현황',
      color: 0x3b82f6,
      fields,
      footer: { text: `SRP · 전체 ${players.length}명` },
      timestamp: new Date().toISOString(),
    }],
  };
}

function buildMarketEmbed(payload: MarketPayload) {
  const topItems = [...payload.items]
    .sort((a, b) => b.gold - a.gold)
    .slice(0, 10)
    .map((i) => `**${i.itemName}** — ${i.winner} · ${i.gold.toLocaleString()}G`)
    .join('\n');

  const fields = [
    { name: '총 모금', value: `${payload.totalGold.toLocaleString()}G`, inline: true },
    { name: '공대비', value: `${payload.raidExpense.toLocaleString()}G`, inline: true },
    { name: '인원', value: `${payload.raidSize}명`, inline: true },
    { name: '1인당 정산', value: `**${payload.perPerson.toLocaleString()}G**`, inline: false },
  ];

  if (topItems) {
    fields.push({ name: `낙찰 목록 (상위 ${Math.min(payload.items.length, 10)}개)`, value: topItems.slice(0, 1024), inline: false });
  }

  return {
    embeds: [{
      title: `💰 ${payload.label} · 공대 정산`,
      color: 0xf59e0b,
      fields,
      footer: { text: 'SRP' },
      timestamp: new Date().toISOString(),
    }],
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('discord_webhook_url')
    .eq('user_id', user.id)
    .maybeSingle();

  const webhookUrl = settings?.discord_webhook_url;
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return NextResponse.json({ error: 'Discord Webhook URL이 설정되지 않았습니다.' }, { status: 400 });
  }

  let payload: DiscordPayload;
  try {
    payload = (await request.json()) as DiscordPayload;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const discordBody = payload.type === 'roster'
    ? buildRosterEmbed(payload.players)
    : buildMarketEmbed(payload);

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordBody),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('Discord webhook 전송 실패:', res.status, errText);
    return NextResponse.json({ error: 'Discord 전송에 실패했습니다.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
