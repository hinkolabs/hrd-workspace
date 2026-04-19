/**
 * ppt-prompt-shared.ts
 *
 * Shared prompt utilities used by both generate and redesign API routes.
 * Contains the full slide schema, layout selection guide, and sampleDeck injector.
 */

import type { DesignPreset } from "@/lib/ppt-presets/types";

// ─── Full slide schema (24 layouts) ──────────────────────────────────────────

export function buildSlideSchema(): string {
  return `=== 슬라이드 레이아웃 24종 스키마 ===

기본 6종:
1. title   (표지): { "layout":"title", "title":"...", "subtitle":"...", "tag":"카테고리" }
2. section (섹션): { "layout":"section", "title":"...", "subtitle":"..." }
3. content (내용): { "layout":"content", "title":"...", "bullets":["항목1","항목2","항목3"] }
4. two_column (2단): { "layout":"two_column", "title":"...", "left":{"heading":"...","bullets":[...]}, "right":{"heading":"...","bullets":[...]} }
5. table   (표): { "layout":"table", "title":"...", "headers":["헤더1","헤더2"], "rows":[["값1","값2"]] }
6. closing (마무리): { "layout":"closing", "title":"...", "subtitle":"..." }

고급 10종:
7.  agenda   (목차): { "layout":"agenda", "title":"...", "items":[{"number":"Ⅰ","heading":"...","description":"..."}] }
8.  grid     (카드그리드): { "layout":"grid", "title":"...", "items":[{"heading":"...","description":"...","symbol":"✓"}] }
9.  process  (프로세스): { "layout":"process", "title":"...", "steps":[{"label":"단계명","description":"설명"}] }
10. timeline (타임라인): { "layout":"timeline", "title":"...", "events":[{"period":"2023","label":"이벤트명","description":"설명"}] }
11. comparison (비교): { "layout":"comparison", "title":"...", "left":{"heading":"A안","bullets":[...]}, "right":{"heading":"B안","bullets":[...]}, "vsLabel":"VS" }
12. stats    (KPI수치): { "layout":"stats", "title":"...", "tag":"섹션태그", "subtitle":"보조설명", "stats":[{"value":"120%","label":"성장률","caption":"전년 대비","badge":"+12% YoY","symbol":"📊"}] }
13. quote    (인용문): { "layout":"quote", "quote":"인용문 전체", "author":"출처/화자" }
14. pyramid  (피라미드): { "layout":"pyramid", "title":"...", "levels":[{"label":"최상위","description":"설명"}] }
15. swot     (SWOT): { "layout":"swot", "title":"SWOT 분석", "strengths":["..."], "weaknesses":["..."], "opportunities":["..."], "threats":["..."] }
16. highlight (핵심메시지): { "layout":"highlight", "title":"태그", "message":"핵심 메시지", "subtext":"보충 설명", "features":[{"heading":"특징1","description":"설명1"}] }

차트 3종 (숫자 데이터가 있을 때 우선 사용):
17. chart_bar (막대차트): { "layout":"chart_bar", "title":"...", "labels":["A","B","C"], "series":[{"name":"시리즈명","values":[38,29,12]}], "orientation":"vertical", "source":"출처(선택)" }
18. chart_pie (파이/도넛): { "layout":"chart_pie", "title":"...", "labels":["항목A","항목B","항목C"], "values":[45,35,20], "source":"출처(선택)" }
19. chart_line (라인차트): { "layout":"chart_line", "title":"...", "labels":["1Q","2Q","3Q","4Q"], "series":[{"name":"2024","values":[120,145,132,168]}], "source":"출처(선택)" }

하나증권 전용 5종:
20. hana_kpi (금융KPI): { "layout":"hana_kpi", "title":"...", "kpis":[{"value":"₩1.2B","label":"영업이익","change":"+15.3%","positive":true}] }
21. hana_timeline (실적): { "layout":"hana_timeline", "title":"...", "periods":[{"period":"Q1","value":"1,200","label":"영업이익","growth":"+12%"}] }
22. hana_divider (섹션): { "layout":"hana_divider", "title":"...", "number":"01","subtitle":"..." }
23. hana_matrix (매트릭스): { "layout":"hana_matrix", "title":"...", "topLeft":{"label":"...","items":[...]}, "topRight":{"label":"...","items":[...]}, "bottomLeft":{"label":"...","items":[...]}, "bottomRight":{"label":"...","items":[...]}, "xAxis":"축이름", "yAxis":"축이름" }
24. hana_org (조직도): { "layout":"hana_org", "title":"...", "root":{"label":"대표이사","role":"CEO"}, "children":[{"label":"부서명","role":"역할"}] }

=== 레이아웃 선택 기준 ===
| 원본 슬라이드 특징                              | 권장 레이아웃     |
|-------------------------------------------------|------------------|
| 첫 슬라이드                                     | title            |
| 마지막 슬라이드                                 | closing          |
| 제목만 있거나 챕터 전환                         | section          |
| 목차·아젠다 항목들 (01, 02... / Ⅰ, Ⅱ, Ⅲ...)   | agenda           |
| 3~6개 특징·기능 나열 (개수 강조)                | grid             |
| 단계·절차 흐름 (1단계, 먼저, 다음, 순서)        | process          |
| 연도·분기·날짜 나열 (로드맵/연혁)               | timeline         |
| 두 대안 비교 (A vs B, 전/후, 현황/목표)         | comparison       |
| 숫자 비교(3개 이상 항목)                        | chart_bar        |
| 비율/구성 비교                                  | chart_pie        |
| 트렌드/추이 시계열                              | chart_line       |
| 단일 KPI 카드(2~4개)                            | stats            |
| 인용구·비전·슬로건 문장                         | quote            |
| 계층·우선순위 구조 (핵심→기반)                  | pyramid          |
| 강점/약점/기회/위협 4개 분석                    | swot             |
| 짧은 핵심 메시지 하나를 크게 강조               | highlight        |
| 2개 그룹 비교 + 글머리                          | two_column       |
| 행/열 데이터 표                                 | table            |
| 나머지 일반 내용                                | content          |

⚠️ 중요: content 레이아웃은 전체의 30% 이하로 제한하세요.
⚠️ 같은 레이아웃을 3번 연속 사용하지 마세요.
⚠️ 8장 이상 PPT에서는 agenda, comparison, process, stats 중 최소 3종 이상 사용하세요.
⚠️ 숫자/비율 데이터가 있으면 stats 대신 chart_bar 또는 chart_pie를 우선 사용하세요.

=== 분류 예시 (few-shot) ===
예1: "비은행 부문 기여도: 증권 38%, 카드 29%, 보험 12%" → chart_bar (3개 이상 수치 비교)
예2: "포트폴리오 구성: 주식 45%, 채권 35%, 대안 20%" → chart_pie (비율/구성)
예3: "분기별 순이익: 1Q 120억, 2Q 145억, 3Q 132억, 4Q 168억" → chart_line (시계열 추이)
예4: "2025년 영업이익 1,200억, ROE 12.5%" (2개만) → stats (적은 단일 KPI)
예5: "도입 배경 → 현황 분석 → 개선 방안 → 기대 효과" → process (단계 흐름)
예6: "디지털 전환이 비즈니스의 핵심입니다" → highlight (핵심 메시지 한 줄)
예7: "A안: 자체 개발 vs B안: 외주 위탁" → comparison (두 대안 비교)
예8: "2021 도입 → 2022 고도화 → 2023 정착 → 2024 성과" → timeline (연도별 흐름)
예9: "Ⅰ. 현황 / Ⅱ. 과제 / Ⅲ. 계획" (목차 나열) → agenda`;
}

// ─── Few-shot: completed slide JSON examples ─────────────────────────────────

/**
 * Concrete good-quality slide examples (one per major layout).
 * Appended to the system prompt so the AI has reference material.
 */
export function buildSlideFewShots(): string {
  return `=== 우수 슬라이드 완성 예시 (그대로 구조·밀도를 참고) ===

[title 예시]
{
  "layout": "title",
  "title": "관계사 협업 활성화 방안",
  "subtitle": "시너지 + 기업문화 + 인사의 삼위일체 전략",
  "tag": "경영지원그룹 CEO 보고",
  "date": "2026.04.20"
}

[agenda 예시 — 로마숫자]
{
  "layout": "agenda",
  "title": "목차",
  "items": [
    { "number": "Ⅰ", "heading": "추진 배경", "description": "시장 환경 및 내부 이슈" },
    { "number": "Ⅱ", "heading": "현황 분석", "description": "핵심 KPI 및 격차 진단" },
    { "number": "Ⅲ", "heading": "실행 전략", "description": "3대 영역별 세부 액션" },
    { "number": "Ⅳ", "heading": "기대 효과", "description": "정량·정성 임팩트" }
  ]
}

[stats 예시 — KPI 3~4개]
{
  "layout": "stats",
  "title": "2024 주요 성과",
  "tag": "Key Performance",
  "subtitle": "전년 대비 증감 포함",
  "stats": [
    { "value": "120%", "label": "목표 달성률", "caption": "전년 대비 +20%p", "badge": "+20%p YoY", "symbol": "📈" },
    { "value": "₩4.2B", "label": "연간 매출", "caption": "YoY +18%", "badge": "+18%", "symbol": "💰" },
    { "value": "92점", "label": "고객 만족도", "caption": "NPS 산정", "badge": "+5점", "symbol": "⭐" },
    { "value": "38건", "label": "신규 협업", "caption": "관계사 공동 프로젝트", "badge": "+15건", "symbol": "🤝" }
  ]
}

[grid 예시 — 3x2 카드]
{
  "layout": "grid",
  "title": "6대 실행 영역",
  "items": [
    { "heading": "디지털 전환", "description": "핵심 시스템 클라우드 마이그레이션", "symbol": "☁" },
    { "heading": "데이터 레이크", "description": "단일 분석 플랫폼 구축", "symbol": "📊" },
    { "heading": "AI 업무 자동화", "description": "반복 업무 30% 자동화", "symbol": "🤖" },
    { "heading": "인재 육성", "description": "전사 디지털 교육 의무화", "symbol": "🎓" },
    { "heading": "조직 문화", "description": "애자일 운영 정착", "symbol": "🌱" },
    { "heading": "거버넌스", "description": "KPI 주간 리뷰 체계", "symbol": "🔗" }
  ]
}

[process 예시 — 4단계]
{
  "layout": "process",
  "title": "추진 프로세스",
  "steps": [
    { "label": "기획", "description": "과제 정의 및 KPI 설정" },
    { "label": "실행", "description": "팀별 액션 플랜 수행" },
    { "label": "점검", "description": "주간 진행률 리뷰" },
    { "label": "안착", "description": "표준화·공유·확산" }
  ]
}

[timeline 예시 — 연도별]
{
  "layout": "timeline",
  "title": "디지털 전환 로드맵",
  "events": [
    { "period": "2023", "label": "기반 구축", "description": "데이터 인프라 정비 및 파일럿 완료" },
    { "period": "2024", "label": "확산", "description": "6개 부서 프로세스 자동화 적용" },
    { "period": "2025", "label": "고도화", "description": "AI/ML 기반 의사결정 지원 도입" },
    { "period": "2026", "label": "내재화", "description": "전사 디지털 문화 정착" }
  ]
}

[comparison 예시 — AS-IS / TO-BE]
{
  "layout": "comparison",
  "title": "운영 방식 전환",
  "left":  { "heading": "AS-IS", "bullets": ["분기 리포트 수작업 3일", "데이터 일관성 이슈 빈발", "KPI 가시성 낮음"] },
  "right": { "heading": "TO-BE", "bullets": ["자동화 리포트 실시간 생성", "단일 데이터 레이크 적용", "경영 대시보드 전면 도입"] },
  "vsLabel": "VS"
}

[highlight 예시 — 핵심메시지]
{
  "layout": "highlight",
  "title": "CORE MESSAGE",
  "message": "디지털 전환은 도구가 아니라 문화의 전환입니다",
  "subtext": "시스템보다 사람, 결과보다 프로세스에 집중해 지속 가능한 변화를 만듭니다",
  "features": [
    { "heading": "사람 중심", "description": "현장의 역량 강화가 전환의 출발점" },
    { "heading": "작은 성공", "description": "파일럿 → 확산으로 저항 최소화" },
    { "heading": "측정 가능", "description": "정량 KPI로 투명하게 관리" }
  ]
}

[content 예시 — dashboard variant (복합형)]
{
  "layout": "content",
  "title": "핵심 실행 과제",
  "variant": "dashboard",
  "bullets": [
    "프로세스 자동화 우선순위 재정의",
    "데이터 품질 관리 체계 수립",
    "전사 교육 체계 재정비"
  ],
  "callout": { "heading": "예상 효과", "value": "30%↑", "description": "업무 효율 개선" }
}

[chart_bar 예시]
{
  "layout": "chart_bar",
  "title": "비은행 부문 기여도",
  "labels": ["증권", "카드", "보험"],
  "series": [{ "name": "기여도(%)", "values": [38, 29, 12] }],
  "source": "2024 연간보고서"
}

⚠️ 위 예시의 구조(필드 종류, bullets/items/steps 배열의 풍성함, caption/description의 구체성)를 참고해
각 슬라이드가 비어 보이지 않도록 실제 내용을 충분히 채우세요.
`;
}

// ─── sampleDeck injector ─────────────────────────────────────────────────────

/**
 * Generates the system-prompt block that injects a preset's sampleDeck guidance.
 * Returns empty string if the preset has no sampleDeck.
 */
export function buildLayoutGuide(preset?: DesignPreset | null): string {
  if (!preset?.sampleDeck) return "";

  const { narrative, preferredLayouts, styleNotes } = preset.sampleDeck;

  const lines: string[] = [
    "",
    "=== 이 시안의 구성 패턴 ===",
  ];

  if (narrative) {
    lines.push(`선호 흐름: ${narrative}`);
  }
  if (preferredLayouts.length > 0) {
    lines.push(`적극 활용 레이아웃: ${preferredLayouts.join(", ")}`);
  }
  if (styleNotes.length > 0) {
    lines.push("스타일 노트:");
    for (const note of styleNotes) {
      lines.push(`  - ${note}`);
    }
  }

  return lines.join("\n");
}
