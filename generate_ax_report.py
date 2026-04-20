from fpdf import FPDF
import datetime

FONT_PATH = r"C:\Windows\Fonts\malgun.ttf"
FONT_BOLD_PATH = r"C:\Windows\Fonts\malgunbd.ttf"

TODAY = "2026년 4월 12일"


class ReportPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("malgun", "", FONT_PATH, uni=True)
        self.add_font("malgun", "B", FONT_BOLD_PATH, uni=True)
        self.set_auto_page_break(auto=True, margin=22)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("malgun", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, "하나증권 AX Sprint Workshop 견적 분석 보고서  |  인재개발실 내부 검토용", align="R")
        self.set_draw_color(220, 220, 220)
        self.line(10, 16, 200, 16)
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("malgun", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"- {self.page_no()} -", align="C")

    # ── Cover ──────────────────────────────────────────────────
    def cover_page(self):
        self.add_page()
        # Top accent bar
        self.set_fill_color(20, 50, 120)
        self.rect(0, 0, 210, 8, "F")

        self.ln(55)
        self.set_font("malgun", "B", 11)
        self.set_text_color(20, 50, 120)
        self.cell(0, 8, "내부 검토 보고서", align="C")
        self.ln(12)

        self.set_font("malgun", "B", 26)
        self.set_text_color(20, 30, 60)
        self.cell(0, 14, "AX Sprint Workshop", align="C")
        self.ln(14)
        self.set_font("malgun", "B", 22)
        self.set_text_color(20, 50, 120)
        self.cell(0, 12, "견적 종합 분석 보고서", align="C")
        self.ln(20)

        self.set_draw_color(20, 50, 120)
        self.set_line_width(0.5)
        self.line(40, self.get_y(), 170, self.get_y())
        self.ln(20)

        self.set_font("malgun", "", 12)
        self.set_text_color(80, 80, 80)
        self.cell(0, 8, "제안사: 아리송컴퍼니 (대표 송락현)", align="C")
        self.ln(9)
        self.cell(0, 8, "검토 대상: 올거나이즈(Allganize) Alli 플랫폼 교육 워크숍", align="C")
        self.ln(9)
        self.cell(0, 8, "견적 총액: 14,000천원 (VAT 별도)", align="C")
        self.ln(20)

        self.set_font("malgun", "", 10)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"작성일: {TODAY}  |  하나증권 인재개발실", align="C")

        # Bottom accent bar
        self.set_fill_color(20, 50, 120)
        self.rect(0, 287, 210, 10, "F")

    # ── Section helpers ────────────────────────────────────────
    def section_title(self, number, title):
        """Numbered section header with blue left bar."""
        self.ln(4)
        # Blue sidebar
        self.set_fill_color(20, 50, 120)
        self.rect(10, self.get_y(), 3, 10, "F")
        self.set_x(16)
        self.set_font("malgun", "B", 14)
        self.set_text_color(20, 50, 120)
        self.cell(0, 10, f"{number}. {title}", ln=True)
        self.ln(3)

    def sub_title(self, title):
        self.set_font("malgun", "B", 11)
        self.set_text_color(40, 40, 40)
        self.cell(0, 8, title, ln=True)
        self.ln(1)

    def body(self, text, indent=0):
        self.set_font("malgun", "", 10)
        self.set_text_color(60, 60, 60)
        self.set_x(10 + indent)
        self.multi_cell(190 - indent, 6, text)
        self.ln(1)

    def bullet(self, text, indent=4, symbol="•"):
        self.set_font("malgun", "", 10)
        self.set_text_color(60, 60, 60)
        self.set_x(10 + indent)
        self.cell(5, 6, symbol)
        self.multi_cell(185 - indent, 6, text)

    def bold_bullet(self, label, text, indent=4):
        self.set_x(10 + indent)
        self.set_font("malgun", "B", 10)
        self.set_text_color(30, 30, 30)
        label_w = self.get_string_width(label + "  ")
        self.cell(label_w, 6, label)
        self.set_font("malgun", "", 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(185 - indent - label_w, 6, text)

    def divider(self):
        self.ln(3)
        self.set_draw_color(210, 210, 210)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    # ── Table helpers ──────────────────────────────────────────
    def table_header(self, cols, widths):
        self.set_font("malgun", "B", 9)
        self.set_fill_color(20, 50, 120)
        self.set_text_color(255, 255, 255)
        for col, w in zip(cols, widths):
            self.cell(w, 8, col, border=1, fill=True, align="C")
        self.ln()

    def table_row(self, cells, widths, highlight=False):
        self.set_font("malgun", "", 9)
        self.set_text_color(40, 40, 40)
        if highlight:
            self.set_fill_color(235, 240, 255)
        else:
            self.set_fill_color(252, 252, 252)
        for cell, w in zip(cells, widths):
            self.cell(w, 7, cell, border=1, fill=True, align="C")
        self.ln()

    def callout(self, title, text, color=(235, 245, 255)):
        r, g, b = color
        self.set_fill_color(r, g, b)
        self.set_draw_color(20, 50, 120)
        self.set_line_width(0.3)
        y_start = self.get_y()
        self.rect(10, y_start, 190, 1)  # top border drawn by frame
        # Draw box manually for multi_cell
        self.set_x(10)
        self.set_font("malgun", "B", 10)
        self.set_text_color(20, 50, 120)
        self.cell(190, 8, f"  {title}", ln=True, fill=True, border="LRT")
        self.set_x(10)
        self.set_font("malgun", "", 10)
        self.set_text_color(40, 40, 40)
        self.set_fill_color(r, g, b)
        self.multi_cell(190, 6, f"  {text}", border="LRB", fill=True)
        self.ln(3)


# ═══════════════════════════════════════════════════════════════
#  Build PDF
# ═══════════════════════════════════════════════════════════════

def build():
    pdf = ReportPDF()

    # ── Cover ──────────────────────────────────────────────────
    pdf.cover_page()

    # ══════════════════════════════════════════════════════
    # 1. 견적 구조 요약
    # ══════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("1", "견적 구조 요약")

    pdf.body("아리송컴퍼니(대표: 송락현)가 제안한 AX Sprint Workshop 견적은 3개 항목으로 구성됩니다.")
    pdf.ln(2)

    # Estimate summary table
    widths = [75, 35, 80]
    pdf.table_header(["항목", "금액(천원)", "포함 내용"], widths)
    pdf.table_row(["프로그램 기획 및 교안 설계", "4,000",
                   "맞춤형 교안 · 그룹사 커리큘럼 자문 · 기술가이드 반영"], widths)
    pdf.table_row(["오프라인 워크숍 진행 (2회/6시간)", "6,000",
                   "총 2회 (1회차 기획/설계, 2회차 구축/검증)"], widths, highlight=True)
    pdf.table_row(["기술 지원", "4,000",
                   "올거나이즈 기반 케이스별 솔루션 테스트"], widths)
    pdf.table_row(["합계 (VAT 제외)", "14,000", ""], widths, highlight=True)
    pdf.table_row(["합계 (VAT 포함)", "15,400", ""], widths)

    pdf.ln(4)
    pdf.sub_title("기타 조건")
    pdf.bullet("SaaS 라이선스 비용: 하나증권 부담")
    pdf.bullet("산출 에이전트 소유권: 하나증권 귀속")
    pdf.bullet("AX Sprint 프레임워크 저작권: 아리송컴퍼니 귀속")

    # ══════════════════════════════════════════════════════
    # 2. 견적 타당성 분석
    # ══════════════════════════════════════════════════════
    pdf.section_title("2", "견적 타당성 분석")

    pdf.sub_title("2-1. 공공기관 기준 대비 (2022 서울시 인재원 — 하한선 참고)")
    pdf.body("공공기관 기준은 민간보다 낮아 직접 비교는 부적절하지만, 절대적 하한선 파악에 유용합니다.")
    pdf.ln(2)

    widths2 = [55, 35, 35, 65]
    pdf.table_header(["등급", "기본(1h)", "6시간 합계", "비고"], widths2)
    pdf.table_row(["일반교육 특강급 (차관급 이상)", "400천원", "1,400천원", "2022년 기준"], widths2)
    pdf.table_row(["일반교육 전문급 (5년 이상)", "240천원", "840천원", ""], widths2, highlight=True)
    pdf.table_row(["퍼실리테이터 FT1급 (15년 이상)", "230천원", "980천원", ""], widths2)
    pdf.table_row(["정보화교육 1급", "150천원", "650천원", ""], widths2, highlight=True)
    pdf.table_row(["교육 자문", "100천원/h", "—", ""], widths2)

    pdf.ln(3)
    pdf.callout("2026년 환산 시",
                "2022년 기준 물가 상승(연 3~4%) 반영 시 특강급 최고 등급도 6시간에 약 170만원 수준.\n"
                "이는 아리송컴퍼니 워크숍 진행비 600만원의 약 1/4 수준입니다.",
                color=(255, 248, 230))

    pdf.ln(2)
    pdf.sub_title("2-2. 2026년 민간 AI 교육 시세")
    pdf.bullet("IT/디지털 전환 분야 강사: 시간당 50~200만원")
    pdf.bullet("일반 민간 AI 실습 워크숍: 시간당 80~150만원 주류")
    pdf.bullet("실습형 워크숍은 강의형 대비 1.5~2배 높게 형성 (준비 공수 반영)")

    pdf.ln(3)
    pdf.sub_title("2-3. 항목별 적정성 판단")

    pdf.bold_bullet("워크숍 진행 600만원:", "시간당 100만원 — 민간 시세 중간 수준. 단, 강사 1인 투입 시 비쌈, 2인 투입 시 적정선")
    pdf.bold_bullet("기획/교안 설계 400만원:", "\"커리큘럼 자문\" 범위 불명확. 순수 교안만이면 과다 (통상 강의료의 50~100%)")
    pdf.bold_bullet("기술 지원 400만원:", "가장 근거가 약한 항목. 올거나이즈 공식 온보딩과 중복되며 Jay가 대체 가능")

    pdf.ln(3)
    pdf.callout("종합 판단",
                "총 1,400만원 ÷ 6시간 = 시간당 약 233만원 (기획·지원 포함)\n"
                "민간 시세 상위권에 해당하며, 기획비와 기술지원비 각 400만원이 총액을 과도하게 끌어올린 구조.\n"
                "실제 시세 적정선: 450~800만원 (VAT 별도)",
                color=(255, 240, 240))

    # ══════════════════════════════════════════════════════
    # 3. 견적 불명확 항목
    # ══════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("3", "견적 불명확 항목 — 반드시 확인해야 할 사항")

    pdf.sub_title("3-1. 필수 확인 사항 (아리송컴퍼니에 서면 요청 권장)")

    items = [
        ("투입 인력 계획 미제시",
         "강사/퍼실리테이터 몇 명이 투입되는지, 각 인력의 경력·자격이 전혀 명시되지 않음.\n"
         "인일(Man-Day) 기반 산출 근거 없어 적정성 검증 불가."),
        ("\"기술 지원\" 400만원의 구체적 범위",
         "\"케이스별 솔루션 테스트\"가 몇 건인지, PoC급인지 프로토타입급인지, 결과 산출물이 무엇인지 불명확.\n"
         "실질적으로 강사의 올거나이즈 사전 학습 비용이 포함된 것으로 추정됨."),
        ("\"그룹사 AI 리터러시 커리큘럼 자문\"의 범위",
         "이 워크숍과 별개의 전사 컨설팅이라면 별도 항목으로 분리해야 함.\n"
         "자문 횟수·시간·산출물이 명시되어야 계약 가능."),
        ("교안/교재 소유권 모호",
         "\"AX Sprint 프레임워크 저작권은 아리송컴퍼니 귀속\"이라 명시되었으나,\n"
         "400만원 들여 만든 하나증권 맞춤 교안과 실습 자료의 재사용권이 어디에 있는지 불명확.\n"
         "하나증권이 추후 자체 교육 시 이 교안을 활용할 수 있는지 확인 필요."),
        ("사후 지원 포함 여부",
         "워크숍 종료 후 Q&A, 추가 기술 지원, 결과물 고도화 지원 포함 여부 명시 없음."),
    ]

    for i, (label, text) in enumerate(items, 1):
        y = pdf.get_y()
        pdf.set_fill_color(20, 50, 120)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("malgun", "B", 9)
        pdf.set_x(10)
        pdf.cell(6, 6, str(i), fill=True, align="C")
        pdf.set_font("malgun", "B", 10)
        pdf.set_text_color(20, 50, 120)
        pdf.multi_cell(184, 6, f" {label}")
        pdf.set_font("malgun", "", 10)
        pdf.set_text_color(60, 60, 60)
        pdf.set_x(16)
        pdf.multi_cell(184, 6, text)
        pdf.ln(3)

    pdf.divider()
    pdf.sub_title("3-2. 추가 확인 권장 사항")

    extra = [
        ("아리송컴퍼니 레퍼런스/포트폴리오",
         "웹 검색에서 해당 업체 정보가 거의 확인되지 않음. 유사 워크숍 수행 실적과 올거나이즈 플랫폼 전문성 검증 필요."),
        ("올거나이즈 공식 파트너 여부",
         "아리송컴퍼니가 올거나이즈의 공인 파트너/리셀러인지, 독립 교육업체인지 확인 필요.\n"
         "올거나이즈 자체 교육/온보딩 프로그램 제공 여부도 확인 (라이선스에 포함 가능성 있음)."),
        ("20명 대상 실습 구성",
         "팀 구성(몇 팀?), 팀별 멘토 배치 여부, 올거나이즈 계정 구성(팀별 1개 vs 개인별) 등 실습 환경 세부 사항 미정."),
    ]

    for i, (label, text) in enumerate(extra, 6):
        pdf.bullet(f"{label}: {text}", indent=4, symbol=f"{i}.")
        pdf.ln(2)

    # ══════════════════════════════════════════════════════
    # 4. 올거나이즈 온보딩 확인 결과
    # ══════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("4", "올거나이즈(Allganize) 자체 온보딩 확인 결과")

    pdf.callout("핵심 발견사항",
                "올거나이즈 공식 가이드 사이트(guide.allganize.ai)를 직접 확인한 결과,\n"
                "한국어 온보딩 가이드 전체가 무료 공개되어 있으며, 로그인 후 플랫폼 내 튜토리얼이 자동 제공됩니다.\n"
                "엔터프라이즈 계약 고객에게는 담당 CS + 기술 온보딩 지원이 기본 포함(customer-success 페이지 확인).\n\n"
                "→ 아리송컴퍼니의 \"기술 지원\" 400만원 항목 대부분이 올거나이즈 자체 리소스와 중복됩니다.",
                color=(230, 255, 235))

    pdf.ln(2)
    pdf.sub_title("플랫폼 기술 난이도 등급")

    widths3 = [75, 25, 90]
    pdf.table_header(["기능 영역", "난이도", "비고"], widths3)
    rows3 = [
        ("기본 사용 (문서 업로드, 간단 Q&A 에이전트)", "낮음", "비개발자도 2~3시간이면 기본 동작 확인"),
        ("LLM App Builder 워크플로우 구축", "낮음~중간", "드래그앤드롭; 논리적 사고력 있으면 가능"),
        ("RAG 최적화 (청킹 전략, 프롬프트 튜닝)", "중간", "문서 구조별 최적화 경험·반복 실험 필요"),
        ("API 연동 및 외부 시스템 통합", "중간~높음", "개발 지식 필요, 비개발자 독립 수행 어려움"),
        ("프로덕션 에이전트 배포·운영", "높음", "모니터링·오류 처리·성능 최적화 운영 노하우"),
    ]
    for i, row in enumerate(rows3):
        pdf.table_row(list(row), widths3, highlight=(i % 2 == 1))

    pdf.ln(4)
    pdf.sub_title("6시간 워크숍에서 현실적으로 달성 가능한 수준")
    pdf.bullet("올거나이즈 기본 인터페이스 숙달")
    pdf.bullet("간단한 RAG 기반 문서 Q&A 에이전트 1개 구축")
    pdf.bullet("노드 3~5개 수준의 간단한 워크플로우 구현")
    pdf.ln(2)
    pdf.callout("주의",
                "제안서의 \"작동하는 AI 에이전트(MVP) 직접 구현\"은 마케팅 표현입니다.\n"
                "6시간 내 가능한 것은 데모 수준의 프로토타입이며, 프로덕션 배포 수준과는 차이가 있습니다.",
                color=(255, 248, 230))

    # ══════════════════════════════════════════════════════
    # 5. Jay 커버 범위
    # ══════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("5", "내부 기술 인력(Jay) 커버 가능 범위")

    pdf.body("프로필: 10년차 개발자, AI 도구 활용 능력(Airoute, 인재개발실 앱 구축 경험)")
    pdf.ln(3)

    pdf.sub_title("5-1. 단독으로 충분히 커버 가능 (외부 의존 불필요)")
    covers = [
        ("올거나이즈 플랫폼 기술 습득",
         "노코드 드래그앤드롭 도구이므로 1~2주 독학으로 마스터 가능. RAG 설정·워크플로우 구축·API 연동까지 문제없음"),
        ("기술 지원 업무 (견적의 400만원 항목)",
         "케이스별 솔루션 테스트, 프로토타입 구축, 기술 문제 해결 — 개발자 역량으로 완전 대체 가능"),
        ("교안 기술 파트 작성",
         "LLM App Builder 실습 교안, RAG 설정 가이드, 워크플로우 다이어그램 등 기술 교안 직접 작성 가능"),
        ("실습 보조·기술 멘토링",
         "워크숍 중 참가자 기술 질문 대응, 올거나이즈 환경 트러블슈팅"),
    ]
    for label, text in covers:
        pdf.set_x(10)
        pdf.set_font("malgun", "", 10)
        pdf.set_text_color(20, 130, 60)
        pdf.cell(5, 6, "[O]")
        pdf.set_font("malgun", "B", 10)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 6, label, ln=True)
        pdf.set_x(15)
        pdf.set_font("malgun", "", 10)
        pdf.set_text_color(80, 80, 80)
        pdf.multi_cell(185, 6, text)
        pdf.ln(2)

    pdf.ln(2)
    pdf.sub_title("5-2. 준비 필요한 영역 (단기 학습으로 해결 가능)")
    partial = [
        ("교안 기획 (워크숍 설계)",
         "ICE 프레임워크, 디자인씽킹 기반 Pain Point 발굴 설계는 퍼실리테이션 방법론 학습 필요 (온라인 강의 1~2일 분량)"),
        ("증권업 특화 케이스 발굴",
         "리서치·자산관리·IB 실무 이해가 필요하나, 인재개발실 소속이면 사내 현업 담당자와 협업으로 해결 가능"),
    ]
    for label, text in partial:
        pdf.set_x(10)
        pdf.set_font("malgun", "", 10)
        pdf.set_text_color(200, 140, 0)
        pdf.cell(5, 6, "△")
        pdf.set_font("malgun", "B", 10)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 6, label, ln=True)
        pdf.set_x(15)
        pdf.set_font("malgun", "", 10)
        pdf.set_text_color(80, 80, 80)
        pdf.multi_cell(185, 6, text)
        pdf.ln(2)

    pdf.ln(2)
    pdf.sub_title("5-3. 외부 지원이 필요할 수 있는 영역")
    needs = [
        ("20명 대상 그룹 퍼실리테이션 진행",
         "교육학적 기법을 활용한 대규모 그룹 퍼실리테이션은 별도 스킬. 경험이 없다면 전문 퍼실리테이터 1명만 단기 조달 권장"),
        ("전사 AI 리터러시 커리큘럼 로드맵",
         "조직 전체 AI 역량 로드맵 설계는 교육공학·조직개발 전문성 영역 (이 워크숍과는 별개)"),
    ]
    for label, text in needs:
        pdf.set_x(10)
        pdf.set_font("malgun", "", 10)
        pdf.set_text_color(180, 50, 50)
        pdf.cell(5, 6, "○")
        pdf.set_font("malgun", "B", 10)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 6, label, ln=True)
        pdf.set_x(15)
        pdf.set_font("malgun", "", 10)
        pdf.set_text_color(80, 80, 80)
        pdf.multi_cell(185, 6, text)
        pdf.ln(2)

    # ══════════════════════════════════════════════════════
    # 6. 내재화 가능성
    # ══════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("6", "인재개발실 직원 내재화 가능성")

    pdf.sub_title("6-1. 단계별 내재화 소요 기간")

    widths4 = [18, 40, 42, 90]
    pdf.table_header(["단계", "목표 수준", "소요 기간", "달성 방법"], widths4)
    stages = [
        ("1단계", "기본 조작", "6시간 워크숍", "문서 업로드, 간단 에이전트 생성"),
        ("2단계", "독립 활용", "워크숍 후 2~4주", "업무별 에이전트 스스로 설계·구축"),
        ("3단계", "타 직원 교육", "2~3개월 실무 경험", "반복 활용 후 내부 전파 가능"),
        ("4단계", "고도화·운영", "6개월 이상", "개발자(Jay) 지원 없이는 한계 존재"),
    ]
    for i, row in enumerate(stages):
        pdf.table_row(list(row), widths4, highlight=(i % 2 == 1))

    pdf.ln(4)
    pdf.sub_title("6-2. 내재화 성공의 핵심 요인")
    pdf.bullet("워크숍 이후 올거나이즈 계정 유지 및 지속 실습 환경 확보 (가장 중요)")
    pdf.bullet("전담 내부 기술 지원자(Jay) 존재 여부가 내재화 속도를 결정")
    pdf.bullet("월 1~2회 오피스아워(후속 세션) 운영 시 내재화 성공률 대폭 상승")
    pdf.bullet("실무에 즉시 적용 가능한 구체적 유스케이스 사전 선정 필요")

    pdf.ln(4)
    pdf.sub_title("6-3. 현실적 기대치 (비개발 직원 20명 기준)")

    widths5 = [90, 30, 70]
    pdf.table_header(["도달 수준", "예상 비율", "인원"], widths5)
    pdf.table_row(["독립적으로 간단한 에이전트 구축 가능", "30~40%", "6~8명"], widths5, highlight=True)
    pdf.table_row(["기존 에이전트를 수정·활용 가능", "40~50%", "8~10명"], widths5)
    pdf.table_row(["워크숍 후 자발적 활용이 어려운 수준", "10~20%", "2~4명"], widths5, highlight=True)

    # ══════════════════════════════════════════════════════
    # 7. 시나리오 비교 및 권고
    # ══════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("7", "시나리오 비교 및 최종 권고")

    pdf.sub_title("7-1. 3가지 진행 시나리오 비교")

    widths6 = [50, 35, 40, 65]
    pdf.table_header(["시나리오", "예상 비용", "리스크", "특이사항"], widths6)
    pdf.table_row([
        "A. 현 견적 그대로",
        "15,400천원",
        "높음",
        "기술지원 중복·레퍼런스 미검증·교안 소유권 불명확"
    ], widths6)
    pdf.table_row([
        "B. 협상 후 진행 (권장)",
        "7,700~9,900천원",
        "중간",
        "기술지원 삭제, 교안 소유권 귀속 조건 추가"
    ], widths6, highlight=True)
    pdf.table_row([
        "C. Jay 주도 + FT 외주",
        "2,200~4,400천원",
        "낮음~중간",
        "Jay 업무 부하, 퍼실리테이션 품질 편차"
    ], widths6)

    pdf.ln(4)
    pdf.sub_title("7-2. 시나리오 B 협상 체크리스트")

    nego = [
        "인일(Man-Day) 기반 상세 산출서 요청 — 투입 인력 수·등급·투입 일수 명시",
        "\"기술 지원\" 400만원 항목 삭제 또는 100만원 이하로 축소 협상 (Jay 내부 처리 + 올거나이즈 자체 온보딩 활용)",
        "\"그룹사 AI 리터러시 커리큘럼 자문\" 분리 — 이번 워크숍 교안 설계와 별도 계약으로 분리",
        "교안 및 실습 자료 재사용권을 하나증권에 귀속하도록 계약 조건 수정",
        "사후 지원 조건 명시 — 워크숍 후 최소 1개월 Q&A 채널 운영",
        "아리송컴퍼니 레퍼런스 제출 요청 — 유사 규모 금융권 워크숍 수행 실적",
        "올거나이즈 공식 파트너 여부 및 플랫폼 전문성 자격 확인",
    ]
    for i, item in enumerate(nego, 1):
        pdf.set_x(10)
        pdf.set_font("malgun", "B", 10)
        pdf.set_text_color(20, 50, 120)
        pdf.cell(6, 6, f"{i}.")
        pdf.set_font("malgun", "", 10)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(184, 6, item)
        pdf.ln(1)

    pdf.ln(3)
    pdf.sub_title("7-3. 대안 검토")

    pdf.bullet("올거나이즈 자체 교육 프로그램 먼저 확인: 이미 라이선스 비용을 내고 있다면 기본 교육이 포함되어 있을 수 있음. 올거나이즈 담당 AM에게 교육 지원 범위 확인 후 견적 협상에 활용")
    pdf.ln(2)
    pdf.bullet("Jay 주도 + 퍼실리테이터 1인 외주 (시나리오 C): Jay가 기술 교안·실습 지원을 전담하고, 워크숍 진행만 전문 퍼실리테이터 1인 단기 계약. 예상 비용 200~400만원(VAT포함)")
    pdf.ln(2)
    pdf.bullet("내부 파일럿 우선 진행: Jay가 먼저 올거나이즈를 숙달 → 소규모(5명) 파일럿 내부 진행 → 품질 확인 후 외부 교육 여부 결정. 리스크와 비용 동시 최소화")

    # ══════════════════════════════════════════════════════
    # 8. 종합 결론
    # ══════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("8", "종합 결론")

    pdf.callout("핵심 결론 3가지",
                "① 기술 지원 400만원은 근거가 가장 약한 항목\n"
                "   → 올거나이즈 공식 온보딩과 중복, Jay가 1~2주 독학으로 완전 대체 가능\n\n"
                "② 아리송컴퍼니 레퍼런스가 사실상 없음\n"
                "   → 발주 전 유사 워크숍 수행 실적과 올거나이즈 공인 파트너 여부 반드시 확인\n\n"
                "③ 협상 목표금액: 700~900만원 (VAT 포함)\n"
                "   → 기술지원 삭제·교안 소유권 귀속·사후지원 명시를 협상 카드로 활용\n"
                "   → 협상 불가 시 Jay 주도 + 퍼실리테이터 1인 외주로 200~400만원 수준에서 동등 품질 구현 가능",
                color=(230, 240, 255))

    pdf.ln(4)
    pdf.sub_title("의사결정 흐름 요약")
    flow = [
        ("STEP 1", "올거나이즈 담당 AM에게 기본 교육 지원 범위 확인 (1~2일 내)"),
        ("STEP 2", "아리송컴퍼니에 상세 산출 근거 + 레퍼런스 서면 요청 (1주 내)"),
        ("STEP 3-A", "레퍼런스 충분 + 협상 성공 시: 700~900만원 수준으로 계약 (시나리오 B)"),
        ("STEP 3-B", "협상 결렬 또는 레퍼런스 불충분 시: Jay 주도 내부 진행 (시나리오 C)"),
    ]
    for step, desc in flow:
        pdf.set_x(10)
        pdf.set_fill_color(20, 50, 120)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("malgun", "B", 9)
        sw = pdf.get_string_width(step) + 4
        pdf.cell(sw, 7, step, fill=True, align="C")
        pdf.set_font("malgun", "", 10)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 7, f"  {desc}", ln=True)
        pdf.ln(2)

    pdf.ln(6)
    pdf.set_font("malgun", "", 9)
    pdf.set_text_color(160, 160, 160)
    pdf.cell(0, 8, f"본 보고서는 {TODAY} 기준으로 작성된 내부 검토 자료입니다.", align="C", ln=True)
    pdf.cell(0, 8, "외부 배포 금지 | 하나증권 인재개발실", align="C", ln=True)

    # ── Output ────────────────────────────────────────────
    out_path = r"c:\dev\hrd-workspace\하나증권_AX Sprint_견적분석_보고서.pdf"
    pdf.output(out_path)
    print(f"PDF 생성 완료: {out_path}")


if __name__ == "__main__":
    build()
