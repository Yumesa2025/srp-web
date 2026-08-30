'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalRosters } from '@/app/hooks/useLocalRosters';

export default function RosterManager({
  currentText,
  onSelectRoster
}: {
  currentText: string,
  onSelectRoster: (text: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { rosters, isLoading, saveRoster, deleteRoster } = useLocalRosters();
  const [saveName, setSaveName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = () => {
    if (!saveName.trim()) {
      alert("명단 이름을 입력해주세요.");
      return;
    }
    if (!currentText.trim()) {
      alert("공란은 저장할 수 없습니다.");
      return;
    }
    
    const res = saveRoster(saveName, currentText);
    if (res.error) {
      alert(res.error);
      return;
    }
    setSaveName('');
  };

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    const res = deleteRoster(id);
    if (res.error) {
      alert(res.error);
    }
  }, [confirmDeleteId, deleteRoster]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm font-semibold rounded-lg text-gray-200 transition-colors shadow-md flex items-center gap-2"
        title="나만의 파티 명단 불러오기/저장"
      >
        <span>명단 저장소</span>
        <span className="text-xs">📂</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-gray-900 border border-gray-700 shadow-2xl rounded-xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-200 text-sm">명단 관리</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white text-xs p-1">✕</button>
          </div>
          
          <div className="mb-4 flex gap-2">
            <input 
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="저장할 이름 (예: 정공 1파티)" 
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold rounded-lg text-white disabled:opacity-50 shadow-md transition-all whitespace-nowrap"
            >
              새로 저장
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto pr-1 space-y-2 relative">
            {isLoading ? (
              <div className="text-center text-xs text-gray-400 py-6">데이터 불러오는 중...</div>
            ) : rosters.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-6">저장된 명단이 없습니다.</div>
            ) : (
              rosters.map(roster => (
                <div 
                  key={roster.id} 
                  onClick={() => {
                    onSelectRoster(roster.content);
                    setIsOpen(false);
                  }}
                  className="flex justify-between items-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-transparent hover:border-cyan-800 cursor-pointer group transition-all shadow-sm"
                >
                  <div className="truncate pr-3 text-sm text-gray-200 font-medium">
                    {roster.name}
                  </div>
                  <button
                    onClick={(e) => handleDelete(roster.id, e)}
                    onBlur={() => setConfirmDeleteId(null)}
                    className={`p-1 text-xs font-bold rounded transition-all ${
                      confirmDeleteId === roster.id
                        ? "opacity-100 text-white bg-red-600 px-2"
                        : "opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                    }`}
                    title="삭제"
                  >
                    {confirmDeleteId === roster.id ? "확인" : "🗑️"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
