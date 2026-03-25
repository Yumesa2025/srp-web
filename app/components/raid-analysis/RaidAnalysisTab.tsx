'use client';

import { useState, useCallback, useEffect } from 'react';
import type { RaidFight, RaidAnalysisResult } from '@/app/types/raidAnalysis';
import { createClient } from '@/app/utils/supabase/client';
import DeathAnalysisSection from './DeathAnalysisSection';
import ConsumablesSection from './ConsumablesSection';
import DpsGraphSection from './DpsGraphSection';
import DefensiveUsageSection from './DefensiveUsageSection';

function extractCode(raw: string): string {
  const urlMatch = raw.trim().match(/reports\/([A-Za-z0-9]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];
  return raw.trim().split(/[/?#\s]/)[0].replace(/[^A-Za-z0-9]/g, '');
}

function secondsToTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getDifficultyLabel(d?: number): { label: string; color: string } | null {
  if (!d) return null;
  if (d === 1) return { label: 'LFR',  color: 'bg-gray-700 text-gray-300' };
  if (d === 3) return { label: '일반', color: 'bg-blue-900/50 text-blue-300' };
  if (d === 4) return { label: '영웅', color: 'bg-purple-900/50 text-purple-300' };
  if (d === 5) return { label: '신화', color: 'bg-orange-900/50 text-orange-300' };
  return null;
}

function formatFightTime(fightStartedAt?: number): string {
  if (!fightStartedAt) return '';
  return new Date(fightStartedAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function RaidAnalysisTab() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [urlInput, setUrlInput]     = useState('');
  const [reportCode, setReportCode] = useState('');
  const [fights, setFights]         = useState<RaidFight[]>([]);
  const [isLoadingFights, setIsLoadingFights] = useState(false);
  const [selectedFightId, setSelectedFightId] = useState<number | null>(null);
  const [analysis, setAnalysis]     = useState<RaidAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  // 전투 목록 불러오기
  const loadFights = useCallback(async (overrideUrl?: string) => {
    const raw = overrideUrl ?? urlInput;
    const code = extractCode(raw);
    if (!code) { setError('WCL 리포트 URL 또는 코드를 입력해주세요.'); return; }

    setError('');
    setIsLoadingFights(true);
    setFights([]);
    setSelectedFightId(null);
    setAnalysis(null);
    setReportCode(code);

    try {
      const res = await fetch(`/api/raid-analysis?code=${code}`);
      const data = await res.json() as { fights?: RaidFight[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? '전투 목록을 불러오지 못했습니다.');
      setFights(data.fights ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setIsLoadingFights(false);
    }
  }, [urlInput]);

  // 전투 선택 → 분석
  const analyzeFight = useCallback(async (fight: RaidFight) => {
    setSelectedFightId(fight.id);
    setAnalysis(null);
    setError('');
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/raid-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportCode,
          fightId: fight.id,
          fightName: fight.name,
          startTime: fight.startTime,
          endTime: fight.endTime,
          kill: fight.kill,
          bossPercentage: fight.bossPercentage,
          stepSec: 5,
        }),
      });
      const data = await res.json() as { result?: RaidAnalysisResult; error?: string };
      if (!res.ok) throw new Error(data.error ?? '분석에 실패했습니다.');
      setAnalysis(data.result ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [reportCode]);

  const selectedFight = fights.find(f => f.id === selectedFightId);

  if (isLoggedIn === null) return null;

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-4xl">🔒</p>
        <p className="text-white font-bold text-lg">로그인이 필요합니다</p>
        <p className="text-gray-500 text-sm">공대 분석 기능은 로그인 후 이용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 헤더 입력 ──────────────────────────────────────────── */}
      <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
            🔍 공대 분석
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            WarcraftLogs URL을 붙여넣고 분석할 전투를 선택하세요
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') loadFights(); }}
            placeholder="https://www.warcraftlogs.com/reports/xxxxxx 또는 리포트 코드"
            className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl text-white text-sm focus:outline-none transition-colors"
          />
          <button
            onClick={() => loadFights()}
            disabled={isLoadingFights}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
          >
            {isLoadingFights ? '불러오는 중...' : '불러오기'}
          </button>
          {fights.length > 0 && (
            <button
              onClick={() => loadFights()}
              disabled={isLoadingFights}
              className="px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-xl transition-colors"
              title="새로고침"
            >
              🔄
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 px-4 py-2.5 bg-red-900/30 border border-red-800/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* ── 전투 목록 ─────────────────────────────────────────── */}
      {fights.length > 0 && (
        <div className="bg-gray-800/60 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700/60 flex items-center justify-between">
            <p className="text-gray-300 font-bold text-xl">전투 목록 ({fights.length}개)</p>
            <a
              href={`https://www.warcraftlogs.com/reports/${reportCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-500 hover:text-cyan-400 hover:underline"
            >
              WCL에서 보기 ↗
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 p-4">
            {fights.map(fight => {
              const diff = getDifficultyLabel(fight.difficulty);
              const timeStr = formatFightTime(fight.fightStartedAt);
              return (
                <button
                  key={fight.id}
                  onClick={() => analyzeFight(fight)}
                  disabled={isAnalyzing && selectedFightId === fight.id}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedFightId === fight.id
                      ? 'border-cyan-500/70 bg-cyan-900/20'
                      : 'border-gray-700 bg-gray-900 hover:border-cyan-500/40 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white font-semibold text-xl truncate">{fight.name}</p>
                    <span className={`shrink-0 text-base font-bold px-2 py-0.5 rounded ${
                      fight.kill
                        ? 'bg-emerald-800/60 text-emerald-300'
                        : 'bg-red-900/40 text-red-400'
                    }`}>
                      {fight.kill ? '처치' : `${fight.bossPercentage?.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {diff && (
                      <span className={`text-sm font-bold px-2 py-0.5 rounded ${diff.color}`}>
                        {diff.label}
                      </span>
                    )}
                    <span className="text-gray-500 text-base">{secondsToTime(fight.durationSec)}</span>
                    {timeStr && <span className="text-gray-600 text-base">{timeStr} 시작</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 분석 로딩 ─────────────────────────────────────────── */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">분석 중... 잠시 기다려 주세요</p>
        </div>
      )}

      {/* ── 분석 결과 ─────────────────────────────────────────── */}
      {analysis && !isAnalyzing && (
        <div className="space-y-5">
          {/* 분석 헤더 */}
          <div className="p-5 bg-gray-800 rounded-xl border border-cyan-500/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-white font-black text-3xl">{analysis.fight.name}</h3>
                  <span className={`text-base font-bold px-2 py-0.5 rounded-full ${
                    analysis.fight.kill
                      ? 'bg-emerald-800/60 text-emerald-300 border border-emerald-700/40'
                      : 'bg-red-900/40 text-red-400 border border-red-800/40'
                  }`}>
                    {analysis.fight.kill ? '처치' : `보스 ${analysis.fight.bossPercentage?.toFixed(1)}% 남음`}
                  </span>
                </div>
                <p className="text-gray-500 text-xl mt-1">
                  전투 시간 {secondsToTime(analysis.fight.durationSec)}
                  {selectedFight && ` · 전투 #${selectedFight.id}`}
                </p>
              </div>
              <a
                href={analysis.wclUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-orange-900/30 hover:bg-orange-900/50 border border-orange-700/40 text-orange-400 text-xs font-bold rounded-lg transition-colors"
              >
                WarcraftLogs ↗
              </a>
            </div>
          </div>

          {(() => {
            const makePlayerUrl = (actorId: number) =>
              `https://www.warcraftlogs.com/reports/${analysis.reportCode}#fight=${analysis.fight.id}&source=${actorId}`;
            return (
              <>
                <DeathAnalysisSection deaths={analysis.earlyDeaths} makePlayerUrl={makePlayerUrl} />
                <ConsumablesSection consumables={analysis.consumables} makePlayerUrl={makePlayerUrl} />
                <DpsGraphSection allPlayers={analysis.allPlayers} bloodlusts={analysis.bloodlusts} durationSec={analysis.fight.durationSec} makePlayerUrl={makePlayerUrl} />
                <DefensiveUsageSection players={analysis.defensiveUsage} makePlayerUrl={makePlayerUrl} />
              </>
            );
          })()}
        </div>
      )}

    </div>
  );
}
