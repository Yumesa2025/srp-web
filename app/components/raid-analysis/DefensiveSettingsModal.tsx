'use client';

import { useEffect, useState, useTransition } from 'react';
import { getDefensiveSettings, saveDefensiveSettings, resetDefensiveSettings } from '@/app/actions/defensiveSettings';
import { DEFAULT_DEFENSIVE_SETTINGS } from '@/app/constants/defensiveDefaults';

interface Props {
  onClose: () => void;
  onSaved: (settings: Record<string, string[]>) => void;
}

export default function DefensiveSettingsModal({ onClose, onSaved }: Props) {
  const [settings, setSettings] = useState<Record<string, string[]>>(DEFAULT_DEFENSIVE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [newSpell, setNewSpell] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    let canceled = false;
    async function load() {
      setIsLoading(true);
      const data = await getDefensiveSettings();
      if (!canceled) { setSettings(data); setIsLoading(false); }
    }
    load();
    return () => { canceled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleRemoveSpell = (specKey: string, spell: string) => {
    setSettings(prev => ({
      ...prev,
      [specKey]: (prev[specKey] ?? []).filter(s => s !== spell),
    }));
  };

  const handleAddSpell = (specKey: string) => {
    const spell = (newSpell[specKey] ?? '').trim();
    if (!spell) return;
    setSettings(prev => ({
      ...prev,
      [specKey]: Array.from(new Set([...(prev[specKey] ?? []), spell])),
    }));
    setNewSpell(prev => ({ ...prev, [specKey]: '' }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveDefensiveSettings(settings);
      if (!result.error) {
        setSavedMsg('저장됨 ✓');
        onSaved(settings);
        setTimeout(() => setSavedMsg(''), 2000);
      }
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      await resetDefensiveSettings();
      setSettings(DEFAULT_DEFENSIVE_SETTINGS);
      setSavedMsg('기본값으로 초기화됨');
      onSaved(DEFAULT_DEFENSIVE_SETTINGS);
      setTimeout(() => setSavedMsg(''), 2000);
    });
  };

  const specKeys = Object.keys(settings);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">⚙️ 생존기 설정</h2>
            <p className="text-gray-500 text-xs mt-0.5">직업/특성별 생존기를 설정하세요. 분석 시 이 목록을 기준으로 사용 여부를 판단합니다.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white text-sm">✕</button>
        </div>

        {/* 콘텐츠 */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {specKeys.map(specKey => (
                <div key={specKey} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <p className="text-cyan-300 font-bold text-xs mb-2">{specKey}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(settings[specKey] ?? []).map(spell => (
                      <span
                        key={spell}
                        className="flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-gray-200 text-xs rounded-full border border-gray-600"
                      >
                        {spell}
                        <button
                          onClick={() => handleRemoveSpell(specKey, spell)}
                          className="text-gray-500 hover:text-red-400 ml-0.5 leading-none"
                        >×</button>
                      </span>
                    ))}
                    {(settings[specKey] ?? []).length === 0 && (
                      <span className="text-gray-600 text-xs">설정된 생존기 없음</span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      value={newSpell[specKey] ?? ''}
                      onChange={e => setNewSpell(prev => ({ ...prev, [specKey]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddSpell(specKey); }}
                      placeholder="스킬명 입력 후 Enter"
                      className="flex-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={() => handleAddSpell(specKey)}
                      className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded-lg"
                    >추가</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleReset}
            disabled={isPending}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            기본값으로 초기화
          </button>
          <div className="flex items-center gap-3">
            {savedMsg && <span className="text-emerald-400 text-xs font-semibold">{savedMsg}</span>}
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
