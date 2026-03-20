"use client";

import { BOSS_DATABASE, Difficulty, TimelineEvent } from "@/data/bossTimelines";
import { PlayerData } from "@/app/types";
import { MRTNode } from "@/app/types/mrt";
import { SavedTactic } from "@/app/hooks/useTacticStorage";
import LazyImage from "@/app/components/LazyImage";
import TacticSavePanel from "@/app/components/tactics/TacticSavePanel";
import { sharedClasses } from "@/app/styles/sharedClasses";

const getStyles = () => ({
  card: sharedClasses.card + " mb-8",
  cardTitle: "block font-bold text-xl mb-4",
  headerContainer: "flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4",
  headerLabelContainer: "flex items-center gap-3",
  headerLabel: "block text-green-400 font-bold text-xl",
  copyButton: sharedClasses.button.primary,
  
  controlsContainer: "flex gap-4 items-center",
  select: sharedClasses.input.base,
  difficultyGroup: "flex bg-gray-900 rounded-md p-1 border border-gray-600",
  difficultyBtn: "px-4 py-1 rounded-sm font-bold transition-colors",
  difficultyBtnActiveH: "bg-blue-600 text-white",
  difficultyBtnActiveM: "bg-purple-600 text-white",
  difficultyBtnInactive: "text-gray-400 hover:text-white",

  addNodeContainer: "flex flex-wrap gap-4 items-end mb-6 bg-gray-900 p-4 rounded-lg border border-gray-700 shadow-inner",
  inputGroup: "flex flex-col",
  inputLabel: "text-xs text-gray-400 mb-1",
  timeInput: "w-20 p-2 bg-gray-800 border border-gray-600 rounded text-yellow-400 text-center font-mono font-bold focus:border-green-500 outline-none",
  flexibleInputGroup: "flex flex-col flex-1 min-w-[150px]",
  innerSelect: sharedClasses.input.select,
  addNodeBtn: sharedClasses.button.success,
  toggleTicksBtnBase: sharedClasses.button.outline,
  toggleTicksOff: "bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500",
  toggleTicksOn: "bg-gray-700 hover:bg-gray-600 text-gray-100 border-gray-500",

  timelineContainer: "bg-gray-900 rounded-lg p-2 border border-gray-600 max-h-[600px] overflow-y-auto flex flex-col relative",
  emptyTimeline: "text-gray-500 text-sm text-center py-6",
  tickWrapperBase: "flex flex-col border-b border-gray-700/60 transition-all",
  tickWrapperHovered: "bg-green-900/40 min-h-[44px] border-green-500/50 outline outline-green-400 z-10",
  emptyTickBase: "flex items-center",
  emptyTickHovered: "h-full justify-center px-2",
  emptyTickNormal: "h-[28px] px-2 hover:bg-gray-800/50 cursor-crosshair transition-all",
  snapText: "text-green-400 text-xs font-bold font-mono animate-pulse",
  tickTime: "text-gray-400 text-xs font-mono leading-none w-12 shrink-0",
  tickLine: "flex-1 border-t border-dashed border-gray-700/80",

  bossEventBase: "flex items-center justify-between p-2 bg-gray-800/80 border-l-4 border-red-500 rounded-r-md my-0.5",
  bossEventInfo: "flex items-center gap-3 flex-1 pointer-events-none min-w-0",
  bossEventTime: "font-mono font-bold w-12 text-red-400 shrink-0",
  eventIcon: "w-6 h-6 rounded border border-gray-700 shrink-0",
  eventName: "text-gray-200 font-bold truncate",
  bossEventType: "text-[10px] px-2 py-0.5 bg-red-900/50 text-red-300 rounded border border-red-800 shrink-0",
  useTimingBtn: "text-xs px-3 py-1 bg-gray-700 hover:bg-green-600 text-white rounded transition-colors",

  playerEventBase: "flex items-center justify-between p-2 ml-8 border-l-4 rounded-r-md my-0.5 cursor-grab active:cursor-grabbing transition-colors",
  playerEventWarning: "bg-red-900/30 border-red-500 hover:bg-red-800/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]",
  playerEventNormal: "bg-green-900/30 border-green-500 hover:bg-green-800/50 shadow-md",
  playerEventInfo: "flex items-center gap-3",
  dragHandle: "text-gray-400 cursor-grab",
  timeEditInputBase: "w-16 p-1 rounded border text-center text-xs font-mono font-bold outline-none",
  timeEditWarning: "bg-red-950/40 border-red-700 text-red-300 focus:border-red-500",
  timeEditNormal: "bg-green-950/40 border-green-700 text-green-300 focus:border-green-500",
  timeTextBase: "font-mono font-bold w-12 text-left underline decoration-dotted underline-offset-2",
  timeTextWarning: "text-red-400",
  timeTextNormal: "text-green-400",
  playerName: "text-white font-bold",
  spellNameWarning: "text-red-300",
  spellNameNormal: "text-green-300",
  cooldownWarningTag: "text-red-400 text-[11px] font-bold ml-2 bg-red-950/50 px-2 py-0.5 rounded border border-red-800/50",
  cdContainer: "flex items-center gap-2",
  cdLabel: "text-xs text-gray-500",
  cdInputBase: "w-14 p-1 bg-gray-900 border border-gray-700 rounded text-center font-bold text-xs outline-none",
  cdInputWarning: "text-red-300 focus:border-red-500",
  cdInputNormal: "text-green-300 focus:border-green-500",
  deleteBtn: "ml-2 text-gray-500 hover:text-red-400 font-bold",

  dictCard: "mb-8 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700",
  dictTitle: "block text-yellow-400 font-bold text-lg mb-2",
  dictDesc: "text-gray-400 text-sm mb-4",
  dictGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
  spellCard: "bg-gray-900 p-3 rounded-lg border border-gray-600 flex flex-col gap-2 transition-all hover:border-purple-500",
  spellHeader: "flex items-center gap-2",
  spellIcon: "w-8 h-8 rounded border border-gray-700",
  spellInfo: "flex flex-col overflow-hidden",
  spellLink: "font-bold text-gray-200 truncate hover:text-blue-400 hover:underline transition-colors cursor-pointer",
  spellIdText: "text-xs text-gray-500 font-mono",
  spellDesc: "text-xs text-gray-400 mt-1 leading-snug wrap-break-word whitespace-normal",
  selectGroup: "flex gap-2 mt-1",
  typeSelect: sharedClasses.input.select + " text-sm p-1 flex-1 focus:border-blue-500",
  dangerSelect: sharedClasses.input.select + " text-sm p-1 flex-1 focus:border-red-500",
  memoTextarea: "mt-2 w-full min-h-[68px] text-xs p-2 bg-gray-800 border border-gray-600 rounded text-gray-200 placeholder:text-gray-500 focus:border-yellow-500 outline-none resize-y",

  aiCard: "mb-8 p-6 bg-gray-800 rounded-xl shadow-lg border-2 border-purple-500/50 relative overflow-hidden",
  aiGradientBar: "absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-600 to-blue-500",
  aiHeaderContainer: "flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4",
  aiTitle: "block text-purple-400 font-bold text-xl mb-1",
  aiDesc: "text-gray-400 text-sm",
  aiButton: "px-6 py-3 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 rounded-md font-bold text-white shadow-lg transition-all",
  aiOutput: "bg-gray-900 rounded-lg p-6 border border-gray-600 text-gray-200 whitespace-pre-wrap font-sans leading-relaxed",
  
  opacity50: "opacity-50"
});

interface TacticEditorTabProps {
  copyMrtNote: () => void;
  selectedBossId: number;
  onSelectedBossIdChange: (value: number) => void;
  difficulty: Difficulty;
  onDifficultyChange: (value: Difficulty) => void;
  newNodeTime: string;
  onNewNodeTimeChange: (value: string) => void;
  newNodePlayerId: string;
  onNewNodePlayerIdChange: (value: string) => void;
  newNodeSpell: string;
  onNewNodeSpellChange: (value: string) => void;
  players: PlayerData[];
  addMrtNode: () => void;
  showEmptyTicks: boolean;
  onToggleShowEmptyTicks: () => void;
  visibleTimelineSeconds: number[];
  secondsToTime: (sec: number) => string;
  currentTimeline: TimelineEvent[];
  mrtNodes: MRTNode[];
  dragHoverTime: string | null;
  onDragHoverTimeChange: (value: string | null) => void;
  draggedMrtNodeId: string | null;
  onDraggedMrtNodeIdChange: (value: string | null) => void;
  updateNodeTime: (nodeId: string, newTime: string) => void;
  spellDetails: Record<number, { name: string; iconUrl: string; description?: string }>;
  cooldownWarnings: Set<string>;
  editingNodeId: string | null;
  editingNodeTime: string;
  onEditingNodeTimeChange: (value: string) => void;
  startEditingNodeTime: (node: MRTNode) => void;
  saveEditingNodeTime: (node: MRTNode) => void;
  cancelEditingNodeTime: (node: MRTNode) => void;
  updateNodeCooldown: (id: string, newCooldown: number) => void;
  removeMrtNode: (id: string) => void;
  uniqueSpells: TimelineEvent[];
  spellConfig: Record<number, { type: string; danger: string; memo: string }>;
  handleSpellConfigChange: (spellId: number, field: "type" | "danger" | "memo", value: string) => void;
  generateAiTactic: () => void;
  isAiLoading: boolean;
  aiTactic: string;
  savedTactics: SavedTactic[];
  isLoggedIn: boolean;
  isSaving: boolean;
  isTacticsLoading: boolean;
  onSaveTactic: (name: string) => Promise<{ error?: string }>;
  onLoadTactic: (tactic: SavedTactic) => void;
  onDeleteTactic: (id: string) => void;
}

export default function TacticEditorTab({
  copyMrtNote,
  selectedBossId,
  onSelectedBossIdChange,
  difficulty,
  onDifficultyChange,
  newNodeTime,
  onNewNodeTimeChange,
  newNodePlayerId,
  onNewNodePlayerIdChange,
  newNodeSpell,
  onNewNodeSpellChange,
  players,
  addMrtNode,
  showEmptyTicks,
  onToggleShowEmptyTicks,
  visibleTimelineSeconds,
  secondsToTime,
  currentTimeline,
  mrtNodes,
  dragHoverTime,
  onDragHoverTimeChange,
  draggedMrtNodeId,
  onDraggedMrtNodeIdChange,
  updateNodeTime,
  spellDetails,
  cooldownWarnings,
  editingNodeId,
  editingNodeTime,
  onEditingNodeTimeChange,
  startEditingNodeTime,
  saveEditingNodeTime,
  cancelEditingNodeTime,
  updateNodeCooldown,
  removeMrtNode,
  uniqueSpells,
  spellConfig,
  handleSpellConfigChange,
  generateAiTactic,
  isAiLoading,
  aiTactic,
  savedTactics,
  isLoggedIn,
  isSaving,
  isTacticsLoading,
  onSaveTactic,
  onLoadTactic,
  onDeleteTactic,
}: TacticEditorTabProps) {
  const healersCount = players.filter((p) => p.role === "HEALER").length;
  const s = getStyles();

  const currentBoss = BOSS_DATABASE.find((b) => b.id === selectedBossId) || BOSS_DATABASE[0];

  return (
    <>
      <TacticSavePanel
        isLoggedIn={isLoggedIn}
        isSaving={isSaving}
        isLoading={isTacticsLoading}
        savedTactics={savedTactics}
        currentBossId={selectedBossId}
        currentBossName={currentBoss.name}
        currentDifficulty={difficulty}
        onSave={onSaveTactic}
        onLoad={onLoadTactic}
        onDelete={onDeleteTactic}
      />

      <div className={`${s.card} border-2 border-green-500/50`}>
        <div className={s.headerContainer}>
          <div className={s.headerLabelContainer}>
            <label className={s.headerLabel}>📝 전술 타임라인 에디터 (보스 스킬 & 생존기 배분)</label>
            <button onClick={copyMrtNote} className={s.copyButton}>
              <span>📋 MRT 노드 복사</span>
            </button>
          </div>

          <div className={s.controlsContainer}>
            <select
              className={s.select}
              value={selectedBossId}
              onChange={(e) => onSelectedBossIdChange(Number(e.target.value))}
            >
              {BOSS_DATABASE.map((boss) => (
                <option key={boss.id} value={boss.id}>
                  {boss.name}
                </option>
              ))}
            </select>

            <div className={s.difficultyGroup}>
              <button
                onClick={() => onDifficultyChange("Heroic")}
                className={`${s.difficultyBtn} ${difficulty === "Heroic" ? s.difficultyBtnActiveH : s.difficultyBtnInactive}`}
              >
                영웅 (Heroic)
              </button>
              <button
                onClick={() => onDifficultyChange("Mythic")}
                className={`${s.difficultyBtn} ${difficulty === "Mythic" ? s.difficultyBtnActiveM : s.difficultyBtnInactive}`}
              >
                신화 (Mythic)
              </button>
            </div>
          </div>
        </div>

        <div className={s.addNodeContainer}>
          <div className={s.inputGroup}>
            <label className={s.inputLabel}>시간 (MM:SS)</label>
            <input
              type="text"
              value={newNodeTime}
              onChange={(e) => onNewNodeTimeChange(e.target.value)}
              className={s.timeInput}
            />
          </div>
          <div className={s.flexibleInputGroup}>
            <label className={s.inputLabel}>누구의 생존기를 쓸까?</label>
            <select
              value={newNodePlayerId}
              onChange={(e) => {
                onNewNodePlayerIdChange(e.target.value);
                onNewNodeSpellChange("");
              }}
              className={s.innerSelect}
            >
              <option value="">-- 힐러 / 생존기 보유자 선택 --</option>
              {players
                .filter((p) => p.defensives && p.defensives.length > 0)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.activeSpec || "특성없음"})
                  </option>
                ))}
            </select>
          </div>
          <div className={s.flexibleInputGroup}>
            <label className={s.inputLabel}>어떤 스킬?</label>
            <select
              value={newNodeSpell}
              onChange={(e) => onNewNodeSpellChange(e.target.value)}
              disabled={!newNodePlayerId}
              className={`${s.innerSelect} disabled:opacity-50`}
            >
              <option value="">-- 스킬 선택 --</option>
              {players
                .find((p) => p.id === newNodePlayerId)
                ?.defensives?.map((d, idx) => (
                  <option key={idx} value={d.name}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={addMrtNode}
            disabled={!newNodeTime || !newNodePlayerId || !newNodeSpell}
            className={s.addNodeBtn}
          >
            + 이 시간에 배치
          </button>
          <button
            onClick={onToggleShowEmptyTicks}
            className={`${s.toggleTicksBtnBase} ${showEmptyTicks ? s.toggleTicksOn : s.toggleTicksOff}`}
          >
            {showEmptyTicks ? "빈 눈금 숨기기" : "빈 눈금 보이기"}
          </button>
        </div>

        <div className={s.timelineContainer}>
          {visibleTimelineSeconds.length === 0 ? (
            <p className={s.emptyTimeline}>표시할 타임라인 이벤트가 없습니다.</p>
          ) : (
            visibleTimelineSeconds.map((sec) => {
              const timeStr = secondsToTime(sec);
              const bossEvents = currentTimeline.filter((ev) => ev.time === timeStr);
              const playerEvents = mrtNodes.filter((node) => node.time === timeStr);
              const isHovered = dragHoverTime === timeStr;
              const hasEvent = bossEvents.length > 0 || playerEvents.length > 0;

              return (
                <div
                  key={sec}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    onDragHoverTimeChange(timeStr);
                  }}
                  onDragLeave={() => onDragHoverTimeChange(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedMrtNodeId) updateNodeTime(draggedMrtNodeId, timeStr);
                    onDraggedMrtNodeIdChange(null);
                    onDragHoverTimeChange(null);
                  }}
                  className={`${s.tickWrapperBase} ${isHovered ? s.tickWrapperHovered : ""}`}
                >
                  {!hasEvent && (
                    <div className={`${s.emptyTickBase} ${isHovered ? s.emptyTickHovered : s.emptyTickNormal}`}>
                      {isHovered ? (
                        <span className={s.snapText}>{timeStr} 에 스냅 🎯</span>
                      ) : (
                        <>
                          <span className={s.tickTime}>{timeStr}</span>
                          <div className={s.tickLine} />
                        </>
                      )}
                    </div>
                  )}

                  {bossEvents.map((ev, idx) => {
                    const realName = spellDetails[ev.spellId]?.name || ev.spellName;
                    const icon = spellDetails[ev.spellId]?.iconUrl;
                    return (
                      <div key={`boss-${sec}-${idx}`} className={`${s.bossEventBase} ${isHovered ? s.opacity50 : ""}`}>
                        <div className={s.bossEventInfo}>
                          <span className={s.bossEventTime}>{ev.time}</span>
                          {icon && <LazyImage src={icon} alt={realName} className={s.eventIcon} />}
                          <span className={s.eventName}>{realName}</span>
                          <span className={s.bossEventType}>{ev.type}</span>
                        </div>
                        {!isHovered && (
                          <button onClick={() => onNewNodeTimeChange(ev.time)} className={s.useTimingBtn}>
                            이 타이밍 👆
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {playerEvents.map((node) => {
                    const hasWarning = cooldownWarnings.has(node.id);

                    return (
                      <div
                        key={`player-${node.id}`}
                        draggable={editingNodeId !== node.id}
                        onDragStart={(e) => {
                          onDraggedMrtNodeIdChange(node.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          onDraggedMrtNodeIdChange(null);
                          onDragHoverTimeChange(null);
                        }}
                        className={`${s.playerEventBase} ${hasWarning ? s.playerEventWarning : s.playerEventNormal} ${isHovered ? s.opacity50 : ""}`}
                      >
                        <div className={s.playerEventInfo}>
                          <span className={s.dragHandle}>↕️</span>
                          {editingNodeId === node.id ? (
                            <input
                              autoFocus
                              type="text"
                              value={editingNodeTime}
                              onChange={(e) => onEditingNodeTimeChange(e.target.value)}
                              onBlur={() => saveEditingNodeTime(node)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  saveEditingNodeTime(node);
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelEditingNodeTime(node);
                                }
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={`${s.timeEditInputBase} ${hasWarning ? s.timeEditWarning : s.timeEditNormal}`}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingNodeTime(node);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={`${s.timeTextBase} ${hasWarning ? s.timeTextWarning : s.timeTextNormal}`}
                              title="클릭해서 시간 수정"
                            >
                              {node.time}
                            </button>
                          )}
                          <span className={s.playerName}>{node.playerName}</span>
                          <span className={hasWarning ? s.spellNameWarning : s.spellNameNormal}>👉 {node.spellName}</span>
                          {hasWarning && (
                            <span className={s.cooldownWarningTag}>
                              아직 쿨타임이 안 왔습니다
                            </span>
                          )}
                        </div>
                        <div className={s.cdContainer}>
                          <span className={s.cdLabel}>쿨타임(초):</span>
                          <input
                            type="number"
                            value={node.cooldown}
                            onChange={(e) => updateNodeCooldown(node.id, Number(e.target.value))}
                            className={`${s.cdInputBase} ${hasWarning ? s.cdInputWarning : s.cdInputNormal}`}
                          />
                          <button onClick={() => removeMrtNode(node.id)} className={s.deleteBtn}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={s.dictCard}>
        <label className={s.dictTitle}>📖 보스 스킬 사전 (AI 학습용)</label>
        <p className={s.dictDesc}>AI가 택틱을 정확하게 짤 수 있도록, 아래 스킬들의 피해 유형과 위험도를 미리 지정해 주세요.</p>

        <div className={s.dictGrid}>
          {uniqueSpells.map((spell) => {
            const realName = spellDetails[spell.spellId]?.name || spell.spellName;
            const icon = spellDetails[spell.spellId]?.iconUrl;
            const description = spellDetails[spell.spellId]?.description;

            return (
              <div key={spell.spellId} className={s.spellCard}>
                <div className={s.spellHeader}>
                  {icon && <LazyImage src={icon} alt={realName} className={s.spellIcon} />}
                  <div className={s.spellInfo}>
                    <a
                      href={`https://ko.wowhead.com/spell=${spell.spellId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.spellLink}
                    >
                      {realName}
                    </a>
                    <span className={s.spellIdText}>ID: {spell.spellId}</span>
                    {description && (
                      <p className={s.spellDesc}>
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                <div className={s.selectGroup}>
                  <select
                    className={s.typeSelect}
                    value={spellConfig[spell.spellId]?.type || "광역"}
                    onChange={(e) => handleSpellConfigChange(spell.spellId, "type", e.target.value)}
                  >
                    <option value="광역">💥 공대 광역기</option>
                    <option value="탱버">🛡️ 탱커 강타</option>
                    <option value="디버프">☠️ 대상자 디버프</option>
                    <option value="바닥">🔥 바닥 피하기</option>
                  </select>

                  <select
                    className={s.dangerSelect}
                    value={spellConfig[spell.spellId]?.danger || "보통"}
                    onChange={(e) => handleSpellConfigChange(spell.spellId, "danger", e.target.value)}
                  >
                    <option value="낮음">🟢 낮음 (생존기 X)</option>
                    <option value="보통">🟡 보통 (작은 생존기)</option>
                    <option value="치명적">🔴 치명적 (큰 생존기)</option>
                    <option value="즉사급">💀 즉사급 (공생기 필수)</option>
                  </select>
                </div>

                <textarea
                  className={s.memoTextarea}
                  placeholder="📝 공대장 메모: 예) 산개 유지라 뭉치는 생존기 금지 / 채널링 마지막 2초 중첩 필요"
                  value={spellConfig[spell.spellId]?.memo || ""}
                  onChange={(e) => handleSpellConfigChange(spell.spellId, "memo", e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className={s.aiCard}>
        <div className={s.aiGradientBar}></div>
        <div className={s.aiHeaderContainer}>
          <div>
            <label className={s.aiTitle}>🤖 AI 공대장 생존기 배분</label>
            <p className={s.aiDesc}>타임라인과 현재 배치된 힐러 명단을 분석하여 최적의 생존기 택틱을 생성합니다.</p>
          </div>

          <button
            onClick={generateAiTactic}
            disabled={isAiLoading || healersCount === 0}
            className={s.aiButton}
          >
            {isAiLoading ? "택틱 계산 중..." : "AI 택틱 짜기"}
          </button>
        </div>

        {aiTactic && (
          <div className={s.aiOutput}>
            {aiTactic}
          </div>
        )}
      </div>
    </>
  );
}
