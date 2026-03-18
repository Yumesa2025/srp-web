"use client";

import { useMemo, useRef, useState } from "react";
import LazyImage from "@/app/components/LazyImage";

const FALLBACK_ICON_URL = "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";


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

interface ItemBatchResponse {
  error?: string;
  items?: Record<string, ItemMeta>;
}

function sanitizeGold(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function sanitizeRaidSize(value: number): number {
  if (!Number.isFinite(value)) return 20;
  return Math.max(1, Math.floor(value));
}

export default function RaidMarketTab() {
  const [ledgerInput, setLedgerInput] = useState("");
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [parseIssues, setParseIssues] = useState<ParseIssue[]>([]);
  const [raidSize, setRaidSize] = useState(20);
  const [raidExpenseGold, setRaidExpenseGold] = useState(0);
  const [isItemMetaLoading, setIsItemMetaLoading] = useState(false);

  const itemMetaCacheRef = useRef<Map<string, ItemMeta>>(new Map());

  const payout = useMemo(() => {
    const safeRaidSize = sanitizeRaidSize(raidSize);
    const safeRaidExpenseGold = sanitizeGold(raidExpenseGold);
    const totalGold = ledgerItems.reduce((sum, item) => sum + item.gold, 0);
    const raidExpenseAmount = Math.min(totalGold, safeRaidExpenseGold);
    const distributableGold = Math.max(0, totalGold - raidExpenseAmount);
    const perPersonGold = Math.floor(distributableGold / safeRaidSize);
    const remainderGold = distributableGold - perPersonGold * safeRaidSize;

    return {
      safeRaidSize,
      safeRaidExpenseGold,
      totalGold,
      raidExpenseAmount,
      distributableGold,
      perPersonGold,
      remainderGold,
    };
  }, [ledgerItems, raidSize, raidExpenseGold]);

  const winnerSummary = useMemo(() => {
    const map = new Map<string, number>();
    ledgerItems.forEach((item) => {
      map.set(item.winner, (map.get(item.winner) || 0) + item.gold);
    });

    return Array.from(map.entries())
      .map(([winner, total]) => ({ winner, total }))
      .sort((a, b) => b.total - a.total);
  }, [ledgerItems]);

  const highestBid = useMemo(() => {
    if (ledgerItems.length === 0) return null;
    return [...ledgerItems].sort((a, b) => b.gold - a.gold)[0] || null;
  }, [ledgerItems]);

  const resolveItemMeta = async (itemIds: string[]) => {
    const idsToFetch = itemIds.filter((id) => !itemMetaCacheRef.current.has(id));
    if (idsToFetch.length === 0) return;

    setIsItemMetaLoading(true);
    try {
      const res = await fetch(`/api/item/batch?ids=${idsToFetch.join(",")}`);
      const data = (await res.json()) as ItemBatchResponse;
      if (!res.ok) {
        throw new Error(data.error || "아이템 정보를 불러오지 못했습니다.");
      }

      const incoming = data.items || {};
      Object.entries(incoming).forEach(([id, meta]) => {
        if (!/^\d+$/.test(id)) return;
        itemMetaCacheRef.current.set(id, {
          name: meta.name || `아이템 (ID: ${id})`,
          iconUrl: meta.iconUrl || FALLBACK_ICON_URL,
        });
      });

      setLedgerItems((prev) =>
        prev.map((item) => {
          const meta = itemMetaCacheRef.current.get(item.itemId);
          if (!meta) return item;
          return { ...item, itemName: meta.name, iconUrl: meta.iconUrl };
        })
      );
    } catch {
      // keep fallback names/icons
    } finally {
      setIsItemMetaLoading(false);
    }
  };

  const processLedgerData = async () => {
    const rawRows = ledgerInput
      .split(/[\n|]+/g)
      .map((row) => row.trim())
      .filter(Boolean);

    if (rawRows.length === 0) {
      setLedgerItems([]);
      setParseIssues([]);
      return;
    }

    const issues: ParseIssue[] = [];
    const parsed: LedgerItem[] = rawRows.map((rowText, index) => {
      const rowNumber = index + 1;
      const cols = rowText.split(";").map((col) => col.trim());
      const itemIdRaw = cols[0] || "";
      const winnerRaw = cols[1] || "";
      const goldRaw = cols[2] || "";

      const itemId = itemIdRaw.replace(/[^\d]/g, "");
      if (!itemId) {
        issues.push({ rowNumber, rowText, reason: "아이템 ID가 비어있거나 숫자가 아닙니다." });
      }

      const winner = winnerRaw || "미분배";
      if (!winnerRaw) {
        issues.push({ rowNumber, rowText, reason: "낙찰자가 비어 있어 '미분배'로 처리했습니다." });
      }

      const gold = Number.parseInt(goldRaw.replace(/,/g, ""), 10);
      if (!Number.isFinite(gold) || gold < 0) {
        issues.push({ rowNumber, rowText, reason: "골드 값이 잘못되어 0으로 처리했습니다." });
      }

      const safeItemId = itemId || `unknown-${rowNumber}`;
      const meta = itemMetaCacheRef.current.get(safeItemId);

      return {
        rowId: `${safeItemId}-${rowNumber}`,
        itemId: safeItemId,
        winner,
        gold: Number.isFinite(gold) && gold >= 0 ? gold : 0,
        itemName: meta?.name || `아이템 (ID: ${safeItemId})`,
        iconUrl: meta?.iconUrl || FALLBACK_ICON_URL,
      };
    });

    setParseIssues(issues);
    setLedgerItems(parsed);

    const validItemIds = Array.from(
      new Set(
        parsed
          .map((item) => item.itemId)
          .filter((id) => /^\d+$/.test(id))
      )
    );

    if (validItemIds.length > 0) {
      await resolveItemMeta(validItemIds);
    }
  };

  const resetLedger = () => {
    setLedgerInput("");
    setLedgerItems([]);
    setParseIssues([]);
  };

  const copySettlementSummary = async () => {
    if (ledgerItems.length === 0) return;

    const lines: string[] = [];
    lines.push("[SRP 전리품 정산]");
    lines.push(`총 모금액: ${payout.totalGold.toLocaleString()}G`);
    if (payout.raidExpenseAmount > 0) {
      lines.push(`공대비: ${payout.raidExpenseAmount.toLocaleString()}G`);
    }
    lines.push(`분배 대상: ${payout.distributableGold.toLocaleString()}G`);
    lines.push(`1인당 분배금(${payout.safeRaidSize}인): ${payout.perPersonGold.toLocaleString()}G`);
    if (payout.remainderGold > 0) {
      lines.push(`잔액: ${payout.remainderGold.toLocaleString()}G`);
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      alert("정산 요약을 클립보드에 복사했습니다.");
    } catch {
      alert("클립보드 복사에 실패했습니다.");
    }
  };

  return (
    <div className="mb-8 p-6 bg-gray-800 rounded-xl shadow-lg border-2 border-yellow-500/50">
      <h2 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-2">💰 전리품 및 골드 정산소</h2>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <textarea
          value={ledgerInput}
          onChange={(e) => setLedgerInput(e.target.value)}
          placeholder="애드온 장부를 붙여넣으세요. 예) 264183;닉네임;10000|260650;닉네임;10000"
          rows={4}
          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-green-300 font-mono text-sm outline-none focus:border-yellow-500 resize-y"
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={processLedgerData}
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg transition-colors shadow-md"
          >
            장부 불러오기 📥
          </button>
          <button
            onClick={copySettlementSummary}
            disabled={ledgerItems.length === 0}
            className="px-6 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-700 text-white font-bold rounded-lg transition-colors"
          >
            정산 요약 복사 📋
          </button>
          <button
            onClick={resetLedger}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            초기화
          </button>
          {isItemMetaLoading && <span className="text-xs text-gray-400 self-center">아이템 메타 정보 로딩 중...</span>}
        </div>
      </div>

      {parseIssues.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-amber-700/60 bg-amber-950/20">
          <div className="text-amber-300 font-semibold text-sm mb-2">입력 경고 {parseIssues.length}건</div>
          <div className="max-h-[140px] overflow-y-auto space-y-1 text-xs text-amber-200">
            {parseIssues.map((issue, idx) => (
              <div key={`${issue.rowNumber}-${idx}`}>
                {issue.rowNumber}행: {issue.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {ledgerItems.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          <div className="xl:col-span-2 bg-gray-900 rounded-lg p-4 border border-gray-700 max-h-[460px] overflow-y-auto">
            <h3 className="text-gray-300 font-bold mb-4 border-b border-gray-700 pb-2">📦 거래 상세 내역 ({ledgerItems.length}건)</h3>
            <div className="space-y-2">
              {ledgerItems.map((item) => (
                <div key={item.rowId} className="flex justify-between items-center p-3 bg-gray-800 rounded-md border border-gray-700 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <LazyImage
                      src={item.iconUrl}
                      alt={item.itemName}
                      className="w-8 h-8 rounded border border-gray-600 shrink-0"
                    />
                    <div className="min-w-0">
                      <a
                        href={/^\d+$/.test(item.itemId) ? `https://www.wowhead.com/ko/item=${item.itemId}` : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-300 hover:text-purple-200 hover:underline font-semibold text-sm truncate block"
                      >
                        {item.itemName}
                      </a>
                      <div className="text-xs text-gray-400">
                        ID: <span className="font-mono">{item.itemId}</span> | 낙찰자: <span className="text-gray-200 font-semibold">{item.winner}</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-yellow-400 font-bold shrink-0">{item.gold.toLocaleString()} G</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-900/10 rounded-lg p-5 border border-yellow-600/50 flex flex-col gap-5">
            <div>
              <h3 className="text-yellow-300 font-bold text-lg mb-4">🧮 분배 계산기</h3>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400 text-sm">공대원 수</span>
                <input
                  type="number"
                  min={1}
                  value={raidSize}
                  onChange={(e) => setRaidSize(sanitizeRaidSize(Number(e.target.value)))}
                  className="w-20 p-1 bg-gray-800 border border-gray-600 rounded text-center text-white outline-none"
                />
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-sm">공대비(골드)</span>
                <input
                  type="number"
                  min={0}
                  value={raidExpenseGold}
                  onChange={(e) => setRaidExpenseGold(sanitizeGold(Number(e.target.value)))}
                  className="w-20 p-1 bg-gray-800 border border-gray-600 rounded text-center text-white outline-none"
                />
              </div>
              <div className="space-y-2 border-t border-gray-700 pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">총 모금액</span>
                  <span className="text-yellow-300 font-semibold">{payout.totalGold.toLocaleString()} G</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">공대비</span>
                  <span className="text-red-300">- {payout.raidExpenseAmount.toLocaleString()} G</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">분배 대상</span>
                  <span className="text-gray-200">{payout.distributableGold.toLocaleString()} G</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">분배 잔액</span>
                  <span className="text-gray-200">{payout.remainderGold.toLocaleString()} G</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-900 rounded-lg border border-yellow-500 text-center">
              <div className="text-gray-400 text-sm mb-1">최종 1인당 분배금</div>
              <div className="text-3xl font-bold text-yellow-200">
                {payout.perPersonGold.toLocaleString()} <span className="text-lg">G</span>
              </div>
            </div>

            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div className="text-sm font-semibold text-gray-300 mb-2">낙찰자별 낙찰금 합계</div>
              <div className="max-h-[180px] overflow-y-auto space-y-1 text-xs">
                {winnerSummary.map((entry) => (
                  <div key={entry.winner} className="flex justify-between text-gray-300">
                    <span className="truncate pr-2">{entry.winner}</span>
                    <span className="font-mono text-yellow-300">{entry.total.toLocaleString()}G</span>
                  </div>
                ))}
              </div>
            </div>

            {highestBid && (
              <div className="text-xs text-gray-400">
                최고 낙찰: <span className="text-yellow-300">{highestBid.itemName}</span> ({highestBid.gold.toLocaleString()}G)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
