'use client';

import { useEffect, useState, useTransition } from 'react';
import { getDefensiveSettings, saveDefensiveSettings, resetDefensiveSettings } from '@/app/actions/defensiveSettings';
import { DEFAULT_DEFENSIVE_SETTINGS } from '@/app/constants/defensiveDefaults';
import type { DefensiveEntry } from '@/app/types/raidAnalysis';

type DefensiveSettings = Record<string, DefensiveEntry[]>;

interface Props {
  onClose: () => void;
  onSaved: (settings: DefensiveSettings) => void;
}

interface SpellPreview {
  id: number;
  name: string;
  iconUrl: string;
}

export default function DefensiveSettingsModal({ onClose, onSaved }: Props) {
  const [settings, setSettings] = useState<DefensiveSettings>(DEFAULT_DEFENSIVE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, SpellPreview | null>>({});
  const [lookingUp, setLookingUp] = useState<Record<string, boolean>>({});
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

  const handleInputChange = async (specKey: string, value: string) => {
    setInputValues(prev => ({ ...prev, [specKey]: value }));
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed) && trimmed.length > 2) {
      const id = parseInt(trimmed, 10);
      setLookingUp(prev => ({ ...prev, [specKey]: true }));
      setPreviews(prev => ({ ...prev, [specKey]: null }));
      try {
        const res = await fetch(`/api/spell?spellId=${id}`);
        if (res.ok) {
          const data = await res.json() as { name?: string; iconUrl?: string };
          if (data.name) {
            setPreviews(prev => ({ ...prev, [specKey]: { id, name: data.name!, iconUrl: data.iconUrl ?? '' } }));
          }
        }
      } catch { /* ignore */ } finally {
        setLookingUp(prev => ({ ...prev, [specKey]: false }));
      }
    } else {
      setPreviews(prev => ({ ...prev, [specKey]: null }));
    }
  };

  const handleAdd = (specKey: string) => {
    const raw = (inputValues[specKey] ?? '').trim();
    if (!raw) return;
    let entry: DefensiveEntry;
    if (/^\d+$/.test(raw)) {
      const preview = previews[specKey];
      entry = { id: parseInt(raw, 10), name: preview?.name ?? `ID:${raw}` };
    } else {
      entry = { name: raw };
    }
    setSettings(prev => ({
      ...prev,
      [specKey]: Array.from(new Map([...(prev[specKey] ?? []).map(e => [e.id ?? e.name, e] as [string | number, DefensiveEntry]), [entry.id ?? entry.name, entry]]).values()),
    }));
    setInputValues(prev => ({ ...prev, [specKey]: '' }));
    setPreviews(prev => ({ ...prev, [specKey]: null }));
  };

  const handleRemove = (specKey: string, entry: DefensiveEntry) => {
    setSettings(prev => ({
      ...prev,
      [specKey]: (prev[specKey] ?? []).filter(e => !(e.name === entry.name && e.id === entry.id)),
    }));
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">⚙️ 생존기 설정</h2>
            <p className="text-gray-500 text-xs mt-0.5">스펠 ID 또는 이름 입력. ID 입력 시 자동으로 이름을 조회합니다.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white text-sm">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {Object.keys(settings).map(specKey => (
                <div key={specKey} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <p className="text-cyan-300 font-bold text-xs mb-2">{specKey}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(settings[specKey] ?? []).map((entry, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-gray-200 text-xs rounded-full border border-gray-600"
                      >
                        {entry.id && (
                          <a
                            href={`https://www.wowhead.com/spell=${entry.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300"
                            title={`ID: ${entry.id}`}
                          >
                            #{entry.id}
                          </a>
                        )}
                        <span>{entry.name}</span>
                        <button
                          onClick={() => handleRemove(specKey, entry)}
                          className="text-gray-500 hover:text-red-400 ml-0.5 leading-none"
                        >×</button>
                      </span>
                    ))}
                    {(settings[specKey] ?? []).length === 0 && (
                      <span className="text-gray-600 text-xs">설정된 생존기 없음</span>
                    )}
                  </div>
                  {/* Preview */}
                  {previews[specKey] && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-gray-900/60 rounded-lg border border-cyan-700/30">
                      {previews[specKey]!.iconUrl && (
                        <img src={previews[specKey]!.iconUrl} alt="" className="w-6 h-6 rounded" />
                      )}
                      <span className="text-cyan-300 text-xs font-semibold">{previews[specKey]!.name}</span>
                      <a
                        href={`https://www.wowhead.com/spell=${previews[specKey]!.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 text-xs hover:underline ml-auto"
                      >
                        Wowhead ↗
                      </a>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      value={inputValues[specKey] ?? ''}
                      onChange={e => handleInputChange(specKey, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdd(specKey); }}
                      placeholder="스펠 ID (숫자) 또는 이름 입력 후 Enter"
                      className="flex-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    {lookingUp[specKey] && (
                      <div className="w-7 h-7 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <button
                      onClick={() => handleAdd(specKey)}
                      className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded-lg"
                    >추가</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
