import { RoleType } from "@/app/types";

// 전문화 이름으로 역할을 자동 유추 (한국어 클라이언트 기준)
export function guessRole(spec?: string): RoleType {
  if (!spec) return "UNASSIGNED";
  const tanks   = ["방어", "수호", "혈기", "양조", "복수", "보호"];
  const healers  = ["신성", "복원", "운무", "수양", "보존"];
  const melee    = ["무기", "분노", "징벌", "암살", "무법", "잠행", "야성", "생존", "풍운", "파멸", "고양"];
  const ranged   = ["비전", "화염", "냉기", "고통", "악마", "파괴", "조화", "야수", "사격", "암흑", "정기", "황폐"];

  if (tanks.includes(spec))   return "TANK";
  if (healers.includes(spec)) return "HEALER";
  if (melee.includes(spec))   return "MELEE";
  if (ranged.includes(spec))  return "RANGED";
  return "UNASSIGNED";
}
