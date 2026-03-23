"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/app/utils/supabase/client";
import { loadRosters, deleteRoster } from "@/app/actions/roster";

type ProfileTab = "rosters" | "market";

interface Roster {
  id: string;
  name: string;
  content: string;
  created_at: string;
}

interface RaidSession {
  id: string;
  label: string;
  raid_size: number;
  raid_expense: number;
  total_gold: number;
  per_person: number;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function playerCount(content: string) {
  return content.split("\n").filter((l) => l.trim()).length;
}

function previewNames(content: string) {
  return content
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 5)
    .map((l) => l.split("-")[0].trim());
}

interface Props {
  user: User;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab]               = useState<ProfileTab>("rosters");
  const [rosters, setRosters]       = useState<Roster[]>([]);
  const [sessions, setSessions]     = useState<RaidSession[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [confirmRosterId, setConfirmRosterId] = useState<string | null>(null);

  const avatarUrl   = (user.user_metadata?.avatar_url ?? user.user_metadata?.picture) as string | undefined;
  const displayName = (user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "사용자") as string;
  const joinDate    = formatDate(user.created_at);

  // 모달 열릴 때 파티원 명단 + 공대 거래 동시 로드
  useEffect(() => {
    let canceled = false;
    async function loadAll() {
      setIsLoading(true);
      const [rosterResult, sessionResult] = await Promise.all([
        loadRosters(),
        supabase
          .from("raid_sessions")
          .select("id,label,raid_size,raid_expense,total_gold,per_person,created_at")
          .order("created_at", { ascending: false }),
      ]);
      if (canceled) return;
      if (rosterResult.data)                       setRosters(rosterResult.data as Roster[]);
      if (!sessionResult.error && sessionResult.data) setSessions(sessionResult.data as RaidSession[]);
      setIsLoading(false);
    }
    loadAll();
    return () => { canceled = true; };
  }, [supabase]);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDeleteRoster = async (id: string) => {
    await deleteRoster(id);
    setRosters((prev) => prev.filter((r) => r.id !== id));
    setConfirmRosterId(null);
  };

  const TABS: { key: ProfileTab; label: string; count: number }[] = [
    { key: "rosters", label: "파티원 명단", count: rosters.length },
    { key: "market",  label: "공대 거래",   count: sessions.length },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors text-sm"
        >
          ✕
        </button>

        {/* ── 프로필 헤더 ──────────────────────────────── */}
        <div className="px-7 pt-7 pb-5 bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700/60 shrink-0">
          <div className="flex items-center gap-5">
            {/* 아바타 */}
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-2xl border-2 border-gray-600 object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-2xl font-black text-white shrink-0">
                {displayName[0]?.toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{displayName}</h2>
              <p className="text-gray-400 text-sm mt-0.5 truncate">{user.email}</p>
              <p className="text-gray-600 text-xs mt-1">가입일 · {joinDate}</p>
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            {[
              { label: "파티원 명단", value: isLoading ? "–" : `${rosters.length}개`, color: "text-cyan-400" },
              { label: "공대 거래",   value: isLoading ? "–" : `${sessions.length}회`, color: "text-yellow-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800/60 rounded-xl p-3 text-center border border-gray-700/50">
                <p className={`text-lg font-black ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 탭 헤더 ──────────────────────────────────── */}
        <div className="flex gap-1 px-5 pt-4 pb-0 shrink-0">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors border-b-2 ${
                tab === key
                  ? "border-cyan-500 text-cyan-400 bg-gray-800/60"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
              {!isLoading && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  tab === key ? "bg-cyan-600/30 text-cyan-300" : "bg-gray-700 text-gray-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── 탭 콘텐츠 ────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">불러오는 중...</p>
              </div>
            </div>
          ) : (
            <>
              {/* 파티원 명단 탭 */}
              {tab === "rosters" && (
                <div className="space-y-3">
                  {rosters.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-3xl mb-3">📋</p>
                      <p className="text-gray-500 text-sm">저장된 파티원 명단이 없습니다.</p>
                      <p className="text-gray-600 text-xs mt-1">공대 구성 탭에서 명단을 저장해보세요.</p>
                    </div>
                  ) : rosters.map((roster) => {
                    const count = playerCount(roster.content);
                    const preview = previewNames(roster.content);
                    return (
                      <div
                        key={roster.id}
                        className="bg-gray-800 rounded-xl border border-gray-700 hover:border-cyan-500/30 transition-colors p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white font-bold text-sm truncate">{roster.name}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {formatDate(roster.created_at)} · {count}명
                            </p>
                          </div>
                          {/* 삭제 버튼 */}
                          {confirmRosterId === roster.id ? (
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => handleDeleteRoster(roster.id)}
                                className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
                              >
                                삭제 확인
                              </button>
                              <button
                                onClick={() => setConfirmRosterId(null)}
                                className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-lg hover:bg-gray-500 transition-colors"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRosterId(roster.id)}
                              className="px-2.5 py-1 bg-gray-700 hover:bg-red-900/40 text-gray-500 hover:text-red-400 text-xs rounded-lg transition-colors shrink-0"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                        {/* 플레이어 미리보기 */}
                        {preview.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {preview.map((name, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-gray-700/60 text-gray-300 text-xs rounded-md border border-gray-600/40"
                              >
                                {name}
                              </span>
                            ))}
                            {count > 5 && (
                              <span className="px-2 py-0.5 text-gray-500 text-xs">
                                +{count - 5}명 더
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 공대 거래 탭 */}
              {tab === "market" && (
                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-3xl mb-3">💰</p>
                      <p className="text-gray-500 text-sm">저장된 공대 거래 기록이 없습니다.</p>
                      <p className="text-gray-600 text-xs mt-1">공대 거래 탭에서 장부를 저장해보세요.</p>
                    </div>
                  ) : sessions.map((session) => {
                    const barW = Math.round(
                      (session.per_person / Math.max(...sessions.map((s) => s.per_person), 1)) * 100
                    );
                    return (
                      <div
                        key={session.id}
                        className="bg-gray-800 rounded-xl border border-gray-700 hover:border-yellow-500/30 transition-colors p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-white font-bold text-sm">{session.label}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {formatDate(session.created_at)} · {session.raid_size}인
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-yellow-400 font-black font-mono text-base">
                              {session.per_person.toLocaleString()}G
                            </p>
                            <p className="text-gray-600 text-xs">1인당</p>
                          </div>
                        </div>
                        {/* 바 차트 */}
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-yellow-600/70 rounded-full transition-all duration-500"
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600">
                          총 모금 {session.total_gold.toLocaleString()}G
                          {session.raid_expense > 0 && ` · 공대비 ${session.raid_expense.toLocaleString()}G`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
