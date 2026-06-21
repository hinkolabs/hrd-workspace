"""
ppt_exec_template.py — 하나증권 임원보고 원페이지 템플릿 생성기

구조 (1슬라이드):
  [헤더 바]   보고서 제목 + 부서명 + 날짜
  [KPI 스트립] 핵심 수치 4개 (가로 나열)
  [섹션 박스]  현황 / 이슈 / 대응계획 (3열)
  [결정사항]   하단 다크 바에 결정/요청사항

사용법 (CLI):
  python ppt_exec_template.py
  python ppt_exec_template.py --title "2026 Q2 업무보고" --dept "인재개발실" --date "2026.05.01" --out "임원보고.pptx"

또는 코드에서 직접 호출:
  from ppt_exec_template import build_exec_onepager
  build_exec_onepager(config, output_path)
"""

import argparse, os
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

from ppt_theme import (
    new_presentation, blank_slide,
    add_rect, add_textbox, add_multi_para_textbox,
    SLIDE_W, SLIDE_H,
    PRIMARY, ACCENT, NAVY, DARK, GRAY, MGRAY, LGRAY, LGRAY2, WHITE,
    FONT_TITLE, FONT_BODY, LOGO_PATH,
)

# ── 섹션별 색상 팔레트 (현황/이슈/대응 등) ──────────────────────────────────────
SECTION_COLORS = [PRIMARY, NAVY, ACCENT, RGBColor(0x00, 0x7A, 0x77)]

# ── 레이아웃 상수 (inch) ─────────────────────────────────────────────────────────
HEADER_H  = 0.68
KPI_H     = 0.88
GAP       = 0.08
DECISION_H = 0.82
PAD_X     = 0.2


# ══════════════════════════════════════════════════════════════════════════════════
# 슬라이드 빌더
# ══════════════════════════════════════════════════════════════════════════════════

def build_exec_onepager(config: dict, output_path: str) -> None:
    """
    config 키:
      title      : str  보고서 제목 (필수)
      subtitle   : str  보고부서명 (우측 상단, 선택)
      date       : str  보고일자 (선택, 기본값 오늘)
      kpis       : list[dict]  최대 4개
                   {label, value, change="", positive=True}
      sections   : list[dict]  2~4개
                   {heading, bullets: list[str]}
      decisions  : list[str]  결정/요청사항, 최대 4개 (선택)
      footer_left: str  하단 푸터 좌측 텍스트 (선택)
    """
    from datetime import date as _date

    title     = config.get("title", "[보고서 제목]")
    subtitle  = config.get("subtitle", "")
    rpt_date  = config.get("date", _date.today().strftime("%Y.%m.%d"))
    kpis      = config.get("kpis", [])[:4]
    sections  = config.get("sections", [])[:4]
    decisions = config.get("decisions", [])[:4]
    footer_l  = config.get("footer_left", "")

    prs = new_presentation()
    slide = blank_slide(prs)
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = WHITE

    # ── 헤더 바 ───────────────────────────────────────────────────────────────
    H = HEADER_H
    add_rect(slide, 0, 0, SLIDE_W, Inches(H), fill=PRIMARY)
    add_rect(slide, 0, 0, Inches(0.14), Inches(H), fill=ACCENT)
    add_rect(slide, 0, Inches(H - 0.05), SLIDE_W, Inches(0.05), fill=ACCENT)

    add_textbox(slide, Inches(0.22), 0, Inches(9.8), Inches(H),
                title, font_size=Pt(18), bold=True, color=WHITE,
                font_face=FONT_TITLE, align=PP_ALIGN.LEFT)

    if subtitle:
        add_textbox(slide, Inches(10.5), Inches(0.05), Inches(2.6), Inches(H * 0.44),
                    subtitle, font_size=Pt(9.5), color=WHITE, font_face=FONT_BODY,
                    align=PP_ALIGN.RIGHT)
    if rpt_date:
        add_textbox(slide, Inches(10.5), Inches(H * 0.5), Inches(2.6), Inches(H * 0.42),
                    rpt_date, font_size=Pt(9.5), color=ACCENT, font_face=FONT_BODY,
                    align=PP_ALIGN.RIGHT)

    if os.path.exists(LOGO_PATH):
        try:
            slide.shapes.add_picture(LOGO_PATH, Inches(12.9), Inches(0.08),
                                     height=Inches(H - 0.16))
        except Exception:
            pass

    # ── KPI 스트립 ──────────────────────────────────────────────────────────────
    kpi_y   = Inches(H + GAP)
    kpi_h   = Inches(KPI_H)
    n_kpi   = max(len(kpis), 1)
    kpi_gap = Inches(GAP)
    kpi_w   = (SLIDE_W - Inches(PAD_X * 2) - kpi_gap * (n_kpi - 1)) / n_kpi

    for i, kpi in enumerate(kpis):
        kx = Inches(PAD_X) + i * (kpi_w + kpi_gap)
        is_pos = kpi.get("positive", True)
        accent = PRIMARY if is_pos else ACCENT

        # 카드 배경
        add_rect(slide, kx, kpi_y, kpi_w, kpi_h, fill=LGRAY)
        # 상단 액센트 바
        add_rect(slide, kx, kpi_y, kpi_w, Inches(0.04), fill=accent)

        # 라벨
        add_textbox(slide, kx + Inches(0.1), kpi_y + Inches(0.06),
                    kpi_w - Inches(0.2), Inches(0.22),
                    kpi.get("label", f"KPI {i+1}"),
                    font_size=Pt(9), color=GRAY, font_face=FONT_BODY)

        # 수치 (큰 글자)
        add_textbox(slide, kx + Inches(0.1), kpi_y + Inches(0.27),
                    kpi_w - Inches(0.2), Inches(0.38),
                    kpi.get("value", "—"),
                    font_size=Pt(22), bold=True, color=accent, font_face=FONT_TITLE,
                    align=PP_ALIGN.LEFT)

        # 변화 배지
        change = kpi.get("change", "")
        if change:
            badge_c = RGBColor(0x16, 0xA3, 0x4A) if is_pos else RGBColor(0xDC, 0x26, 0x26)
            add_textbox(slide, kx + kpi_w - Inches(0.85),
                        kpi_y + kpi_h - Inches(0.28), Inches(0.75), Inches(0.22),
                        change, font_size=Pt(9), bold=True, color=badge_c,
                        font_face=FONT_BODY, align=PP_ALIGN.RIGHT)

    # ── 섹션 박스 ────────────────────────────────────────────────────────────────
    sect_y   = Inches(H + GAP + KPI_H + GAP)
    has_dec  = bool(decisions)
    dec_h    = Inches(DECISION_H) if has_dec else 0
    sect_h   = SLIDE_H - sect_y - dec_h - Inches(GAP * (1.5 if has_dec else 0.5))

    n_sect   = max(len(sections), 1)
    sect_gap = Inches(GAP)
    sect_w   = (SLIDE_W - Inches(PAD_X * 2) - sect_gap * (n_sect - 1)) / n_sect
    SECT_HDR_H = Inches(0.32)

    for i, sect in enumerate(sections):
        sx = Inches(PAD_X) + i * (sect_w + sect_gap)
        accent = SECTION_COLORS[i % len(SECTION_COLORS)]

        # 카드 테두리
        add_rect(slide, sx, sect_y, sect_w, sect_h, fill=WHITE,
                 line=PRIMARY, line_width=Pt(0.5))
        # 섹션 헤더 바
        add_rect(slide, sx, sect_y, sect_w, SECT_HDR_H, fill=accent)
        add_textbox(slide, sx + Inches(0.1), sect_y, sect_w - Inches(0.2), SECT_HDR_H,
                    sect.get("heading", f"섹션 {i+1}"),
                    font_size=Pt(10.5), bold=True, color=WHITE,
                    font_face=FONT_TITLE, align=PP_ALIGN.LEFT)

        # 불릿 텍스트
        bullets = sect.get("bullets", ["• 내용을 입력하세요"])
        bullet_text = "\n".join(
            f"• {b}" if not b.startswith("•") else b
            for b in bullets
        )
        bullet_y = sect_y + SECT_HDR_H + Inches(0.07)
        bullet_h = sect_h - SECT_HDR_H - Inches(0.1)
        add_textbox(slide, sx + Inches(0.1), bullet_y,
                    sect_w - Inches(0.18), bullet_h,
                    bullet_text, font_size=Pt(9), color=DARK, font_face=FONT_BODY,
                    align=PP_ALIGN.LEFT, wrap=True)

    # ── 결정/요청사항 바 ──────────────────────────────────────────────────────────
    if has_dec:
        dec_y = SLIDE_H - dec_h - Inches(GAP * 0.5)
        add_rect(slide, 0, dec_y, SLIDE_W, dec_h, fill=DARK)

        # 라벨
        add_textbox(slide, Inches(0.15), dec_y, Inches(1.6), dec_h,
                    "결정/요청사항", font_size=Pt(10), bold=True, color=ACCENT,
                    font_face=FONT_TITLE, align=PP_ALIGN.LEFT)

        # 구분선
        add_rect(slide, Inches(1.75), dec_y + dec_h * 0.2,
                 Inches(0.03), dec_h * 0.6, fill=ACCENT)

        # 결정 항목들 (균등 배분)
        n_dec = len(decisions)
        d_item_w = (SLIDE_W - Inches(1.9) - Inches(0.2)) / n_dec
        for di, dec in enumerate(decisions):
            add_textbox(slide, Inches(1.95) + di * d_item_w, dec_y,
                        d_item_w - Inches(0.1), dec_h,
                        f"▶ {dec}", font_size=Pt(9.5), color=WHITE,
                        font_face=FONT_BODY, align=PP_ALIGN.LEFT, wrap=True)

    # ── 저장 ─────────────────────────────────────────────────────────────────────
    prs.save(output_path)
    print(f"✓ 저장 완료: {output_path}")


# ══════════════════════════════════════════════════════════════════════════════════
# 기본 Placeholder 설정 (빈 템플릿)
# ══════════════════════════════════════════════════════════════════════════════════

DEFAULT_CONFIG = {
    "title":    "[보고서 제목을 입력하세요]",
    "subtitle": "[보고부서]",
    "date":     "",            # 비워두면 오늘 날짜 자동 입력
    "kpis": [
        {"label": "KPI 지표 1",  "value": "—",  "change": "",      "positive": True},
        {"label": "KPI 지표 2",  "value": "—",  "change": "",      "positive": True},
        {"label": "KPI 지표 3",  "value": "—",  "change": "",      "positive": True},
        {"label": "KPI 지표 4",  "value": "—",  "change": "",      "positive": True},
    ],
    "sections": [
        {
            "heading": "현황",
            "bullets": [
                "현황 핵심 내용 1",
                "현황 핵심 내용 2",
                "현황 핵심 내용 3",
            ],
        },
        {
            "heading": "이슈 / 리스크",
            "bullets": [
                "주요 이슈 사항 1",
                "주요 이슈 사항 2",
                "리스크 요인",
            ],
        },
        {
            "heading": "대응 계획",
            "bullets": [
                "대응 방안 1",
                "대응 방안 2",
                "향후 일정",
            ],
        },
    ],
    "decisions": [
        "결정사항 또는 요청사항 1",
        "결정사항 또는 요청사항 2",
    ],
}


# ══════════════════════════════════════════════════════════════════════════════════
# CLI 진입점
# ══════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="하나증권 임원보고 원페이지 PPTX 생성기")
    parser.add_argument("--title",   default="",  help="보고서 제목")
    parser.add_argument("--dept",    default="",  help="보고부서명")
    parser.add_argument("--date",    default="",  help="보고일자 (예: 2026.05.01)")
    parser.add_argument("--out",     default="",  help="출력 파일명 (.pptx)")
    args = parser.parse_args()

    config = dict(DEFAULT_CONFIG)
    if args.title: config["title"]    = args.title
    if args.dept:  config["subtitle"] = args.dept
    if args.date:  config["date"]     = args.date

    safe_title = (args.title or "임원보고_원페이지").replace(" ", "_").replace("/", "_")
    output = args.out or f"{safe_title}.pptx"

    print(f"생성 중: {output}")
    build_exec_onepager(config, output)
