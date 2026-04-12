from fpdf import FPDF

FONT_PATH = r"C:\Windows\Fonts\malgun.ttf"
FONT_BOLD_PATH = r"C:\Windows\Fonts\malgunbd.ttf"


class AlliGuidePDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("malgun", "", FONT_PATH, uni=True)
        self.add_font("malgun", "B", FONT_BOLD_PATH, uni=True)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("malgun", "B", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, "Alli Works - 지식베이스 문서 관리 가이드", align="R")
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("malgun", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"- {self.page_no()} -", align="C")

    def cover_page(self):
        self.add_page()
        self.ln(60)
        self.set_font("malgun", "B", 28)
        self.set_text_color(30, 60, 120)
        self.cell(0, 15, "Alli Works", align="C")
        self.ln(18)
        self.set_font("malgun", "B", 22)
        self.set_text_color(50, 50, 50)
        self.cell(0, 12, "지식베이스 문서 관리 가이드", align="C")
        self.ln(30)
        self.set_font("malgun", "", 12)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "문서 업로드 · 폴더 관리 · 해시태그 · 오류 해결 · 엑셀 연동", align="C")
        self.ln(10)
        self.cell(0, 8, "출처: docs.allganize.ai", align="C")
        self.ln(5)
        self.cell(0, 8, "생성일: 2026년 4월 11일", align="C")

    def chapter_title(self, title):
        self.add_page()
        self.set_font("malgun", "B", 20)
        self.set_text_color(30, 60, 120)
        self.cell(0, 14, title)
        self.ln(6)
        self.set_draw_color(30, 60, 120)
        self.set_line_width(0.8)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(10)

    def section_title(self, title):
        self.ln(4)
        self.set_font("malgun", "B", 14)
        self.set_text_color(50, 80, 140)
        self.cell(0, 10, title)
        self.ln(10)

    def sub_section_title(self, title):
        self.ln(2)
        self.set_font("malgun", "B", 12)
        self.set_text_color(70, 70, 70)
        self.cell(0, 8, title)
        self.ln(8)

    def body_text(self, text):
        self.set_font("malgun", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6.5, text)
        self.ln(2)

    def bullet(self, text, indent=10):
        x = self.get_x()
        self.set_font("malgun", "", 10)
        self.set_text_color(40, 40, 40)
        self.set_x(x + indent)
        self.cell(5, 6.5, "•")
        self.multi_cell(0, 6.5, text)
        self.ln(1)

    def numbered_item(self, num, text, indent=10):
        x = self.get_x()
        self.set_font("malgun", "B", 10)
        self.set_text_color(30, 60, 120)
        self.set_x(x + indent)
        self.cell(8, 6.5, f"{num}.")
        self.set_font("malgun", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6.5, text)
        self.ln(1)

    def info_box(self, text, box_type="info"):
        colors = {
            "info": (230, 240, 255, 30, 60, 120),
            "warning": (255, 245, 230, 180, 100, 20),
            "important": (255, 235, 235, 180, 40, 40),
        }
        bg_r, bg_g, bg_b, txt_r, txt_g, txt_b = colors.get(box_type, colors["info"])

        self.ln(2)
        self.set_fill_color(bg_r, bg_g, bg_b)
        self.set_font("malgun", "", 9)
        self.set_text_color(txt_r, txt_g, txt_b)
        x = self.get_x()
        w = self.w - self.l_margin - self.r_margin
        y_start = self.get_y()
        self.set_x(x + 5)
        self.multi_cell(w - 10, 6, text, fill=True)
        self.ln(3)

    def simple_table(self, headers, rows):
        self.ln(2)
        col_count = len(headers)
        usable_w = self.w - self.l_margin - self.r_margin
        col_w = usable_w / col_count

        self.set_font("malgun", "B", 9)
        self.set_fill_color(30, 60, 120)
        self.set_text_color(255, 255, 255)
        for h in headers:
            self.cell(col_w, 8, h, border=1, fill=True, align="C")
        self.ln()

        self.set_font("malgun", "", 9)
        self.set_text_color(40, 40, 40)
        fill = False
        for row in rows:
            if fill:
                self.set_fill_color(245, 248, 255)
            else:
                self.set_fill_color(255, 255, 255)

            max_lines = 1
            for cell_text in row:
                lines = self.multi_cell(col_w, 6, cell_text, split_only=True)
                max_lines = max(max_lines, len(lines))
            row_h = max(8, max_lines * 6)

            x_start = self.get_x()
            y_start = self.get_y()

            if y_start + row_h > self.h - 25:
                self.add_page()
                y_start = self.get_y()

            for i, cell_text in enumerate(row):
                self.set_xy(x_start + i * col_w, y_start)
                self.rect(x_start + i * col_w, y_start, col_w, row_h)
                if fill:
                    self.set_fill_color(245, 248, 255)
                    self.rect(
                        x_start + i * col_w, y_start, col_w, row_h, style="F"
                    )
                    self.rect(x_start + i * col_w, y_start, col_w, row_h)
                self.set_xy(x_start + i * col_w + 1, y_start + 1)
                self.multi_cell(col_w - 2, 6, cell_text)
            self.set_xy(x_start, y_start + row_h)
            fill = not fill
        self.ln(4)


def build_pdf():
    pdf = AlliGuidePDF()

    # ===== Cover Page =====
    pdf.cover_page()

    # ===== Table of Contents =====
    pdf.add_page()
    pdf.set_font("malgun", "B", 18)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 14, "목차")
    pdf.ln(14)
    toc_items = [
        ("1", "문서 업로드 및 권한 관리"),
        ("2", "폴더 생성 및 권한 관리"),
        ("3", "해시태그 일괄 관리"),
        ("4", "문서 업로드 시 오류 메시지 분류"),
        ("5", "엑셀 파일을 테이블데이터로 실행 및 활용하기"),
    ]
    for num, title in toc_items:
        pdf.set_font("malgun", "", 12)
        pdf.set_text_color(50, 50, 50)
        pdf.cell(0, 10, f"  {num}.  {title}")
        pdf.ln(10)

    # ===== Chapter 1: 문서 업로드 및 권한 관리 =====
    pdf.chapter_title("1. 문서 업로드 및 권한 관리")

    pdf.section_title("문서 업로드")
    pdf.numbered_item(1, "폴더 선택: 문서를 업로드할 폴더를 선택한 후, '업로드' 버튼을 클릭합니다.")
    pdf.numbered_item(
        2,
        "파일 선택 및 업로드: '찾아보기' 버튼을 클릭하여 파일을 선택하거나, 파일을 드래그&드롭하여 업로드할 수 있습니다.",
    )
    pdf.numbered_item(
        3,
        "파일 편집 (선택 사항): 파일명을 변경하거나 해시태그를 추가하고, 접근 권한을 설정하려면 '편집' 버튼을 클릭합니다. 업로드 후에도 동일하게 편집이 가능합니다.",
    )
    pdf.numbered_item(
        4, "편집 적용 및 업로드 완료: 편집이 완료되면 '적용' 버튼을 클릭한 후, '업로드' 버튼을 눌러 업로드를 완료합니다."
    )

    pdf.section_title("파일 편집")
    pdf.sub_section_title("파일명 및 해시태그 설정")
    pdf.bullet("파일명: 문서를 식별하기 쉽도록 파일명을 자유롭게 수정할 수 있습니다.")
    pdf.body_text("  예: 2025_프로젝트계획서_v2")
    pdf.bullet(
        "해시태그: 문서의 주요 키워드를 해시태그로 설정해 검색 시 쉽게 찾아볼 수 있습니다."
    )
    pdf.body_text("  예: #기획안, #마케팅전략, #보고서")
    pdf.body_text(
        "해시태그는 관련 문서들을 그룹화하고 빠르게 찾을 수 있도록 도와줍니다."
    )

    pdf.section_title("접근 권한 설정")
    pdf.body_text(
        "문서 열람 및 편집 권한을 유연하게 설정하여, 협업 시 보안을 강화하고 문서 관리 효율을 높일 수 있습니다."
    )

    pdf.sub_section_title("권한 유형")
    pdf.simple_table(
        ["권한 유형", "설명"],
        [
            ["뷰어", "문서 내용 및 메타데이터 열람, 검색 가능 (편집 불가)"],
            ["편집자", "문서 열람 + 편집 및 삭제 가능"],
        ],
    )

    pdf.sub_section_title("접근 권한 기본 원칙")
    pdf.bullet("기본값: 모든 멤버에게 전체 공개, 관리자 그룹에게만 편집 권한이 부여됩니다.")
    pdf.bullet(
        "'이 프로젝트의 모든 멤버가 열람 가능' 옵션을 끄면 특정 멤버에게만 열람 및 편집 권한을 줄 수 있습니다."
    )

    pdf.simple_table(
        ["설정 방식", "설명"],
        [
            ["상위 폴더 권한 사용 (기본값)", "상위 폴더의 권한이 동일하게 적용됩니다."],
            [
                "개별 권한 설정",
                "하위 폴더 또는 특정 문서에 대해 별도로 열람/편집 권한을 설정할 수 있습니다.",
            ],
        ],
    )

    pdf.info_box(
        "중요: 권한 설정은 문서의 검색 및 AI 답변 생성 시에도 동일하게 적용됩니다.", "important"
    )

    pdf.section_title("문서 탭 개요")
    pdf.body_text(
        "문서 탭에서는 좌측 내비게이션 바를 활용하여 전체 폴더 구조를 확인할 수 있습니다. 폴더는 여러 계층 구조로 생성 가능하며, 폴더 수 및 계층 수에는 제한이 없습니다."
    )
    items = [
        ("문서 검색 기능", "문서 제목 및 필터링 옵션을 활용하여 특정 문서를 빠르게 검색할 수 있습니다."),
        ("파일 업로드", "문서 및 ZIP 파일을 업로드할 수 있습니다."),
        ("폴더 생성", "새로운 폴더를 생성할 수 있습니다. 올바른 폴더 위치를 확인한 후 생성해야 합니다."),
        ("상태", "문서의 활성화 여부를 나타냅니다. 활성화된 문서는 답변 검색 시 활용됩니다."),
        (
            "해시태그",
            "문서 검색 시 활용할 수 있는 메타 정보입니다. 해시태그가 설정된 경우, 이를 기준으로 검색 필터를 적용할 수 있습니다.",
        ),
        ("접근 권한 목록", "해당 문서에 대한 관리자 및 사용자의 접근 권한을 확인하고 편집할 수 있습니다."),
        ("파싱", "문서가 정상적으로 업로드되었는지 여부를 확인할 수 있습니다."),
        ("작성/최근 수정", "문서 작성 및 최근 수정 날짜, 그리고 작업을 수행한 멤버명이 표시됩니다."),
        ("파일 크기", "문서의 파일 크기를 확인할 수 있습니다."),
        ("위치", "해당 문서가 어떤 폴더에 속해 있는지 표시됩니다."),
        (
            "Q&A 자동 생성",
            "LLM 모델을 활용하여 해당 문서에 대한 자동 Q&A를 생성할 수 있습니다. 모델과 그룹 프롬프트, 페이지 범위를 지정할 수 있습니다.",
        ),
        (
            "문서 편집 기능",
            "파일 편집, 파일 다운로드, 파일 이동, 삭제 등을 통해 보다 효율적으로 문서를 편집하고 관리할 수 있습니다.",
        ),
    ]
    for i, (title, desc) in enumerate(items, 1):
        pdf.numbered_item(i, f"{title}: {desc}")

    # ===== Chapter 2: 폴더 생성 및 권한 관리 =====
    pdf.chapter_title("2. 폴더 생성 및 권한 관리")
    pdf.body_text(
        "Alli에서는 상위 폴더 외에도 여러 개의 하위 폴더를 생성하여 문서를 더 체계적으로 관리할 수 있습니다. 폴더 구조를 설정하고, 폴더별로 접근 권한을 설정하면 부서나 팀별로 필요한 문서만 열람·편집할 수 있어, 보안과 협업 효율성이 높아집니다."
    )

    pdf.section_title("ZIP 파일을 통한 일괄 업로드")
    pdf.body_text(
        "회사 내부에서 이미 사용 중인 폴더 구조가 있다면, 이를 그대로 유지하면서 Alli에 업로드할 수 있습니다."
    )
    pdf.bullet("ZIP 파일을 업로드하면 내부 폴더 구조가 자동으로 반영됩니다.")
    pdf.bullet("문서도 함께 업로드되므로 초기 세팅이 간편합니다.")
    pdf.info_box(
        "예: 각 부서별 폴더와 하위 폴더가 포함된 ZIP 파일을 업로드하면, 그대로 폴더 트리가 생성됩니다."
    )

    pdf.section_title("수동으로 폴더 생성하기")

    pdf.sub_section_title("상위 폴더 생성")
    pdf.numbered_item(1, "폴더명을 입력합니다.")
    pdf.numbered_item(
        2,
        "접근 권한을 설정합니다. 기본값은 모든 멤버에게 전체 공개입니다. 이 옵션을 끄면, 특정 그룹 또는 개별 멤버에게만 열람·편집 권한을 줄 수 있습니다.",
    )
    pdf.numbered_item(3, "권한 설정은 문서 검색 및 답변 생성 시에도 동일하게 적용됩니다.")

    pdf.info_box(
        "예시: HR 부서만 사용할 폴더를 생성하려면\n"
        "- '이 프로젝트의 모든 멤버가 열람 가능' 옵션 OFF\n"
        "- HR 부서에 속한 인원 또는 HR 그룹만 선택 → 해당 폴더는 HR 부서만 접근 가능"
    )

    pdf.sub_section_title("하위 폴더 생성")
    pdf.body_text(
        "하위 폴더는 상위 폴더 내부에서 생성할 수 있으며, 필요한 경우 권한을 별도로 설정할 수 있습니다."
    )
    pdf.numbered_item(1, "폴더명을 입력합니다.")
    pdf.numbered_item(
        2,
        "권한 설정 방법 선택: 상위 폴더의 권한을 그대로 사용(기본값) 또는 개별 권한 설정으로 하위 폴더에만 적용할 권한을 새로 설정할 수 있습니다.",
    )
    pdf.info_box(
        "예: 마케팅팀과 디자인팀이 같은 상위 폴더를 공유하되, 각자의 하위 폴더에만 접근할 수 있도록 설정 가능"
    )

    pdf.section_title("기존 폴더의 권한 편집하기")
    pdf.numbered_item(1, "권한을 수정할 폴더를 선택합니다.")
    pdf.numbered_item(2, "'접근 권한 관리' 또는 '편집' 버튼을 클릭합니다.")
    pdf.numbered_item(
        3, "새로운 권한을 지정하거나 기존 권한을 변경합니다. 그룹 단위 또는 개별 멤버 단위로 설정 가능합니다."
    )

    pdf.sub_section_title("유의사항")
    pdf.bullet("폴더 권한은 문서 검색, 답변 생성 등 모든 문서 활용 기능에 동일하게 적용됩니다.")
    pdf.bullet(
        "상위 폴더의 권한을 하위 폴더에 적용할 수 있으나, 필요 시 분리 설정이 가능합니다."
    )
    pdf.bullet("그룹 설정을 잘 활용하면 권한 관리가 훨씬 수월합니다.")

    # ===== Chapter 3: 해시태그 일괄 관리 =====
    pdf.chapter_title("3. 해시태그 일괄 관리")

    pdf.section_title("해시태그 일괄 추가/제거하기")
    pdf.body_text(
        "해시태그 일괄 설정 기능으로, 여러 문서에서 한 번에 해시태그를 추가/제거할 수 있습니다."
    )
    pdf.numbered_item(
        1,
        "문서 메뉴에서 원하는 문서를 개별 또는 일괄 체크박스로 선택합니다. 최대 1,000개의 문서를 한 번에 선택할 수 있습니다.",
    )
    pdf.numbered_item(2, "우측 상단 휴지통 옆 아이콘을 통해 #해시태그 관리 버튼을 클릭합니다.")

    pdf.sub_section_title("해시태그 추가")
    pdf.body_text("해시태그를 기존의 목록에서 선택하거나, 새로 생성할 수 있습니다.")

    pdf.sub_section_title("해시태그 제거")
    pdf.body_text(
        "해시태그를 기존의 해시태그 목록 중에서 간편하게 선택할 수 있습니다. 우측 하단의 확인 버튼을 클릭하면 새 해시태그가 적용됩니다."
    )

    pdf.section_title("해시태그로 검색하기")
    pdf.body_text(
        "해시태그 기능을 이용하여 문서를 간편하게 검색할 수 있습니다."
    )
    pdf.numbered_item(1, "'문서' 메뉴 상단 검색창 왼쪽의 필터 아이콘을 클릭합니다.")
    pdf.numbered_item(
        2,
        "문서 ON/OFF 및 파싱 상태와 함께, 포함할 해시태그와 제외할 해시태그를 필터링할 수 있습니다.",
    )
    pdf.numbered_item(
        3, "입력창을 클릭하여 각 항목에서 포함/제외할 해시태그를 목록에서 하나 이상 선택할 수 있습니다."
    )
    pdf.body_text(
        "복수의 태그를 필터링할 시에 위 태그들 중 하나 이상을 포함한 문서, 모든 태그를 포함한 문서를 설정함으로써 사용자가 원하는 범위대로 해시태그 문서를 찾을 수 있습니다."
    )

    pdf.section_title("해시태그 활용하기")
    pdf.body_text(
        "해시태그는 문서의 메타데이터에 포함되어, 특정 주제나 카테고리의 문서를 효과적으로 필터링하는 데 유용합니다."
    )

    pdf.sub_section_title("해시태그를 통한 문서 검색 범위 지정")
    pdf.bullet(
        "해시태그는 문서 검색 시 필터링 조건으로 사용할 수 있으며, 특정 태그가 포함된 문서만 검색하거나 제외할 수 있습니다."
    )
    pdf.info_box(
        "예: 특정 앱에서 금융 관련 문서만 답변 생성에 사용하고 싶고, 경영 관련 문서는 제외하고자 할 때:\n"
        "- 금융 태그가 포함된 문서만 선택\n"
        "- 경영 태그가 포함된 문서는 제외"
    )

    # ===== Chapter 4: 오류 메시지 분류 =====
    pdf.chapter_title("4. 문서 업로드 시 오류 메시지 분류")
    pdf.body_text(
        "Alli 시스템 사용 중 발생할 수 있는 오류 코드와 이에 대한 조치 방법을 정리한 가이드입니다. "
        "오류는 크게 멤버(문서 업로더)가 직접 해결할 수 있는 경우와 Alli 어카운트 매니저의 도움이 필요한 시스템 내부 오류로 나뉩니다."
    )

    pdf.section_title("멤버 측 조치사항")
    pdf.body_text("멤버가 직접 조치해 해결할 수 있는 오류:")

    pdf.simple_table(
        ["오류 코드", "설명", "해결 방법"],
        [
            ["DOCUMENT_BROKEN", "파일이 손상됨", "다른 사본을 업로드하세요"],
            ["DOCUMENT_EMPTY", "파일에 내용 없음", "내용이 있는 파일을 업로드하세요"],
            ["DOCUMENT_ENCRYPTED", "파일이 암호화됨", "암호화를 해제하고 다시 업로드하세요"],
            ["PDF_ERROR", "PDF 페이지 처리 오류", "PDF 파일을 복구하고 재시도하세요"],
            ["HTML_PAGE_FORBIDDEN", "웹페이지 접근 권한 없음", "서버에서 URL에 접근할 수 없습니다"],
            ["HTML_PAGE_NOT_FOUND", "웹페이지를 찾을 수 없음", "URL이 올바른지 확인하세요"],
            ["HTML_PAGE_UNAVAILABLE", "웹페이지 서버 오류", "URL이 올바른지 확인하세요"],
            [
                "HTML_CONTENT_TYPE_NOT_SUPPORTED",
                "지원되지 않는 HTML 유형",
                "URL의 컨텐츠 형식을 확인하세요",
            ],
            ["HTML_BODY_NOT_FOUND", "HTML 본문 내용 없음", "URL의 본문이 있는지 확인하세요"],
            [
                "CREDIT_LIMIT_EXCEED",
                "크레딧 제한 초과",
                "설정 > 결제 탭에서 크레딧 허용량을 조정해 주세요",
            ],
        ],
    )

    pdf.section_title("어카운트 매니저 조치사항")
    pdf.body_text(
        "Alli 시스템 내부 문제로 멤버가 해결할 수 없으며, 어카운트 매니저의 도움이 필요한 오류:"
    )
    pdf.simple_table(
        ["오류 코드", "설명"],
        [
            ["OCR_ERROR", "서버 내부 OCR 서비스 오류"],
            ["NETWORK_ERROR", "서버 내부 네트워크 오류"],
            ["LLM_ERROR", "서버 내부 AI 서비스 오류"],
            ["INTERNAL_ERROR", "알 수 없는 내부 오류"],
        ],
    )

    pdf.sub_section_title("문의 시 포함할 정보")
    pdf.bullet("오류 코드 (e.g. 701) 번호")
    pdf.bullet("발생 시각")
    pdf.bullet("해당하는 파일")

    # ===== Chapter 5: 엑셀 파일 테이블데이터 =====
    pdf.chapter_title("5. 엑셀 파일을 테이블데이터로 실행 및 활용하기")
    pdf.body_text(
        "엑셀 데이터를 구조화된 데이터베이스 형태로 변환하여 검색의 정확도와 일관성을 극대화할 수 있습니다. "
        "엑셀 시트 내의 테이블을 대시보드에서 직접 확인 및 편집할 수 있으며, 완성된 스키마는 자동으로 DB화되어 "
        "LLM이 정형 데이터를 더 효과적으로 분석할 수 있습니다."
    )

    pdf.section_title("지원 파일 형식")
    pdf.bullet(".csv")
    pdf.bullet(".xls")
    pdf.bullet(".xlsx")
    pdf.bullet(".xlsm")
    pdf.body_text(
        "업로드한 파일의 형식이 위 네 가지 중 하나일 경우, 자동으로 테이블 편집 화면으로 진입할 수 있는 아이콘이 표시됩니다."
    )
    pdf.info_box(
        "주의: .docx 등 엑셀 이외의 형식은 테이블 편집 화면이 표시되지 않습니다.", "warning"
    )

    pdf.section_title("테이블 데이터를 구조화된 데이터로 구성하기")
    pdf.body_text(
        "Table Agent 앱에서 테이블 형태의 구조화된 데이터를 사용하려면, 반드시 '테이블 편집' 기능으로 데이터를 재구성해야 합니다."
    )

    pdf.sub_section_title("편집 방법")
    pdf.numbered_item(
        1,
        "테이블 편집 아이콘 클릭: 테이블 범위, 헤더(열 이름), 데이터 타입 등을 설정할 수 있는 편집 화면으로 이동합니다.",
    )
    pdf.numbered_item(2, "설정 가능 항목:")
    pdf.bullet("테이블 범위: 데이터가 포함된 셀 영역 지정", indent=20)
    pdf.bullet("헤더(열 이름): 각 열의 이름 지정", indent=20)
    pdf.bullet("데이터 타입: 각 열의 값 형식(텍스트, 숫자, 날짜 등) 지정", indent=20)

    pdf.info_box(
        "주의: 테이블 편집 아이콘은 문서에 대한 편집 권한이 있는 멤버에게만 활성화됩니다.",
        "warning",
    )

    pdf.section_title("테이블 데이터 구성하기")
    pdf.body_text(
        "테이블 편집 화면은 왼쪽과 오른쪽 영역으로 나뉘어 있습니다."
    )

    pdf.sub_section_title("왼쪽 영역: 업로드 파일 미리보기")
    pdf.bullet("업로드한 엑셀 파일의 미리보기가 표시됩니다.")
    pdf.bullet("열과 행 정보를 함께 확인할 수 있습니다.")
    pdf.info_box(
        "주의: 행이나 열의 수가 많은 경우, 미리보기 표시가 제한될 수 있습니다. 이때 원본 파일을 바탕으로 테이블 데이터를 구성해 주세요.",
        "warning",
    )

    pdf.sub_section_title("오른쪽 영역: 테이블 데이터 편집")
    pdf.bullet("왼쪽 영역의 파일 정보를 기반으로 테이블 데이터를 직접 편집할 수 있습니다.")
    pdf.bullet("편집 가능한 항목: 테이블 범위 지정, 헤더 수정, 데이터 타입 설정")

    pdf.info_box(
        "주의: 현재는 첫 번째 시트의 1개의 테이블만 지원되므로, 1개의 테이블이 추가되면 +추가 버튼은 비활성화됩니다.",
        "warning",
    )

    pdf.section_title("테이블 구성 단계")
    pdf.numbered_item(
        1,
        "테이블 이름 지정: 데이터 용도에 맞는 테이블 이름을 입력합니다. (예: 직원 상세 정보, 직원 인사 정보)",
    )
    pdf.numbered_item(
        2,
        "테이블 범위 지정: 시트 내에서 데이터로 사용할 셀 범위를 지정합니다. (예: A1:N1001)",
    )
    pdf.numbered_item(
        3,
        "테이블 설명 입력: 테이블의 목적이나 데이터 구조를 간략히 설명합니다. (예: 2025년 입사자에 대한 연봉, 입퇴사일, 직군 정보)",
    )
    pdf.info_box(
        "이 설명은 모델 프롬프트에 직접 반영되므로 핵심 규칙만 간결하게 작성하세요. "
        "불필요하게 긴 문장이나 중복된 예시는 모델이 내용을 혼동할 수 있습니다.",
        "important",
    )

    pdf.section_title("헤더 설정")
    pdf.numbered_item(
        1,
        "헤더 셀 번호 입력: 헤더로 사용할 행 번호를 입력합니다. (예: 첫 번째 행이 헤더인 경우 A1)",
    )
    pdf.numbered_item(2, "헤더 이름 입력: 각 열(Column)에 사용할 헤더 이름을 입력합니다.")
    pdf.numbered_item(3, "데이터 타입 지정: 각 열에 들어갈 데이터의 유형을 선택합니다.")

    pdf.sub_section_title("데이터 타입별 설명")
    pdf.simple_table(
        ["타입", "설명", "예시"],
        [
            ["STRING (문자열)", "문자로 구성된 일반 텍스트 데이터", "직원명: 김수현, 사번: A-102"],
            [
                "NUMBER (숫자)",
                "정수 또는 실수형 숫자 데이터",
                "연봉: 120, 비율: 0.85",
            ],
            [
                "DATETIME (날짜/시간)",
                "날짜 또는 시간 정보를 포함하는 데이터",
                "입사일: 2025-10-16",
            ],
            [
                "BOOLEAN (불린)",
                "참/거짓(True/False) 형태의 데이터",
                "활성 여부: TRUE",
            ],
        ],
    )

    pdf.info_box(
        "주의: 타입을 DATETIME으로 지정하고 실제 값이 STRING인 경우 null값으로 저장되니 유의해 주세요.",
        "warning",
    )

    pdf.section_title("숨겨진 열(히든컬럼) 처리")
    pdf.body_text(
        "숨겨진 열이 포함된 상태로 업로드하면 해당 열은 미리보기 화면에서도 숨겨진 채로 표시되며, "
        "테이블 데이터로 변환할 때에도 자동으로 제외됩니다."
    )
    pdf.body_text(
        "숨겨진 열까지 포함하여 테이블 데이터를 구성하려면, 원본 파일을 참고하여 숨겨진 열의 헤더를 직접 입력해야 합니다."
    )

    pdf.section_title("병합셀 처리")
    pdf.body_text(
        "병합셀은 테이블 데이터로 변환 시 자동으로 해제되며, 원본 값이 병합 영역의 모든 셀에 복제됩니다."
    )
    pdf.info_box(
        '예: B2:C2가 병합되어 "부서"라는 값을 가진 경우 → B1 = "부서", C1 = "부서2" 등으로 입력합니다.\n'
        "셀네임은 고유의 값이므로 _2 등의 기호를 넣어두는 것을 추천합니다."
    )

    pdf.section_title("테이블 데이터로 실행")
    pdf.numbered_item(1, "모든 헤더 정보가 입력되면 저장 버튼을 클릭합니다.")
    pdf.numbered_item(2, "'테이블 데이터로 실행' 버튼을 클릭합니다.")
    pdf.body_text(
        "테이블 데이터로 저장에 성공하여 앱에서 활용할 수 있는 경우에는 초록색으로 표시됩니다. "
        "작성한 내용을 저장만 하고 테이블 데이터로 실행하지 않은 경우에는 주황색으로 표시됩니다."
    )

    pdf.section_title("앱 구성하기")
    pdf.numbered_item(1, "앱 편집 버튼을 클릭합니다.")
    pdf.numbered_item(
        2,
        "LLM 입력 노드에서 방금 구성한 엑셀 파일을 문서 범위 내에서 선택합니다.",
    )
    pdf.numbered_item(3, "앱을 공개합니다.")

    pdf.info_box(
        "주의사항:\n"
        "1. 변수는 반드시 시스템 변수인 EXCEL_DOCUMENTS로 지정해야 합니다.\n"
        "2. 권장 모델은 OPENAI GPT-4o입니다.\n"
        "3. 문서를 지정하지 않은 상태에서 앱을 공개하고 실행하면 참조할 테이블 데이터가 없기 때문에 오류가 발생합니다.",
        "important",
    )

    pdf.section_title("엑셀 파일 관리 시 주의점")
    pdf.bullet(
        "문서 업데이트 버튼은 테이블 데이터로 실행되지 않은 엑셀 파일에서만 활용 가능합니다. "
        "한번 테이블 데이터로 구성된 엑셀 파일은 업데이트 버튼이 비표시됩니다."
    )
    pdf.bullet(
        "모든 엑셀 파일에는 테이블 편집 아이콘이 표시됩니다. 하지만 실제 편집 화면에서 테이블로 구성하지 않으면 "
        "엑셀 파일은 마크다운(줄글) 형태로 파싱되어 기존처럼 문서 내 답변 소스로 자유롭게 활용됩니다."
    )
    pdf.bullet(
        "한 개의 문서를 테이블 데이터와 마크다운 두 방식 모두로 사용하고 싶다면, "
        "문서명을 다르게 해서 두 개를 업로드한 뒤 한쪽에서 테이블 데이터로 구성하세요."
    )

    output_path = r"c:\dev\hrd-workspace\Alli_Works_문서관리_가이드.pdf"
    pdf.output(output_path)
    print(f"PDF generated: {output_path}")


if __name__ == "__main__":
    build_pdf()
