"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LazyImage from "@/app/components/LazyImage";
import { useMarketStorage } from "@/app/hooks/useMarketStorage";
import RaidSavePanel from "./RaidSavePanel";
import RaidHistorySection from "./RaidHistorySection";
import DiscordSendButton from "@/app/components/discord/DiscordSendButton";

const FALLBACK_ICON = "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";

interface LedgerItem {
  rowId: string;
  itemId: string;
  winner: string;
  gold: number;
  itemName: string;
  iconUrl: string;
}

interface ParseIssue {
  rowNumber: number;
  rowText: string;
  reason: string;
}

interface ItemMeta {
  name: string;
  iconUrl: string;
}

function sanitizeInt(v: number, fallback: number, min = 0): number {
  return Number.isFinite(v) ? Math.max(min, Math.floor(v)) : fallback;
}

export default function RaidMarketTab() {
  const [ledgerInput, setLedgerInput]   = useState("");
  const [ledgerItems, setLedgerItems]   = useState<LedgerItem[]>([]);
  const [parseIssues, setParseIssues]   = useState<ParseIssue[]>([]);
  const [raidSize, setRaidSize]         = useState(20);
  const [raidExpense, setRaidExpense]   = useState(0);
  const [raidBonus, setRaidBonus]       = useState(0);
  const [isMetaLoading, setIsMetaLoading] = useState(false);

  const metaCacheRef = useRef<Map<string, ItemMeta>>(new Map());
  // 투어 중 원래 입력값 저장용
  const preTourInputRef = useRef<string | null>(null);
  // 최신 ledgerInput을 이벤트 핸들러에서 참조하기 위한 ref
  const ledgerInputRef = useRef(ledgerInput);
  useEffect(() => { ledgerInputRef.current = ledgerInput; }, [ledgerInput]);

  const storage = useMarketStorage();

  const TOUR_EXAMPLE =
    '249374;가로쉬;10000|256656;가로쉬;10000|249348;실바나스;10000|249805;스랄;10000|249343;제이나;10000|249381;스랄;10000';

  // 투어 시작/종료 이벤트 처리 (마운트 시 한 번만 등록)
  useEffect(() => {
    const onStart = () => {
      preTourInputRef.current = ledgerInputRef.current;
      setLedgerInput(TOUR_EXAMPLE);
      processLedger(TOUR_EXAMPLE);
    };
    const onEnd = () => {
      const original = preTourInputRef.current ?? '';
      preTourInputRef.current = null;
      setLedgerInput(original);
      processLedger(original);
    };
    window.addEventListener('srp-tour-market-start', onStart);
    window.addEventListener('srp-tour-market-end', onEnd);
    return () => {
      window.removeEventListener('srp-tour-market-start', onStart);
      window.removeEventListener('srp-tour-market-end', onEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 정산 계산 ──────────────────────────────────────────────
  const payout = useMemo(() => {
    const safeSize    = sanitizeInt(raidSize, 20, 1);
    const safeExpense = sanitizeInt(raidExpense, 0);
    const safeBonus   = sanitizeInt(raidBonus, 0);
    const totalGold   = ledgerItems.reduce((s, i) => s + i.gold, 0);
    const expenseAmt  = Math.min(totalGold + safeBonus, safeExpense);
    const distributable = Math.max(0, totalGold + safeBonus - expenseAmt);
    const perPerson   = Math.floor(distributable / safeSize);
    const remainder   = distributable - perPerson * safeSize;
    return { safeSize, safeExpense, safeBonus, totalGold, expenseAmt, distributable, perPerson, remainder };
  }, [ledgerItems, raidSize, raidExpense, raidBonus]);

  const winnerSummary = useMemo(() => {
    const map = new Map<string, number>();
    ledgerItems.forEach((i) => map.set(i.winner, (map.get(i.winner) ?? 0) + i.gold));
    return Array.from(map.entries())
      .map(([winner, total]) => ({ winner, total }))
      .sort((a, b) => b.total - a.total);
  }, [ledgerItems]);

  const highestBid = useMemo(() =>
    ledgerItems.length ? [...ledgerItems].sort((a, b) => b.gold - a.gold)[0] : null,
    [ledgerItems]
  );

  // ── 아이템 메타 조회 ────────────────────────────────────────
  const resolveItemMeta = async (ids: string[]) => {
    const toFetch = ids.filter((id) => !metaCacheRef.current.has(id));
    if (!toFetch.length) return;
    setIsMetaLoading(true);
    try {
      const res  = await fetch(`/api/item/batch?ids=${toFetch.join(",")}`);
      const data = (await res.json()) as { items?: Record<string, ItemMeta>; error?: string };
      if (!res.ok) throw new Error(data.error);
      Object.entries(data.items ?? {}).forEach(([id, meta]) => {
        if (/^\d+$/.test(id))
          metaCacheRef.current.set(id, { name: meta.name || `아이템 (${id})`, iconUrl: meta.iconUrl || FALLBACK_ICON });
      });
      setLedgerItems((prev) =>
        prev.map((item) => {
          const meta = metaCacheRef.current.get(item.itemId);
          return meta ? { ...item, itemName: meta.name, iconUrl: meta.iconUrl } : item;
        })
      );
    } catch { /* fallback names/icons 유지 */ }
    finally { setIsMetaLoading(false); }
  };

  // ── 장부 파싱 ──────────────────────────────────────────────
  const processLedger = async (inputOverride?: string) => {
    const input  = inputOverride ?? ledgerInput;
    const rawRows = input.split(/[\n|]+/g).map((r) => r.trim()).filter(Boolean);

    if (!rawRows.length) { setLedgerItems([]); setParseIssues([]); return; }

    const issues: ParseIssue[] = [];
    const parsed: LedgerItem[] = rawRows.map((rowText, idx) => {
      const rowNumber = idx + 1;
      const [c0, c1, c2] = rowText.split(";").map((c) => c.trim());
      const itemId  = (c0 ?? "").replace(/\D/g, "");
      const winner  = c1 || "미분배";
      const gold    = Number.parseInt((c2 ?? "").replace(/,/g, ""), 10);

      if (!itemId)                         issues.push({ rowNumber, rowText, reason: "아이템 ID가 비어있거나 숫자가 아닙니다." });
      if (!c1)                             issues.push({ rowNumber, rowText, reason: "낙찰자가 비어 있어 '미분배'로 처리했습니다." });
      if (!Number.isFinite(gold) || gold < 0) issues.push({ rowNumber, rowText, reason: "골드 값이 잘못되어 0으로 처리했습니다." });

      const safeId = itemId || `unknown-${rowNumber}`;
      const meta   = metaCacheRef.current.get(safeId);
      return {
        rowId: `${safeId}-${rowNumber}`,
        itemId: safeId,
        winner,
        gold: Number.isFinite(gold) && gold >= 0 ? gold : 0,
        itemName: meta?.name  ?? `아이템 (${safeId})`,
        iconUrl:  meta?.iconUrl ?? FALLBACK_ICON,
      };
    });

    setParseIssues(issues);
    setLedgerItems(parsed);

    const validIds = [...new Set(parsed.map((i) => i.itemId).filter((id) => /^\d+$/.test(id)))];
    if (validIds.length) await resolveItemMeta(validIds);
  };

  // ── 회차 불러오기 콜백 ──────────────────────────────────────
  const handleLoadSession = (session: { label: string; raw_input: string; raid_size: number; raid_expense: number }) => {
    setLedgerInput(session.raw_input);
    setRaidSize(session.raid_size);
    setRaidExpense(session.raid_expense);
    processLedger(session.raw_input);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── 정산 복사 ─────────────────────────────────────────────
  const copySettlement = async () => {
    if (!ledgerItems.length) return;
    const lines = [
      "[SRP 전리품 정산]",
      `총 모금액: ${payout.totalGold.toLocaleString()}G`,
      payout.safeBonus > 0 ? `추가금: ${payout.safeBonus.toLocaleString()}G` : null,
      payout.expenseAmt > 0 ? `공대비: ${payout.expenseAmt.toLocaleString()}G` : null,
      `분배 대상: ${payout.distributable.toLocaleString()}G`,
      `1인당 분배금(${payout.safeSize}인): ${payout.perPerson.toLocaleString()}G`,
      payout.remainder > 0 ? `잔액: ${payout.remainder.toLocaleString()}G` : null,
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      alert("정산 요약을 클립보드에 복사했습니다.");
    } catch { alert("클립보드 복사에 실패했습니다."); }
  };

  const saveItems = ledgerItems.map((i) => ({
    item_id:   i.itemId,
    item_name: i.itemName,
    icon_url:  i.iconUrl,
    winner:    i.winner,
    gold:      i.gold,
  }));

  return (
    <div className="space-y-0">
      {/* ── 메인 카드 ─────────────────────────────────────────── */}
      <div className="p-6 bg-gray-800 rounded-xl border border-yellow-500/30 shadow-xl">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
              💰 전리품 및 골드 정산소
            </h2>
            <p className="text-gray-500 text-xs mt-1">
              애드온 장부를 붙여넣으면 자동으로 파싱하고 1인당 분배금을 계산합니다
            </p>
          </div>
          {isMetaLoading && (
            <span className="text-xs text-gray-500 animate-pulse mt-1">아이템 정보 조회 중...</span>
          )}
        </div>

        {/* 입력 영역 */}
        <textarea
          data-tour="market-input"
          value={ledgerInput}
          onChange={(e) => setLedgerInput(e.target.value)}
          placeholder={"애드온 장부를 붙여넣으세요\n형식: 아이템ID;낙찰자;골드\n예: 264183;아크로;10000|260650;발리안;8000"}
          rows={5}
          className="w-full p-3.5 bg-gray-900 border border-gray-700 rounded-xl text-green-300 font-mono text-sm outline-none focus:border-yellow-500 resize-y placeholder-gray-600 transition-colors leading-relaxed"
        />

        <div className="flex flex-wrap gap-2.5 mt-3">
          <button
            data-tour="market-load-btn"
            onClick={() => processLedger()}
            className="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg transition-colors text-sm shadow"
          >
            장부 불러오기 📥
          </button>
          <button
            onClick={copySettlement}
            disabled={!ledgerItems.length}
            className="px-5 py-2 bg-sky-700 hover:bg-sky-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors text-sm"
          >
            정산 요약 복사 📋
          </button>
          {ledgerItems.length > 0 && storage.isLoggedIn && (
            <DiscordSendButton
              label="Discord 전송"
              onSend={async () => {
                const res = await fetch('/api/discord', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'market',
                    label: `${new Date().toLocaleDateString('ko-KR')} 정산`,
                    raidSize: payout.safeSize,
                    totalGold: payout.totalGold,
                    raidExpense: payout.expenseAmt,
                    perPerson: payout.perPerson,
                    items: ledgerItems.map((i) => ({ itemName: i.itemName, winner: i.winner, gold: i.gold })),
                  }),
                });
                if (!res.ok) {
                  const data = await res.json() as { error?: string };
                  throw new Error(data.error ?? 'Discord 전송 실패');
                }
              }}
            />
          )}
          <button
            onClick={() => { setLedgerInput(""); setLedgerItems([]); setParseIssues([]); }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-lg transition-colors text-sm"
          >
            초기화
          </button>
        </div>

        {/* 경고 */}
        {parseIssues.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl border border-amber-700/40 bg-amber-950/20">
            <p className="text-amber-300 font-semibold text-xs mb-1.5">⚠ 입력 경고 {parseIssues.length}건</p>
            <div className="max-h-28 overflow-y-auto space-y-0.5 text-xs text-amber-200/80">
              {parseIssues.map((issue, idx) => (
                <p key={idx}>{issue.rowNumber}행: {issue.reason}</p>
              ))}
            </div>
          </div>
        )}

        {/* 결과 */}
        {ledgerItems.length > 0 && (
          <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* ── 아이템 목록 ── */}
            <div className="xl:col-span-2 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-gray-300 font-bold text-xl">📦 거래 내역</h3>
                <span className="text-sm text-gray-600">{ledgerItems.length}건</span>
              </div>
              <div className="divide-y divide-gray-800 max-h-[520px] overflow-y-auto">
                {ledgerItems.map((item) => (
                  <div
                    key={item.rowId}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <LazyImage
                        src={item.iconUrl}
                        alt={item.itemName}
                        className="w-12 h-12 rounded-lg border border-gray-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <a
                          href={/^\d+$/.test(item.itemId) ? `https://www.wowhead.com/ko/item=${item.itemId}` : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-300 hover:text-purple-200 hover:underline font-semibold text-lg truncate block"
                        >
                          {item.itemName}
                        </a>
                        <p className="text-sm text-gray-500 mt-0.5">
                          ID: <span className="font-mono">{item.itemId}</span>
                          {" · "}낙찰자: <span className="text-gray-300 font-medium">{item.winner}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-yellow-400 font-bold text-lg shrink-0">
                      {item.gold.toLocaleString()} G
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 계산기 + 저장 ── */}
            <div className="flex flex-col gap-4">
              {/* 계산기 */}
              <div data-tour="market-calculator" className="bg-gray-900 rounded-xl border border-gray-700 p-4">
                <h3 className="text-yellow-300 font-bold text-xl mb-4 flex items-center gap-1.5">
                  🧮 분배 계산기
                </h3>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-lg">공대원 수</span>
                    <input
                      type="number" min={1} value={raidSize}
                      onChange={(e) => setRaidSize(sanitizeInt(Number(e.target.value), 20, 1))}
                      className="w-24 p-1.5 bg-gray-800 border border-gray-600 rounded-lg text-center text-white text-lg outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-lg">공대비(G)</span>
                    <input
                      type="number" min={0} value={raidExpense}
                      onChange={(e) => setRaidExpense(sanitizeInt(Number(e.target.value), 0))}
                      className="w-24 p-1.5 bg-gray-800 border border-gray-600 rounded-lg text-center text-white text-lg outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-lg">공대 추가금(G)</span>
                    <input
                      type="number" min={0} value={raidBonus}
                      onChange={(e) => setRaidBonus(sanitizeInt(Number(e.target.value), 0))}
                      className="w-24 p-1.5 bg-gray-800 border border-gray-600 rounded-lg text-center text-white text-lg outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-gray-700 pt-3 text-lg">
                  {[
                    { label: "총 모금액",  value: `${payout.totalGold.toLocaleString()} G`,      color: "text-yellow-300" },
                    ...(payout.safeBonus > 0 ? [{ label: "추가금", value: `+ ${payout.safeBonus.toLocaleString()} G`, color: "text-emerald-400" }] : []),
                    { label: "공대비",     value: `- ${payout.expenseAmt.toLocaleString()} G`,    color: "text-red-300" },
                    { label: "분배 대상",  value: `${payout.distributable.toLocaleString()} G`,   color: "text-gray-300" },
                    { label: "분배 잔액",  value: `${payout.remainder.toLocaleString()} G`,        color: "text-gray-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-gray-500">{label}</span>
                      <span className={`font-mono font-semibold ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* 1인당 */}
                <div className="mt-4 p-4 bg-gray-800 rounded-xl border border-yellow-500/40 text-center">
                  <p className="text-gray-500 text-sm mb-1">최종 1인당 분배금</p>
                  <p className="text-5xl font-bold text-yellow-200">
                    {payout.perPerson.toLocaleString()}
                    <span className="text-2xl text-yellow-400 ml-1">G</span>
                  </p>
                  <p className="text-gray-600 text-sm mt-1">{payout.safeSize}인 기준</p>
                </div>

                {highestBid && (
                  <p className="mt-3 text-sm text-gray-600 text-center">
                    최고 낙찰 · <span className="text-purple-400">{highestBid.itemName}</span>
                    {" "}{highestBid.gold.toLocaleString()}G
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 저장 패널 (로그인 + 아이템 있을 때) */}
        {storage.isLoggedIn && ledgerItems.length > 0 && (
          <div data-tour="market-save">
            <RaidSavePanel
              raidSize={raidSize}
              raidExpense={raidExpense}
              totalGold={payout.totalGold}
              perPerson={payout.perPerson}
              rawInput={ledgerInput}
              isSaving={storage.isSaving}
              onSave={storage.saveSession}
              items={saveItems}
            />
          </div>
        )}

        {/* 로그인 유도 (비로그인) */}
        {!storage.isLoggedIn && (
          <div className="mt-5 p-3.5 rounded-xl bg-gray-900/60 border border-gray-700 text-center">
            <p className="text-gray-500 text-xs">
              🔒 로그인하면 회차를 저장하고 누적 통계를 확인할 수 있습니다
            </p>
          </div>
        )}
      </div>

      {/* ── 누적 기록 섹션 (로그인 시) ───────────────────────── */}
      {storage.isLoggedIn && (
        <div data-tour="market-history">
          <RaidHistorySection
            sessions={storage.sessions}
            isLoading={storage.isLoading}
            onLoadSession={handleLoadSession}
            onDeleteSession={storage.deleteSession}
            onFetchAllItems={storage.fetchAllItems}
          />
        </div>
      )}
    </div>
  );
}
