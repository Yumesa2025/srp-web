"use client";

import { useState } from "react";
import { SavedTactic } from "@/app/hooks/useTacticStorage";
import { Difficulty } from "@/data/bossTimelines";
import { useAnalytics } from "@/app/hooks/useAnalytics";

interface TacticSavePanelProps {
  isLoggedIn: boolean;
  isSaving: boolean;
  isLoading: boolean;
  savedTactics: SavedTactic[];
  currentBossId: number;
  currentBossName: string;
  currentDifficulty: Difficulty;
  onSave: (name: string, existingId?: string) => Promise<{ error?: string }>;
  onLoad: (tactic: SavedTactic) => void;
  onDelete: (id: string) => void;
}

export default function TacticSavePanel({
  isLoggedIn,
  isSaving,
  isLoading,
  savedTactics,
  currentBossId,
  currentBossName,
  currentDifficulty,
  onSave,
  onLoad,
  onDelete,
}: TacticSavePanelProps) {
  const [tacticName, setTacticName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { trackTacticSave, trackTacticLoad } = useAnalytics();

  const filteredTactics = savedTactics.filter(
    (t) => t.boss_id === currentBossId && t.difficulty === currentDifficulty
  );

  const handleSave = async () => {
    const name = tacticName.trim();
    if (!name) { setErrorMsg("전술 이름을 입력해 주세요."); return; }
    setErrorMsg("");
    setSuccessMsg("");
    const { error } = await onSave(name);
    if (error) { setErrorMsg(error); }
    else {
      trackTacticSave(currentBossName, currentDifficulty);
      setSuccessMsg(`"${name}" 저장 완료!`); setTacticName(""); setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    onDelete(id);
    setConfirmDeleteId(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="mb-6 p-4 bg-gray-800/60 border border-gray-700 rounded-xl text-center text-gray-400 text-sm">
        전술을 저장하려면 <span className="text-cyan-400 font-bold">로그인</span>이 필요합니다.
      </div>
    );
  }

  return (
    <div className="mb-6 p-5 bg-gray-800 border border-gray-700 rounded-xl">
      <p className="text-sm font-bold text-gray-300 mb-3">
        💾 전술 저장 / 불러오기
        <span className="ml-2 text-xs text-gray-500 font-normal">({currentBossName} · {currentDifficulty})</span>
      </p>

      {/* 저장 입력 */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={tacticName}
          onChange={(e) => setTacticName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="전술 이름 입력 후 저장"
          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>

      {errorMsg && <p className="text-red-400 text-xs mb-2">{errorMsg}</p>}
      {successMsg && <p className="text-green-400 text-xs mb-2">{successMsg}</p>}

      {/* 저장된 전술 목록 */}
      {isLoading ? (
        <p className="text-gray-500 text-xs">불러오는 중...</p>
      ) : filteredTactics.length === 0 ? (
        <p className="text-gray-600 text-xs">이 보스/난이도에 저장된 전술이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {filteredTactics.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-gray-900 px-3 py-2 rounded-lg border border-gray-700">
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-white font-bold truncate">{t.name}</span>
                <span className="text-xs text-gray-500">
                  {new Date(t.updated_at).toLocaleDateString("ko-KR")} · MRT {t.mrt_nodes.length}개
                </span>
              </div>
              <div className="flex gap-2 ml-3 shrink-0">
                <button
                  onClick={() => { onLoad(t); trackTacticLoad(currentBossName, currentDifficulty); }}
                  className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded transition-colors"
                >
                  불러오기
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  onBlur={() => setConfirmDeleteId(null)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    confirmDeleteId === t.id
                      ? "bg-red-600 hover:bg-red-500 text-white"
                      : "bg-gray-700 hover:bg-red-800 text-gray-300"
                  }`}
                >
                  {confirmDeleteId === t.id ? "확인" : "삭제"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
