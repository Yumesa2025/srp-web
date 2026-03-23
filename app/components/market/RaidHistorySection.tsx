"use client";

import { useState, useEffect, useMemo } from "react";
import { RaidSession, RaidItemRecord } from "@/app/hooks/useMarketStorage";
import LazyImage from "@/app/components/LazyImage";

type Tab = "sessions" | "items" | "gold";
type SortKey = "count" | "avgGold" | "totalGold";

interface ItemStat {
  item_id: string;
  item_name: string;
  icon_url: string;
  count: number;
  totalGold: number;
  avgGold: number;
  maxGold: number;
  recentWinner: string;
}

interface Props {
  sessions: RaidSession[];
  isLoading: boolean;
  onLoadSession: (session: RaidSession) => void;
  onDeleteSession: (id: string) => void;
  onFetchAllItems: () => Promise<RaidItemRecord[]>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });
}

const TABS: { key: Tab; label: string }[] = [
  { key: "sessions", label: "📋 회차 목록" },
  { key: "items",    label: "📦 아이템 통계" },
  { key: "gold",     label: "📈 골드 추이" },
];

export default function RaidHistorySection({
  sessions, isLoading, onLoadSession, onDeleteSession, onFetchAllItems,
}: Props) {
  const [tab, setTab] = useState<Tab>("sessions");
  const [allItems, setAllItems] = useState<RaidItemRecord[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("count");

  useEffect(() => {
    if (tab !== "items" || itemsLoaded) return;
    let canceled = false;
    async function load() {
      setIsItemsLoading(true);
      const items = await onFetchAllItems();
      if (canceled) return;
      setAllItems(items);
      setItemsLoaded(true);
      setIsItemsLoading(false);
    }
    load();
    return () => { canceled = true; };
  }, [tab, itemsLoaded, onFetchAllItems]);

  // 아이템 통계 집계 (item_id 기준 그룹)
  const itemStats = useMemo<ItemStat[]>(() => {
    const map = new Map<string, ItemStat>();
    allItems.forEach((item) => {
      const existing = map.get(item.item_id);
      if (!existing) {
        map.set(item.item_id, {
          item_id: item.item_id,
          item_name: item.item_name || `아이템 (${item.item_id})`,
          icon_url: item.icon_url,
          count: 1,
          totalGold: item.gold,
          avgGold: item.gold,
          maxGold: item.gold,
          recentWinner: item.winner,
        });
      } else {
        existing.count++;
        existing.totalGold += item.gold;
        existing.avgGold = Math.round(existing.totalGold / existing.count);
        existing.maxGold = Math.max(existing.maxGold, item.gold);
      }
    });
    return Array.from(map.values());
  }, [allItems]);

  const sortedStats = useMemo(() => {
    return [...itemStats].sort((a, b) => {
      if (sortBy === "count") return b.count - a.count;
      if (sortBy === "avgGold") return b.avgGold - a.avgGold;
      return b.totalGold - a.totalGold;
    });
  }, [itemStats, sortBy]);

  const maxPerPerson = useMemo(
    () => sessions.reduce((m, s) => Math.max(m, s.per_person), 1),
    [sessions]
  );

  const totalGoldAll = sessions.reduce((s, r) => s + r.total_gold, 0);

  return (
    <div className="mt-6 rounded-xl bg-gray-800/60 border border-purple-500/20">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
        <div>
          <h3 className="text-purple-300 font-bold text-base">📊 누적 기록</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {sessions.length}회차 저장됨 · 누적 모금 {totalGoldAll.toLocaleString()}G
          </p>
        </div>
        {/* 탭 */}
        <div className="flex gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === key
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-5">

        {/* ── 회차 목록 ── */}
        {tab === "sessions" && (
          <>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500 text-sm">불러오는 중...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm">아직 저장된 회차가 없습니다.</p>
                <p className="text-gray-600 text-xs mt-1">장부를 입력하고 저장해보세요!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-gray-900 rounded-xl border border-gray-700 hover:border-purple-500/40 transition-colors p-4 flex flex-col gap-3"
                  >
                    {/* 제목 + 날짜 */}
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">{session.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(session.created_at)}</p>
                    </div>
                    {/* 골드 스탯 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">총 모금</p>
                        <p className="text-yellow-400 font-bold text-sm">{session.total_gold.toLocaleString()}G</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">1인당</p>
                        <p className="text-yellow-300 font-bold text-sm">{session.per_person.toLocaleString()}G</p>
                      </div>
                    </div>
                    {/* 인원 / 공대비 */}
                    <p className="text-xs text-gray-600">
                      {session.raid_size}인 · 공대비 {session.raid_expense.toLocaleString()}G
                    </p>
                    {/* 버튼 */}
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => { onLoadSession(session); setConfirmDeleteId(null); }}
                        className="flex-1 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        불러오기
                      </button>
                      {confirmDeleteId === session.id ? (
                        <>
                          <button
                            onClick={() => { onDeleteSession(session.id); setConfirmDeleteId(null); }}
                            className="flex-1 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            삭제 확인
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(session.id)}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-300 text-xs rounded-lg transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 아이템 통계 ── */}
        {tab === "items" && (
          <>
            {isItemsLoading ? (
              <div className="text-center py-8 text-gray-500 text-sm">아이템 데이터 집계 중...</div>
            ) : itemStats.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-gray-500 text-sm">저장된 아이템 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {/* 정렬 옵션 */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-gray-500">정렬:</span>
                  {(
                    [
                      { key: "count" as SortKey, label: "등장 횟수" },
                      { key: "avgGold" as SortKey, label: "평균 낙찰금" },
                      { key: "totalGold" as SortKey, label: "총 낙찰금" },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSortBy(key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        sortBy === key
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-gray-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-gray-600">총 {sortedStats.length}종 아이템</span>
                </div>

                {/* 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-700">
                        <th className="pb-2 pr-3">아이템</th>
                        <th className="pb-2 pr-3 text-center">등장</th>
                        <th className="pb-2 pr-3 text-right">평균 낙찰</th>
                        <th className="pb-2 pr-3 text-right">최고 낙찰</th>
                        <th className="pb-2 text-right">총 낙찰</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {sortedStats.map((stat) => {
                        const countColor =
                          stat.count >= 5 ? "bg-purple-600 text-white" :
                          stat.count >= 3 ? "bg-blue-700 text-white" :
                          stat.count >= 2 ? "bg-green-800 text-green-200" :
                          "bg-gray-700 text-gray-400";

                        return (
                          <tr key={stat.item_id} className="hover:bg-gray-800/60 transition-colors">
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <LazyImage
                                  src={stat.icon_url}
                                  alt={stat.item_name}
                                  className="w-7 h-7 rounded border border-gray-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <a
                                    href={/^\d+$/.test(stat.item_id) ? `https://www.wowhead.com/ko/item=${stat.item_id}` : undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-300 hover:text-purple-200 hover:underline text-xs font-semibold truncate block max-w-[160px]"
                                  >
                                    {stat.item_name}
                                  </a>
                                  <span className="text-gray-600 text-xs">최근: {stat.recentWinner}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 pr-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${countColor}`}>
                                {stat.count}회
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono text-yellow-400 text-xs">
                              {stat.avgGold.toLocaleString()}G
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono text-yellow-300 text-xs">
                              {stat.maxGold.toLocaleString()}G
                            </td>
                            <td className="py-2.5 text-right font-mono text-gray-400 text-xs">
                              {stat.totalGold.toLocaleString()}G
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── 골드 추이 ── */}
        {tab === "gold" && (
          <>
            {sessions.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📈</div>
                <p className="text-gray-500 text-sm">저장된 회차가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...sessions].reverse().map((session, idx) => {
                  const barW = Math.round((session.per_person / maxPerPerson) * 100);
                  const isMax = session.per_person === maxPerPerson;
                  return (
                    <div key={session.id} className="bg-gray-900 rounded-xl p-3.5 border border-gray-800">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-5 text-right">{idx + 1}</span>
                          <span className="text-white text-sm font-semibold">{session.label}</span>
                          {isMax && (
                            <span className="text-xs bg-yellow-600/30 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                              최고
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-yellow-400 font-bold font-mono text-sm">
                            {session.per_person.toLocaleString()}G
                          </span>
                          <span className="text-gray-600 text-xs ml-1">/ 인</span>
                        </div>
                      </div>
                      {/* 바 차트 */}
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isMax ? "bg-yellow-400" : "bg-yellow-700/60"
                          }`}
                          style={{ width: `${barW}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5 text-xs text-gray-600">
                        <span>{formatDate(session.created_at)}</span>
                        <span>총 {session.total_gold.toLocaleString()}G ({session.raid_size}인)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
