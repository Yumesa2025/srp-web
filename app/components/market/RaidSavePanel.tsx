"use client";

import { useState } from "react";
import { SaveSessionParams } from "@/app/hooks/useMarketStorage";

interface Props {
  raidSize: number;
  raidExpense: number;
  totalGold: number;
  perPerson: number;
  rawInput: string;
  isSaving: boolean;
  onSave: (params: SaveSessionParams) => Promise<{ error?: string }>;
  items: {
    item_id: string;
    item_name: string;
    icon_url: string;
    winner: string;
    gold: number;
  }[];
}

function getDefaultLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일 공대`;
}

export default function RaidSavePanel({
  raidSize, raidExpense, totalGold, perPerson,
  rawInput, isSaving, onSave, items,
}: Props) {
  const [label, setLabel] = useState(getDefaultLabel);
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSave = async () => {
    if (!label.trim()) return;
    setFlash(null);
    const result = await onSave({
      label: label.trim(), raidSize, raidExpense,
      totalGold, perPerson, rawInput, items,
    });
    if (result.error) {
      setFlash({ ok: false, msg: result.error });
    } else {
      setFlash({ ok: true, msg: `"${label.trim()}" 저장 완료!` });
      setTimeout(() => setFlash(null), 4000);
    }
  };

  return (
    <div className="mt-5 rounded-xl bg-emerald-950/30 border border-emerald-600/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-emerald-400 font-bold text-sm">💾 이 회차 저장하기</span>
        <span className="text-xs text-gray-500">
          아이템 {items.length}개 · 총 {totalGold.toLocaleString()}G · {raidSize}인
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="회차 이름 (예: 3주차 신화 / 불꽃 정복자 A팀)"
          maxLength={40}
          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm outline-none focus:border-emerald-500 placeholder-gray-600 transition-colors"
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !label.trim() || items.length === 0}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors text-sm whitespace-nowrap"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
      {flash && (
        <p className={`mt-2 text-xs ${flash.ok ? "text-emerald-400" : "text-red-400"}`}>
          {flash.ok ? "✅" : "⚠"} {flash.msg}
        </p>
      )}
    </div>
  );
}
