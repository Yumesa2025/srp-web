import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/app/lib/rateLimit';
import { createClient } from '@/app/utils/supabase/server';

const AiRequestSchema = z.object({
  timeline: z.array(z.unknown()).min(1, "타임라인이 비어 있습니다."),
  healers: z.array(z.unknown()).min(1, "힐러 데이터가 없습니다."),
  spellDictionary: z.record(z.string(), z.unknown()).optional(),
  bossName: z.string().optional(),
});

interface MinimaxResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const rl = checkRateLimit(getClientIp(request), "ai", 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  try {
    // 1. 프론트엔드에서 보낸 데이터(보스 이름, 타임라인, 힐러 목록) 받기
    const rawBody = await request.json();
    const parsed = AiRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const { timeline, healers, spellDictionary, bossName } = parsed.data;

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'MINIMAX API 설정이 필요합니다.' }, { status: 500 });
    }

    // 2. [핵심] AI 공대장에게 내릴 프롬프트(명령어) 작성
    const prompt = `
      너는 월드 오브 워크래프트(WoW) 신화 난이도를 트라이하는 세계 최고의 공격대장이야.
      ${bossName ? `현재 공략 중인 보스는 **${bossName}**이야.` : ""}

      [보스 스킬 사전 (가장 중요함!)]
      ${JSON.stringify(spellDictionary, null, 2)}
      - 위 사전에서 위험도가 '치명적'이거나 '즉사급'인 스킬에만 가장 강력한 공대 생존기(3분 쿨기)를 배분해.
      - 위험도가 '낮음'인 스킬에는 절대 생존기를 배분하지 마.
      - 각 스킬에 memo(공대장 메모)가 있으면, 해당 메모의 의도를 최우선으로 반영해. (산개/뭉침/지속피해/중첩/페이즈 전환 등)

      [보스 스킬 타임라인]
      ${JSON.stringify(timeline, null, 2)}

      [우리 파티의 힐러 명단 및 허락된 생존기 목록]
      ${JSON.stringify(healers, null, 2)}

      위 데이터를 바탕으로 완벽한 '생존기 배분표'를 짜줘.

      [규칙 - 절대 엄수]
      1. 서론: 답변 맨 처음에 "🛡️ **다음과 같은 힐러와 배정된 생존기를 활용하여 택틱을 구성했습니다:**" 라고 적고, 각 힐러의 이름과 내가 허락한(전달받은) 생존기 목록만 불릿 포인트로 나열해 줘.
      2. 스킬 매칭: 타임라인의 'type'을 반드시 읽어라! 
         - '광역', '광역 펄스' 등 공대 전체 피해에는 **공대 생존기**(오라 숙련, 평온, 치유의 해일 토템, 재활, 천상의 찬가 등)를 써야 해.
         - '탱버', '탱커 강타' 등 단일 피해에는 **외생기**(고통 억제, 수호 영혼, 희생의 축복, 시간 팽창, 무쇠껍질 등)를 써야 해. 절대 광역기에 단일 외생기를 던지지 마.
      2-1. memo(공대장 메모)가 있는 스킬은 type/위험도와 함께 반드시 고려하고, 메모와 충돌하는 선택은 하지 마.
      3. 쿨타임 계산: 강력한 생존기는 쿨타임이 3분(180초)이야. 이전에 쓴 스킬을 쿨타임이 돌기 전에 재사용하지 마.
      4. 본론: 서론 뒤에 마크다운 표(시간, 스킬명, 스킬 타입, 담당 힐러, 사용할 생존기)를 예쁘게 그려줘.
      5. 허락받지 않은 스킬(목록에 없는 스킬)은 표에 절대 적지 마.
    `;

    // 3. Minimax API에 전송
    const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "MiniMax-Text-01",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
        console.error(`Minimax API 에러: ${response.status}`);
        throw new Error("AI 서비스 요청에 실패했습니다.");
    }

    const data = (await response.json()) as MinimaxResponse;

    // 4. AI가 짜준 택틱 결과를 프론트엔드로 전달
    const aiTactic = data.choices?.[0]?.message?.content;
    if (!aiTactic) {
      throw new Error("AI 택틱 생성 결과가 비어 있습니다.");
    }
    
    return NextResponse.json({ tactic: aiTactic });

  } catch (error: Error | unknown) {
    console.error("AI 택틱 생성 중 에러:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
