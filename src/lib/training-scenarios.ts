export type AlliAppType = "interactive" | "agent" | "answer";

export type WorkflowStep = {
  step: number;
  title: string;
  where: string;
  action: string;
  detail: string;
  nodes?: string[];
  docRef?: string;
  sampleFile?: string;
  sampleLabel?: string;
};

export type FlowNode = {
  id: string;
  label: string;
  sub?: string;
  type: "start" | "message" | "answer" | "condition" | "member" | "input" | "llm" | "research" | "agent" | "end";
};

export type FlowEdge = {
  from: string;
  to: string;
  label?: string;
  style?: "normal" | "success" | "fail";
};

export type Flowchart = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type TrainingScenario = {
  scenario_key: string;
  title: string;
  department: string;
  pain_point: string;
  expected_outcome: string;
  alli_app_type: AlliAppType;
  alli_nodes: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  duration_minutes: number;
  ice_impact: number;
  ice_confidence: number;
  ice_ease: number;
  sort_order: number;
  prep_documents: string[];
  workflow_steps: WorkflowStep[];
  workflow_diagram: string[];
  flowchart?: Flowchart;
  eval_criteria: string[];
  reference_links: { label: string; url: string }[];
};

export const DEPARTMENTS = [
  { key: "WM", label: "WM (Wealth Management)", color: "bg-blue-500" },
  { key: "IB", label: "IB (Investment Banking)", color: "bg-purple-500" },
  { key: "S&T", label: "S&T (Sales & Trading)", color: "bg-orange-500" },
  { key: "경영지원", label: "경영지원 (Corporate)", color: "bg-teal-500" },
] as const;

export const APP_TYPE_META: Record<
  AlliAppType,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  interactive: {
    label: "대화형 앱",
    labelEn: "Interactive",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  agent: {
    label: "에이전트형 앱",
    labelEn: "Agent",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
  },
  answer: {
    label: "답변형 앱",
    labelEn: "Answer",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
};

export const DIFFICULTY_LABELS: Record<
  string,
  { label: string; color: string }
> = {
  beginner: { label: "초급", color: "bg-emerald-100 text-emerald-700" },
  intermediate: { label: "중급", color: "bg-amber-100 text-amber-700" },
  advanced: { label: "고급", color: "bg-red-100 text-red-700" },
};

export const TRAINING_SCENARIOS: TrainingScenario[] = [
  // ── WM ──
  {
    scenario_key: "wm-faq-chatbot",
    title: "고객 FAQ 자동 응대 챗봇",
    department: "WM",
    pain_point:
      "고객센터에 동일한 문의(수수료, 계좌, 상품 안내)가 반복되어 상담원 리소스가 낭비되고, 야간/주말 응대가 불가능합니다.",
    expected_outcome:
      "노무라증권 사례처럼 운영 인원 3명→1명, FAQ 답변 정확도 대폭 향상. 24/7 자동 응대로 고객 만족도 상승.",
    alli_app_type: "interactive",
    alli_nodes: [
      "메시지 보내기",
      "답변 생성",
      "Q&A에서 답변",
      "조건 추가",
      "담당 멤버 연결",
    ],
    difficulty: "intermediate",
    duration_minutes: 60,
    ice_impact: 9,
    ice_confidence: 10,
    ice_ease: 8,
    sort_order: 1,
    prep_documents: [
      "고객센터 FAQ CSV 파일 (50~100건)",
      "금융상품 설명서 PDF (ELS/DLS/펀드)",
      "수수료 안내서 PDF",
    ],
    workflow_diagram: [
      "시작",
      "메시지 보내기 (인사말)",
      "답변 생성 (상품/수수료 문서)",
      "Q&A에서 답변 (FAQ 매칭)",
      "조건 추가 (확신도 체크)",
      "담당 멤버 연결 (담당자 연결)",
    ],
    flowchart: {
      nodes: [
        { id: "start", label: "Start", type: "start" },
        { id: "n1", label: "메시지 보내기", sub: "안녕하세요, 하나증권 AI 상담입니다.", type: "message" },
        { id: "n2", label: "답변 생성", sub: "기본 모델: AZURE GPT-4o\n검색 소스: 문서 + Q&A\n변수 저장: @ANSWER", type: "answer" },
        { id: "n3", label: "조건 추가", sub: '@ANSWER contains\n"찾지 못했습니다"', type: "condition" },
        { id: "n4", label: "담당 멤버 연결", sub: "내부 메시지 발송 후\n담당 멤버와 채팅 연결", type: "member" },
        { id: "end", label: "답변 완료", sub: "정상 답변 전달", type: "end" },
      ],
      edges: [
        { from: "start", to: "n1" },
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4", label: '@ANSWER contains "찾지 못했습니다"', style: "fail" },
        { from: "n3", to: "end", label: "기타 (정상 답변)", style: "success" },
      ],
    },
    workflow_steps: [
      {
        step: 1,
        title: "Q&A 지식베이스에 FAQ 일괄 업로드",
        where: "Alli 대시보드 > 지식베이스 > Q&A > 일괄 업로드",
        action: "고객센터 FAQ를 CSV로 정리하여 일괄 등록",
        detail:
          'CSV 형식: "질문","답변" 열로 구성. 50~100건의 자주 묻는 질문(수수료, 계좌개설, 상품안내 등)을 등록합니다. 등록 후 카테고리별 해시태그(#수수료, #계좌, #상품)를 부여합니다.\n\n[샘플 CSV 미리보기]\n질문,답변\n"주식 매매 수수료는 얼마인가요?","온라인 거래 시 0.015%, 오프라인(영업점) 거래 시 0.1%입니다."\n"계좌 개설은 어떻게 하나요?","모바일 앱에서 비대면 개설이 가능합니다. 신분증을 준비하시고..."',
        docRef:
          "https://guide.allganize.ai/alli/%EC%97%85%EB%A1%9C%EB%93%9C%ED%95%9C-%EB%AC%B8%EC%84%9C%EC%97%90%EC%84%9C-%EC%A7%81%EC%A0%91-%EB%8B%B5%EB%B3%80-%EC%B0%BE%EA%B8%B0-qa-%EB%85%B8%EB%93%9C/?lang=ko",
        sampleFile: "/samples/faq-sample.csv",
        sampleLabel: "FAQ CSV 샘플 다운로드 (30건)",
      },
      {
        step: 2,
        title: "공용 문서함에 상품/수수료 문서 업로드",
        where: "Alli 대시보드 > 지식베이스 > 문서 > 폴더 생성 + 업로드",
        action:
          "폴더 구조(고객지원/상품설명서, 고객지원/수수료)를 만들고 PDF 업로드",
        detail:
          "폴더 구조:\n├── 고객지원/\n│   ├── 상품설명서/ (ELS안내.pdf, DLS안내.pdf, 펀드안내.pdf)\n│   └── 수수료/ (수수료안내서.pdf, 해외거래수수료.pdf)\n\n해시태그 부여:\n- #ELS, #DLS, #펀드, #수수료, #해외주식\n\n접근 권한: WM 부서 전체 (또는 전 직원)\n\n업로드 지원 형식: .pdf, .docx, .txt, .csv, .xlsx, .pptx\n\n※ 폴더명과 해시태그를 체계적으로 정리하면 답변 생성 노드에서 검색 범위를 정확하게 지정할 수 있습니다.",
        docRef:
          "https://guide.allganize.ai/alli/%EB%8B%B5%EB%B3%80-%EC%83%9D%EC%84%B1-%EB%85%B8%EB%93%9C/?lang=ko",
        sampleFile: "/samples/product-description-sample.txt",
        sampleLabel: "금융상품 설명서 샘플 다운로드",
      },
      {
        step: 3,
        title: "대화형 앱 생성 및 시작 노드 설정",
        where: "Alli 대시보드 > 앱 관리 > + 새 앱 만들기 > 대화형 앱",
        action: '"고객 FAQ 챗봇" 앱 생성 후 시작 노드 구성',
        detail:
          '■ 메시지 보내기 노드 설정 상세 (ID: 1)\n\n1. 앱 이름: "고객 FAQ 챗봇"\n   설명: "고객센터 FAQ 및 상품/수수료 문의에 자동 응대하는 챗봇"\n\n2. 시작 노드에서 연결선을 드래그하여 "메시지 보내기" 노드 추가\n\n3. 메시지 내용:\n   "안녕하세요, 하나증권 AI 상담입니다. 무엇을 도와드릴까요?"\n\n4. 설정값:\n   - 메시지 유형: 텍스트\n   - 다음 노드로 자동 진행: 예\n   - 눈 아이콘(👁): 활성화 (노드 실행 시 사용자에게 표시)\n\n※ 이 노드가 사용자 최초 접속 시 표시되는 환영 메시지입니다.',
        nodes: ["메시지 보내기"],
        docRef:
          "https://guide.allganize.ai/alli/%EB%A9%94%EC%8B%9C%EC%A7%80-%EB%B3%B4%EB%82%B4%EA%B8%B0-%EC%A7%88%EB%AC%B8%ED%95%98%EA%B8%B0-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 4,
        title: "답변 생성 노드 추가 (문서 기반 답변)",
        where: "플로우 빌더 > 메시지 보내기 다음에 노드 추가",
        action:
          "답변 생성 노드를 추가하고 검색 소스로 문서 + Q&A를 설정",
        detail:
          '■ 답변 생성 노드 설정 상세 (ID: 2)\n\n1. 질문 입력 방식: ● 멤버 입력\n   - 사용자가 직접 질문을 입력하는 방식\n   - ☑ 노드 진입 시 항상 메시지 출력: 체크\n\n2. 기본 모델: AZURE GPT-4o (드롭다운에서 선택)\n\n3. 에이전트: 기본 RAG (기본)\n   - "편집" 클릭 시 시스템 프롬프트 커스터마이징 가능\n   - 권장 프롬프트: "하나증권 고객 상담 전문가로서 정확한 답변을 제공합니다. 불확실한 정보는 반드시 확인 필요하다고 안내합니다."\n\n4. 검색 소스:\n   ☑ Q&A: 체크 → 등록된 FAQ에서 직접 매칭\n   ☑ 문서: 체크 → "고객지원" 폴더 지정 (상품설명서, 수수료 안내서)\n   □ 인터넷: 미체크 (내부 문서만 활용)\n\n5. 답변을 아래 변수로 저장: @ANSWER\n   - 다음 조건 추가 노드에서 이 변수를 참조\n\n6. 답변 생성 후: ● 다음 노드로 진행\n   - "다시 질문하기" 선택 시 반복 대화 루프 가능',
        nodes: ["답변 생성"],
        docRef:
          "https://guide.allganize.ai/alli/%EB%8B%B5%EB%B3%80-%EC%83%9D%EC%84%B1-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 5,
        title: "조건 분기 추가 (확신도 낮으면 담당자 연결)",
        where: "플로우 빌더 > 답변 생성 다음에 노드 추가",
        action:
          "조건 추가 노드 + 담당 멤버 연결 노드로 에스컬레이션 구성",
        detail:
          '■ 조건 추가 노드 설정 상세 (ID: 3)\n\n1. 옵션 1 (조건 설정):\n   변수: @ANSWER\n   연산자: contains\n   값: "찾지 못했습니다"\n   → 참이면: "담당 멤버 연결" 노드로 이동\n\n2. + 옵션 추가 (선택사항):\n   @ANSWER contains "확인이 필요합니다" 등 추가 실패 패턴\n\n3. 기타 (else 분기):\n   → 정상 답변 → 종료 또는 재질문 루프\n\n■ 담당 멤버 연결 노드 설정 상세 (ID: 4)\n\n1. 연결 방식: "내부 메시지 발송 후 담당 멤버와 채팅 연결"\n2. 담당 멤버/팀: WM 고객지원팀 선택\n3. 연결 실패 시 메시지: "담당자 연결 중입니다. 잠시만 기다려주세요."\n4. 이메일 알림 발송: 활성화\n5. 대화 내역 전달: 활성화 (이전 대화 컨텍스트 전달)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 담당자(수신자) 측에서 해야 할 일\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n[알림 수신 방법]\n• Alli 대시보드 접속 상태라면 브라우저 알림이 즉시 뜸\n• 설정에서 이메일 알림을 켜두면 이메일로도 동시 수신\n• 알림 내용에 "이전 대화 내역 요약"이 함께 전달되어\n  고객이 무엇을 물었는지 사전에 파악 가능\n\n[담당자 접속 및 수락 방법]\n1. Alli 대시보드 (app.allganize.ai) 웹 브라우저로 접속\n2. 좌측 메뉴 → [대화] 클릭\n3. [대기 중] 탭에서 해당 고객 대화 확인\n4. 대화 클릭 → [수락] 버튼 클릭\n5. AI와 나눈 이전 대화 전체를 보면서 고객과 실시간 채팅\n\n[업무 시간 외 처리]\n• 담당자가 일정 시간(예: 3분) 내 수락 안 하면\n  "연결 실패 시 메시지"가 자동 발송됨\n• 예: "현재 업무시간(평일 09:00~18:00)이 아닙니다.\n     내일 운영 시간에 다시 문의해 주시거나\n     고객센터(1588-XXXX)로 연락 바랍니다."\n\n※ 담당자는 별도 앱 설치 없이 웹 브라우저만으로 수락 가능',
        nodes: ["조건 추가", "담당 멤버 연결"],
        docRef:
          "https://guide.allganize.ai/alli/%EC%A1%B0%EA%B1%B4-%EC%B6%94%EA%B0%80-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 6,
        title: "테스트 및 피드백 학습",
        where: "앱 미리보기 + Alli Works 피드백 기능",
        action:
          "복합 질의 테스트 후, 부정확한 답변에 피드백을 남겨 학습 반영 확인",
        detail:
          '"청약 펀드 환매 수수료는?", "ISA 계좌에서 해외 ETF 매수 가능한가요?" 등 실제 고객 질의를 테스트합니다. 오답에 👎 피드백 → 올바른 정보 입력 → 재질의로 개선 확인.',
      },
    ],
    eval_criteria: [
      "Q&A 일괄 업로드 및 해시태그 분류 완료",
      "대화형 앱 노드 플로우 5개 노드 연결 완료",
      "복합 질의 3건 이상 정확 응답",
      "조건 분기 → 담당자 연결 동작 확인",
      "피드백 학습 1건 이상 반영 확인",
    ],
    reference_links: [
      {
        label: "대화형 앱 빌더 개요",
        url: "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/conversation-app",
      },
      {
        label: "답변 생성 노드",
        url: "https://guide.allganize.ai/alli/%EB%8B%B5%EB%B3%80-%EC%83%9D%EC%84%B1-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        label: "Q&A에서 답변 노드",
        url: "https://guide.allganize.ai/alli/%EC%97%85%EB%A1%9C%EB%93%9C%ED%95%9C-%EB%AC%B8%EC%84%9C%EC%97%90%EC%84%9C-%EC%A7%81%EC%A0%91-%EB%8B%B5%EB%B3%80-%EC%B0%BE%EA%B8%B0-qa-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        label: "조건 분기 노드",
        url: "https://guide.allganize.ai/alli/%EC%A1%B0%EA%B1%B4-%EC%B6%94%EA%B0%80-%EB%85%B8%EB%93%9C/?lang=ko",
      },
    ],
  },
  {
    scenario_key: "wm-advisor-agent",
    title: "WM 상담 지원 에이전트",
    department: "WM",
    pain_point:
      "고객 투자 성향별 상품 비교, 약관/수수료 조회에 시간이 많이 소요되고, 상담원 역량 편차로 상담 품질이 일정하지 않습니다.",
    expected_outcome:
      "한화생명 사례처럼 상담 퀄리티 상향 평준화. 고객별 맞춤 정보를 즉시 제공하여 상담 시간 단축.",
    alli_app_type: "agent",
    alli_nodes: ["에이전트 인스트럭션", "MCP 도구 (문서검색)", "사용자 변수"],
    difficulty: "intermediate",
    duration_minutes: 60,
    ice_impact: 9,
    ice_confidence: 9,
    ice_ease: 8,
    sort_order: 2,
    prep_documents: [
      "금융상품 약관 PDF 3건 (ELS/DLS/펀드)",
      "투자설명서 PDF",
      "리스크 프로파일 문서",
    ],
    workflow_diagram: [
      "에이전트 생성",
      "인스트럭션 작성",
      "MCP 도구 추가 (문서검색/웹검색)",
      "변수 설정 ({customer_risk_profile})",
      "미리보기 테스트",
      "버전 관리 → 공개",
    ],
    workflow_steps: [
      {
        step: 1,
        title: "문서 업로드 및 해시태그 분류",
        where: "Alli 대시보드 > 지식베이스 > 문서",
        action:
          "금융상품 약관, 투자설명서를 업로드하고 해시태그로 분류",
        detail:
          "#주식형, #채권형, #ELS, #DLS, #펀드 해시태그를 부여합니다. 이 해시태그는 에이전트가 문서 검색 범위를 좁히는 데 활용됩니다.",
        docRef:
          "https://guide.allganize.ai/alli/%EB%8B%B5%EB%B3%80-%EC%83%9D%EC%84%B1-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 2,
        title: "에이전트형 앱 생성",
        where: "Alli 대시보드 > 앱 관리 > + 새 앱 만들기 > 에이전트 만들기",
        action:
          '"WM 상담 도우미" 에이전트 생성, 앱 정보(이름/아이콘/설명) 입력',
        detail:
          '앱 이름: "WM 상담 도우미", 설명: "고객 투자 성향에 맞는 금융상품을 분석하고 비교합니다"',
        docRef:
          "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/agent-app",
      },
      {
        step: 3,
        title: "LLM 모델 선택 및 인스트럭션 작성",
        where: "에이전트 편집 > 모델/인스트럭션 탭",
        action:
          "LLM 모델 선택, 인스트럭션(시스템 프롬프트) 작성, 사용자 변수 정의",
        detail:
          '인스트럭션 예시: "하나증권 WM 상담 전문가로서 고객 투자 성향({customer_risk_profile})에 맞는 상품을 분석합니다. 수익률/리스크/수수료를 비교표로 정리합니다." {customer_risk_profile}을 사용자 입력 변수로 설정합니다.',
        nodes: ["에이전트 인스트럭션"],
      },
      {
        step: 4,
        title: "MCP 도구 추가",
        where: "에이전트 편집 > 도구 탭",
        action:
          "문서 검색 도구, 웹 검색 도구를 MCP 서버에서 선택하여 추가",
        detail:
          "Alli MCP Hub에서 사전 연동된 도구를 선택합니다. 문서 검색 도구는 업로드한 금융상품 문서를 검색하고, 웹 검색은 최신 시장 정보를 가져옵니다. 각 도구의 인증/argument를 설정합니다.",
        nodes: ["MCP 도구"],
        docRef:
          "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/agent-app",
      },
      {
        step: 5,
        title: "미리보기 테스트 및 버전 관리",
        where: "에이전트 편집 > 미리보기 / 버전 관리",
        action:
          "실제 질의로 테스트 후 v1 저장 → 개선 → v2 → 공개",
        detail:
          '테스트 질의: "안정형 고객에게 적합한 ELS 상품은?", "최근 6개월 성과 기준 채권형 펀드 비교". 결과 검토 후 인스트럭션을 수정하여 v2를 저장합니다. 만족하면 "공개하기"로 앱을 배포합니다.',
      },
    ],
    eval_criteria: [
      "에이전트형 앱 생성 및 인스트럭션 완성",
      "MCP 도구 1개 이상 연동 성공",
      "사용자 변수 활용한 맞춤 응답 확인",
      "버전 관리(v1→v2) 활용",
    ],
    reference_links: [
      {
        label: "에이전트형 앱 만들기",
        url: "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/agent-app",
      },
      {
        label: "MCP 노드 가이드",
        url: "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/agent-app",
      },
    ],
  },
  // ── IB ──
  {
    scenario_key: "ib-deep-research",
    title: "딜 리서치 자동화 (딥 리서치)",
    department: "IB",
    pain_point:
      "M&A/IPO 딜 검토 시 산업 리서치, 유사 거래 사례 조사에 수일이 소요됩니다. 다수의 보고서와 웹 자료를 교차 분석해야 합니다.",
    expected_outcome:
      "수 시간~수 일의 리서치를 10~30분으로 단축. 출처가 명시된 심층 연구 보고서를 자동 생성합니다.",
    alli_app_type: "interactive",
    alli_nodes: ["메시지 보내기", "딥 리서치"],
    difficulty: "intermediate",
    duration_minutes: 60,
    ice_impact: 9,
    ice_confidence: 8,
    ice_ease: 8,
    sort_order: 3,
    prep_documents: [
      "산업분석 보고서 PDF 3건",
      "종목분석 보고서 PDF 2건",
      "유사 딜 사례 문서",
    ],
    workflow_diagram: [
      "시작",
      "메시지 보내기 (리서치 주제 안내)",
      "딥 리서치 (문서+인터넷 소스) [터미널]",
    ],
    flowchart: {
      nodes: [
        { id: "start", label: "Start", type: "start" },
        { id: "n1", label: "메시지 보내기", sub: "분석할 산업/주제를\n입력하세요", type: "message" },
        { id: "n2", label: "딥 리서치", sub: "문서 + 인터넷 + 업로드\n[터미널 노드]", type: "research" },
      ],
      edges: [
        { from: "start", to: "n1" },
        { from: "n1", to: "n2" },
      ],
    },
    workflow_steps: [
      {
        step: 1,
        title: "개인 문서함에 리서치 자료 업로드",
        where: "Alli Works > 개인 문서함 > 폴더 생성 + 업로드",
        action:
          "리서치/반도체, 리서치/2차전지 등 폴더를 만들고 보고서 PDF 업로드",
        detail:
          "개인 문서함은 본인만 접근 가능합니다. 산업분석/종목분석 보고서 3~5건을 주제별 폴더에 분류하여 업로드합니다.",
        sampleFile: "/samples/research-report-sample.txt",
        sampleLabel: "리서치 보고서 샘플 다운로드",
      },
      {
        step: 2,
        title: "대화형 앱 생성 및 메시지 보내기 노드",
        where: "Alli 대시보드 > 앱 관리 > 대화형 앱 생성",
        action:
          '"딜 리서치 분석기" 앱 생성 후 메시지 보내기 노드 추가',
        detail:
          '메시지 보내기 노드에서 "분석할 산업/주제를 입력하세요"라는 안내와 함께 Ask Question 옵션(텍스트 입력)을 활성화하여 사용자 입력을 변수에 저장합니다.',
        nodes: ["메시지 보내기"],
        docRef:
          "https://guide.allganize.ai/alli/%EB%A9%94%EC%8B%9C%EC%A7%80-%EB%B3%B4%EB%82%B4%EA%B8%B0-%EC%A7%88%EB%AC%B8%ED%95%98%EA%B8%B0-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 3,
        title: "딥 리서치 노드 추가 및 소스 설정",
        where: "플로우 빌더 > 메시지 보내기 다음에 딥 리서치 노드",
        action:
          "딥 리서치 노드를 터미널(마지막) 노드로 추가하고 검색 소스 설정",
        detail:
          '질문 소스: 이전 단계의 사용자 입력 변수. 검색 소스 3가지를 설정합니다: (1) 문서 - 업로드된 리서치 폴더 지정 (2) 인터넷 - 신뢰 URL 지정(금감원 dart.fss.or.kr, KRX krx.co.kr) (3) 업로드 파일 - 사용자가 추가 파일 첨부 가능. 주의: 딥 리서치는 반드시 마지막 노드여야 합니다.',
        nodes: ["딥 리서치"],
        docRef:
          "https://docs.allganize.ai/allganize-alli-works/alli-works/intorduce/deep-research",
      },
      {
        step: 4,
        title: "딥 리서치 실행 테스트",
        where: "앱 미리보기 또는 Alli Works에서 실행",
        action:
          "산업 분석 질의를 입력하고 비동기 실행 과정을 모니터링",
        detail:
          '입력: "2026년 하반기 반도체 산업 전망과 주요 기업별 투자 포인트 분석". AI가 조사 단계를 제안하고 추가 질문을 확인한 뒤, 10~30분간 비동기로 실행됩니다. 완료 후 출처가 포함된 연구 보고서가 생성됩니다.',
      },
      {
        step: 5,
        title: "검색 범위 재설정 및 교차 분석",
        where: "Alli Works > 검색 범위 아이콘",
        action:
          "특정 폴더/URL로 범위를 좁혀 교차 분석 보고서 생성",
        detail:
          '"삼성전자 vs SK하이닉스 영업이익 전망 비교 보고서 작성해줘"를 입력합니다. 출처 문서 썸네일로 원본 확인이 가능하며, 다운로드하여 검증합니다.',
      },
    ],
    eval_criteria: [
      "딥 리서치 앱 생성 및 검색 소스 3종 설정",
      "딥 리서치 노드가 터미널 노드로 올바르게 배치",
      "연구 보고서 자동 생성 성공",
      "출처 추적 및 원본 확인",
    ],
    reference_links: [
      {
        label: "딥 리서치 노드 가이드",
        url: "https://docs.allganize.ai/allganize-alli-works/alli-works/intorduce/deep-research",
      },
      {
        label: "대화형 앱 빌더",
        url: "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/conversation-app",
      },
    ],
  },
  {
    scenario_key: "ib-pitch-book",
    title: "투자제안서(Pitch Book) 초안 생성",
    department: "IB",
    pain_point:
      "Pitch Book 작성 시 매번 유사한 구조(산업 개요, 거래 사례, 밸류에이션)를 반복 작성합니다. 초안 작성에 상당 시간이 소요됩니다.",
    expected_outcome:
      "템플릿 기반 초안 자동 생성으로 작성 시간 70% 단축. 일관된 품질의 산출물 확보.",
    alli_app_type: "answer",
    alli_nodes: ["답변형 앱 설정 (입력/프롬프트/출력)"],
    difficulty: "beginner",
    duration_minutes: 45,
    ice_impact: 8,
    ice_confidence: 7,
    ice_ease: 9,
    sort_order: 4,
    prep_documents: [
      "기존 Pitch Book 샘플 PDF 2건",
      "산업 리서치 보고서 PDF",
    ],
    workflow_diagram: [
      "답변형 앱 생성",
      "입력 설정 (문서 + 텍스트 + 선택)",
      "시스템/사용자 프롬프트 작성",
      "출력 형식 설정 (Markdown)",
      "테스트 → 공개",
    ],
    workflow_steps: [
      {
        step: 1,
        title: "답변형 앱 생성",
        where: "Alli 대시보드 > 앱 관리 > + 새 앱 만들기 > 답변형 앱",
        action: '"Pitch Book 초안 생성기" 앱 생성',
        detail:
          "답변형 앱은 단일 입력 → 단일 출력 구조입니다. 앱 이름/설명을 입력합니다.",
        docRef:
          "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/singleacrtion-app",
        sampleFile: "/samples/pitch-book-template.md",
        sampleLabel: "Pitch Book 템플릿 샘플 다운로드",
      },
      {
        step: 2,
        title: "입력 설정 구성",
        where: "답변형 앱 편집 > 입력 설정",
        action:
          "3가지 입력 항목을 추가: 문서 첨부, 텍스트, 단일 선택",
        detail:
          '(1) "참고 문서" - Document 타입, 지식베이스 문서 첨부 가능 (2) "대상 기업/산업" - Paragraph text 타입 (3) "제안서 유형" - Single select 타입, 옵션: M&A, IPO, 유상증자, 회사채 발행. 최대 6개 입력 항목까지 추가 가능합니다.',
        nodes: ["답변형 앱 설정 (입력/프롬프트/출력)"],
      },
      {
        step: 3,
        title: "시스템/사용자 프롬프트 작성",
        where: "답변형 앱 편집 > 프롬프트 설정",
        action:
          "LLM 모델 선택 후 System/User 프롬프트를 작성",
        detail:
          'System: "당신은 하나증권 IB본부의 투자제안서 작성 전문가입니다. 첨부된 참고 문서와 입력 정보를 기반으로 Pitch Book 초안을 구조화하여 작성합니다." User: "다음 정보로 {제안서_유형} Pitch Book 초안을 작성해주세요:\\n대상: {대상기업}\\n참고자료: {참고문서}\\n\\n구조: 1)Executive Summary 2)산업 개요 3)거래 사례 4)밸류에이션 5)리스크 요인". Markdown 출력을 활성화합니다.',
      },
      {
        step: 4,
        title: "테스트 및 공개",
        where: "답변형 앱 편집 > 테스트 / 공개",
        action:
          "샘플 입력으로 테스트 후 공개",
        detail:
          "기존 Pitch Book 샘플을 참고 문서로 첨부하고 테스트합니다. 출력 품질을 확인하고 프롬프트를 조정한 뒤 공개합니다.",
      },
    ],
    eval_criteria: [
      "답변형 앱 생성 및 입력 3종 설정 완료",
      "System/User 프롬프트 작성 완료",
      "Pitch Book 초안 생성 테스트 성공",
      "Markdown 출력 형식 정상 동작",
    ],
    reference_links: [
      {
        label: "답변형 앱 만들기",
        url: "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/singleacrtion-app",
      },
    ],
  },
  // ── S&T ──
  {
    scenario_key: "st-research-summary",
    title: "리서치 보고서 요약/분석 앱",
    department: "S&T",
    pain_point:
      "매일 수십 건의 리서치 보고서가 배포되지만 전부 읽을 시간이 없습니다. 핵심 포인트만 빠르게 파악하고 싶습니다.",
    expected_outcome:
      "보고서 업로드 즉시 핵심 요약 + 투자 포인트가 자동 생성됩니다. 교차 분석 질의도 가능.",
    alli_app_type: "interactive",
    alli_nodes: ["LLM 인풋", "LLM 노드", "메시지 보내기"],
    difficulty: "beginner",
    duration_minutes: 45,
    ice_impact: 8,
    ice_confidence: 9,
    ice_ease: 9,
    sort_order: 5,
    prep_documents: [
      "산업분석 보고서 PDF 3건",
      "종목분석 보고서 PDF 2건",
    ],
    workflow_diagram: [
      "시작",
      "LLM 인풋 (문서 선택/업로드)",
      "LLM 노드 (요약 프롬프트)",
      "메시지 보내기 (결과 출력)",
    ],
    flowchart: {
      nodes: [
        { id: "start", label: "Start", type: "start" },
        { id: "n1", label: "LLM 인풋", sub: "문서 선택 또는\n업로드", type: "llm" },
        { id: "n2", label: "LLM 노드", sub: "요약 프롬프트\n단일 프롬프트 모드", type: "llm" },
        { id: "n3", label: "메시지 보내기", sub: "요약 결과 출력", type: "message" },
      ],
      edges: [
        { from: "start", to: "n1" },
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
      ],
    },
    workflow_steps: [
      {
        step: 1,
        title: "문서 업로드",
        where: "Alli 대시보드 > 지식베이스 > 문서",
        action:
          "리서치 보고서 PDF를 리서치/산업분석, 리서치/종목분석 폴더로 업로드",
        detail:
          "해시태그: #반도체, #2차전지, #바이오 등 섹터별로 분류합니다.",
        sampleFile: "/samples/research-report-sample.txt",
        sampleLabel: "리서치 보고서 샘플 다운로드",
      },
      {
        step: 2,
        title: "대화형 앱 생성 및 LLM 인풋 노드",
        where: "Alli 대시보드 > 앱 관리 > 대화형 앱 생성",
        action:
          '"리서치 요약기" 앱을 생성하고 LLM 인풋 노드 추가',
        detail:
          'LLM 인풋 노드의 소스 타입을 "문서(Document)"로 설정합니다. 범위를 리서치 폴더로 지정하고, 사용자 검색을 활성화하여 원하는 보고서를 선택할 수 있게 합니다. 또는 "업로드(Upload)" 소스로 설정하여 사용자가 직접 파일을 첨부하도록 합니다.',
        nodes: ["LLM 인풋"],
        docRef:
          "https://guide.allganize.ai/alli/llm-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 3,
        title: "LLM 노드 추가 (요약 프롬프트)",
        where: "플로우 빌더 > LLM 인풋 다음에 LLM 노드",
        action:
          'LLM 노드를 "단일 프롬프트" 모드로 설정하고 요약 프롬프트 작성',
        detail:
          '실행 유형: "단일 프롬프트". 프롬프트: "다음 리서치 보고서를 분석하여 (1)핵심 투자 포인트 3가지 (2)목표가 및 근거 (3)리스크 요인을 정리해줘:\\n{@LLM_INPUT_RESULT}". 결과를 변수에 저장하고 "사용자에게 답변" 옵션을 활성화합니다.',
        nodes: ["LLM 노드"],
        docRef:
          "https://guide.allganize.ai/alli/llm-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 4,
        title: "테스트 (다양한 보고서로 검증)",
        where: "앱 미리보기",
        action:
          "산업분석/종목분석 보고서 각 1건으로 요약 품질 테스트",
        detail:
          "요약 결과의 정확성, 핵심 포인트 추출 여부, 수치 정확도를 검증합니다. 프롬프트를 반복 조정하여 품질을 높입니다.",
      },
    ],
    eval_criteria: [
      "LLM 인풋 → LLM 노드 → 메시지 보내기 플로우 완성",
      "보고서 요약 결과에 핵심 포인트 3가지 포함",
      "원본 문서 대비 수치 정확도 확인",
      "2건 이상 보고서 테스트 완료",
    ],
    reference_links: [
      {
        label: "LLM 인풋 노드",
        url: "https://guide.allganize.ai/alli/llm-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        label: "LLM 노드",
        url: "https://guide.allganize.ai/alli/llm-%EB%85%B8%EB%93%9C/?lang=ko",
      },
    ],
  },
  {
    scenario_key: "st-trading-sop",
    title: "트레이딩 데스크 SOP 검색 에이전트",
    department: "S&T",
    pain_point:
      "주문체결, 정산, 리스크 관리 규정에 대한 반복 문의가 많습니다. 규정 변경 시 최신 정보 반영이 늦습니다.",
    expected_outcome:
      "에이전트가 최신 SOP 문서를 실시간 검색하여 정확한 절차를 안내합니다. 반복 문의 절감.",
    alli_app_type: "agent",
    alli_nodes: ["에이전트 인스트럭션", "문서 검색 도구"],
    difficulty: "beginner",
    duration_minutes: 45,
    ice_impact: 7,
    ice_confidence: 9,
    ice_ease: 9,
    sort_order: 6,
    prep_documents: [
      "주문체결 프로세스 매뉴얼 PDF",
      "정산 업무 SOP 문서",
      "리스크 관리 규정 PDF",
    ],
    workflow_diagram: [
      "에이전트 생성",
      "인스트럭션 작성 (S&T 전문가 역할)",
      "도구 추가 (문서 검색)",
      "대화 시나리오 설정",
      "테스트 → 공개",
    ],
    workflow_steps: [
      {
        step: 1,
        title: "SOP 문서 업로드 및 폴더 구조화",
        where: "Alli 대시보드 > 지식베이스 > 문서",
        action:
          "SOP/주문체결, SOP/정산, SOP/리스크 폴더 생성 후 문서 업로드",
        detail:
          "부서별 접근 권한을 설정하여 S&T 부서원만 해당 폴더에 접근하도록 합니다. 해시태그: #주문, #정산, #리스크, #마진.",
        sampleFile: "/samples/sop-manual-sample.txt",
        sampleLabel: "SOP 매뉴얼 샘플 다운로드",
      },
      {
        step: 2,
        title: "에이전트형 앱 생성 및 인스트럭션",
        where: "Alli 대시보드 > 앱 관리 > 에이전트 만들기",
        action:
          '"S&T SOP 가이드" 에이전트 생성, 인스트럭션 작성',
        detail:
          '인스트럭션: "하나증권 S&T 부서의 업무 매뉴얼 기반으로 주문체결, 정산, 리스크 관리 절차를 단계별로 안내합니다. 규정이나 제한사항이 있으면 반드시 명시합니다. 문서에 없는 내용은 확인 불가하다고 안내합니다."',
        docRef:
          "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/agent-app",
      },
      {
        step: 3,
        title: "문서 검색 도구 추가 및 대화 시나리오",
        where: "에이전트 편집 > 도구 / 대화 시나리오 탭",
        action:
          "문서 검색 MCP 도구 추가, 시작/실패 메시지 커스터마이징",
        detail:
          '시작 메시지: "S&T 업무 규정에 대해 궁금한 점을 물어보세요. 주문, 정산, 리스크 관련 절차를 안내합니다." 실패 메시지: "해당 내용은 매뉴얼에서 확인되지 않습니다. 팀 리더에게 문의해주세요."',
      },
      {
        step: 4,
        title: "테스트 및 공개",
        where: "에이전트 미리보기 → 공개",
        action:
          "실무 질의로 테스트 후 S&T 부서에 공개",
        detail:
          '"해외주식 매수 시 환전 절차는?", "대량매매 신고 기준은?", "장외거래 정산 프로세스는?" 등 실제 질의로 테스트합니다. 접근 권한을 S&T 부서로 제한하고 공개합니다.',
      },
    ],
    eval_criteria: [
      "에이전트 생성 및 인스트럭션 완성",
      "문서 검색 도구 연동",
      "SOP 질의 3건 정확 응답",
      "접근 권한 제한 설정 + 앱 공개",
    ],
    reference_links: [
      {
        label: "에이전트형 앱 가이드",
        url: "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/agent-app",
      },
    ],
  },
  // ── 경영지원 ──
  {
    scenario_key: "corp-compliance",
    title: "컴플라이언스 규정 점검 앱",
    department: "경영지원",
    pain_point:
      "거래별 규정 위반 여부 확인에 전문성과 시간이 필요합니다. 자본시장법, 내부통제 기준을 매번 수동으로 검색해야 합니다.",
    expected_outcome:
      "거래 정보를 입력하면 관련 규정을 자동 검색하고 위반 가능성을 분석합니다. 가드레일로 민감 정보 노출을 방지합니다.",
    alli_app_type: "interactive",
    alli_nodes: [
      "입력 폼 보내기",
      "답변 생성",
      "LLM 노드",
      "조건 추가",
      "담당 멤버 연결",
      "메시지 보내기",
    ],
    difficulty: "advanced",
    duration_minutes: 75,
    ice_impact: 9,
    ice_confidence: 8,
    ice_ease: 6,
    sort_order: 7,
    prep_documents: [
      "자본시장법 주요 조항 PDF",
      "사내 내부통제 기준 문서",
      "금융투자업 규정 PDF",
      "가상 거래 시나리오 5건 (샘플 CSV 제공)",
    ],
    workflow_diagram: [
      "시작",
      "입력 폼 보내기 (거래유형/금액/당사자)",
      "답변 생성 (규정 문서 검색)",
      "LLM 노드 (위반 가능성 분석)",
      "조건 추가 (위반 여부 분기)",
      "담당 멤버 연결 (준법감시 담당자)",
      "메시지 보내기 (참고용 고지)",
    ],
    flowchart: {
      nodes: [
        { id: "start", label: "Start", type: "start" },
        { id: "n1", label: "입력 폼 보내기", sub: "거래유형/금액\n관련당사자/설명", type: "input" },
        { id: "n2", label: "답변 생성", sub: "규정 폴더 문서 검색\n변수 저장: @규정검색결과", type: "answer" },
        { id: "n3", label: "LLM 노드", sub: "위반 가능성 분석\n변수 저장: @분석결과", type: "llm" },
        { id: "n4", label: "조건 추가", sub: '@분석결과 contains\n"위반가능성: 높음"', type: "condition" },
        { id: "n5", label: "담당 멤버 연결", sub: "준법감시 담당자\n에스컬레이션", type: "member" },
        { id: "n6", label: "메시지 보내기", sub: "본 분석은 참고용입니다", type: "message" },
      ],
      edges: [
        { from: "start", to: "n1" },
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" },
        { from: "n4", to: "n5", label: "위반가능성: 높음", style: "fail" },
        { from: "n4", to: "n6", label: "기타", style: "success" },
      ],
    },
    workflow_steps: [
      {
        step: 1,
        title: "규정 문서 업로드 및 해시태그",
        where: "Alli 대시보드 > 지식베이스 > 문서",
        action:
          "규정/자본시장법, 규정/내부통제, 규정/금융투자업규정 폴더로 분류 업로드",
        detail:
          "해시태그: #불공정거래, #자금세탁, #정보장벽, #이해충돌. 접근 권한: 준법감시부/경영지원부만 편집 가능.",
        sampleFile: "/samples/compliance-test-cases.csv",
        sampleLabel: "컴플라이언스 가상 거래 시나리오 CSV 다운로드",
      },
      {
        step: 2,
        title: "대화형 앱 생성 및 입력 폼 노드",
        where: "Alli 대시보드 > 앱 관리 > 대화형 앱 생성",
        action:
          '"컴플라이언스 체크" 앱 생성 후 입력 폼 보내기 노드 추가',
        detail:
          '입력 폼 필드: (1) 거래 유형 - 선택형 (주식매매/채권/파생/외환) (2) 거래 금액 - 텍스트 (3) 관련 당사자 - 텍스트 (4) 거래 설명 - 텍스트. 각 입력값을 변수에 저장합니다.',
        nodes: ["입력 폼 보내기"],
        docRef:
          "https://guide.allganize.ai/alli/%EC%9E%85%EB%A0%A5-%ED%8F%BC-%EB%B3%B4%EB%82%B4%EA%B8%B0-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 3,
        title: "답변 생성 노드 (규정 검색)",
        where: "플로우 빌더 > 입력 폼 다음",
        action:
          "답변 생성 노드로 관련 규정 조항 검색",
        detail:
          '검색 소스: 규정 폴더 문서만 지정. 질문 변수에 "거래 유형: {@거래유형}, 금액: {@금액}, 당사자: {@당사자}, 설명: {@설명}에 대한 관련 규정을 찾아줘"를 설정합니다.',
        nodes: ["답변 생성"],
        sampleFile: "/samples/compliance-regulation-sample.txt",
        sampleLabel: "컴플라이언스 규정 요약 샘플 다운로드",
      },
      {
        step: 4,
        title: "LLM 노드 (위반 가능성 분석)",
        where: "플로우 빌더 > 답변 생성 다음",
        action:
          "LLM 노드로 검색된 규정 기반 위반 가능성 분석",
        detail:
          '프롬프트: "다음 거래 정보와 관련 규정을 기반으로 위반 가능성을 분석하세요. 결과를 [위반가능성: 높음/중간/낮음]으로 시작하고, 근거 조항(조/항/호)을 인용하세요. 거래정보: {@거래정보} 관련규정: {@규정검색결과}". 결과를 @분석결과 변수에 저장합니다.',
        nodes: ["LLM 노드"],
        docRef:
          "https://guide.allganize.ai/alli/llm-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 5,
        title: "조건 분기 및 담당자 연결",
        where: "플로우 빌더 > LLM 노드 다음",
        action:
          "위반 가능성이 높으면 준법감시 담당자에게 에스컬레이션",
        detail:
          '■ 조건 추가 노드 설정\n\n조건: @분석결과 contains "위반가능성: 높음"\n→ 참이면: 담당 멤버 연결 (준법감시 담당자) 노드로 이동\n→ 기타: 메시지 보내기 ("본 분석은 참고용이며, 최종 판단은 준법감시 담당자가 수행합니다") 노드로 이동\n\n■ 담당 멤버 연결 노드 설정\n\n1. 연결 방식: "내부 메시지 발송 후 담당 멤버와 채팅 연결"\n2. 담당 멤버/팀: 준법감시부 담당자 지정\n3. 내부 메시지: "⚠️ 위반 가능성 높음 건 검토 요청 - AI 분석 결과 첨부"\n4. 이메일 알림: 활성화 / 대화 내역 전달: 활성화\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 준법감시 담당자 측에서 해야 할 일\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n[알림 수신]\n• 브라우저 알림 + 이메일로 동시 수신\n• 알림에 "위반가능성: 높음" AI 분석 요약이 포함되어\n  수락 전에 안건 파악 가능\n\n[수락 및 검토 방법]\n1. Alli 대시보드 → [대화] → [대기 중] 탭\n2. 해당 건 클릭 → AI가 분석한 전체 내용 확인\n   (거래유형/금액/관련당사자/규정 검색결과/분석결과)\n3. [수락] 버튼 → 요청자와 실시간 채팅\n4. 추가 정보 요청 또는 최종 판단 의견 전달\n\n[처리 후]\n• 해당 케이스를 Q&A나 유사 사례 문서로 등록하면\n  다음 유사 거래에서 AI 분석 정확도 향상\n• 위반 확정 건은 별도 내부 시스템으로 에스컬레이션',
        nodes: ["조건 추가", "담당 멤버 연결", "메시지 보내기"],
      },
      {
        step: 6,
        title: "접근 권한 및 가드레일 설정",
        where: "앱 설정 > 접근 권한 / Alli 대시보드 > 보안 > 가드레일",
        action:
          "앱 접근을 준법감시부로 제한하고, 가드레일로 민감 정보 필터링",
        detail:
          "가드레일에서 고객 개인정보(이름, 주민번호 등), 미공개 중요정보가 AI 응답에 포함되지 않도록 필터링 규칙을 설정합니다. 앱 공개 시 승인자를 지정하여 결재 후 공개되도록 합니다.",
      },
    ],
    eval_criteria: [
      "6개 노드 플로우 완성 (입력 폼 보내기→답변 생성→LLM 노드→조건 추가→담당 멤버 연결→메시지 보내기)",
      "가상 거래 시나리오 3건 테스트 완료",
      "관련 규정 조항(조/항/호) 인용 정확도",
      "가드레일 민감 정보 필터링 동작 확인",
      "접근 권한 및 승인 절차 설정",
    ],
    reference_links: [
      {
        label: "입력 폼 보내기 노드",
        url: "https://guide.allganize.ai/alli/%EC%9E%85%EB%A0%A5-%ED%8F%BC-%EB%B3%B4%EB%82%B4%EA%B8%B0-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        label: "LLM 노드",
        url: "https://guide.allganize.ai/alli/llm-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        label: "조건 추가 노드",
        url: "https://guide.allganize.ai/alli/%EC%A1%B0%EA%B1%B4-%EC%B6%94%EA%B0%80-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        label: "담당 멤버 연결 노드",
        url: "https://guide.allganize.ai/docs/%EB%8B%B4%EB%8B%B9%EC%9E%90-%EC%97%B0%EA%B2%B0-%EB%85%B8%EB%93%9C/?lang=ko",
      },
    ],
  },
  {
    scenario_key: "corp-manual-agent",
    title: "사내 업무 매뉴얼 검색 에이전트",
    department: "경영지원",
    pain_point:
      "신규/이동 직원이 업무 절차(계좌개설, 출금, 해외주식)를 문의할 때마다 담당자가 직접 안내해야 합니다. 월 수천 건의 반복 문의.",
    expected_outcome:
      "KT Device/미쓰비시 사례처럼 반복 문의 대폭 절감. 전 직원이 24/7 업무 매뉴얼을 즉시 검색 가능.",
    alli_app_type: "agent",
    alli_nodes: [
      "에이전트 인스트럭션",
      "문서 검색 도구",
      "Q&A 자동 생성",
      "동의어 사전",
    ],
    difficulty: "beginner",
    duration_minutes: 60,
    ice_impact: 7,
    ice_confidence: 9,
    ice_ease: 9,
    sort_order: 8,
    prep_documents: [
      "업무 매뉴얼 PDF 4건 (계좌개설/주문/출금/해외주식)",
      "증권 용어 동의어 목록",
    ],
    workflow_diagram: [
      "문서함 폴더 구조화",
      "Q&A 자동 생성 (매뉴얼→FAQ)",
      "동의어 사전 등록",
      "에이전트 생성 + 인스트럭션",
      "앱 공개 → 전 직원 배포",
    ],
    workflow_steps: [
      {
        step: 1,
        title: "공용 문서함 폴더 구조 생성 및 업로드",
        where: "Alli 대시보드 > 지식베이스 > 문서 > 폴더 관리",
        action:
          "매뉴얼/계좌개설, 매뉴얼/주문체결, 매뉴얼/출금이체, 매뉴얼/해외주식 폴더 생성 및 문서 업로드",
        detail:
          "각 폴더에 해당 업무 매뉴얼 PDF를 업로드합니다. 부서별 접근 권한을 설정하여 민감 문서는 관련 부서만 접근 가능하도록 합니다.",
      },
      {
        step: 2,
        title: "문서에서 Q&A 자동 생성",
        where: "Alli 대시보드 > 지식베이스 > Q&A > 문서에서 Q&A 자동 생성",
        action:
          "업로드된 매뉴얼 PDF에서 자동으로 FAQ를 추출",
        detail:
          "이 기능은 문서 내용을 분석하여 질문-답변 쌍을 자동으로 생성합니다. 생성된 Q&A를 검토하고 부정확한 것은 수정/삭제합니다.",
      },
      {
        step: 3,
        title: "동의어/이의어 사전 등록",
        where: "Alli 대시보드 > 학습 > 동의어 사전",
        action:
          '증권 업무 용어의 동의어를 등록하여 검색 정확도 향상',
        detail:
          '예시: "해외주식" = "외국주식" = "미국주식", "환전" = "외화매매", "출금" = "이체" = "송금". 이를 통해 사용자가 어떤 용어로 검색해도 동일한 결과를 얻을 수 있습니다.',
        sampleFile: "/samples/synonym-dictionary.csv",
        sampleLabel: "증권 용어 동의어 사전 샘플 다운로드",
      },
      {
        step: 4,
        title: "에이전트형 앱 생성",
        where: "Alli 대시보드 > 앱 관리 > 에이전트 만들기",
        action:
          '"업무 가이드 봇" 에이전트 생성, 인스트럭션 + 문서 검색 도구 추가',
        detail:
          '인스트럭션: "하나증권 업무 매뉴얼 기반으로 정확한 절차를 단계별로 안내합니다. 문서에 없는 내용은 확인 불가하다고 안내합니다." 문서 검색 도구를 추가합니다.',
        docRef:
          "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/agent-app",
      },
      {
        step: 5,
        title: "테스트 및 전 직원 배포",
        where: "에이전트 미리보기 → 공개",
        action:
          '실무 질의 테스트 후 접근 권한을 "전체"로 설정하여 공개',
        detail:
          '"해외주식 매수 시 환전 절차는?", "대량매매 신고 기준은?", "고객 계좌 잔고 조회 방법은?" 등으로 테스트합니다. 만족하면 전 직원 접근 가능하도록 공개합니다.',
      },
    ],
    eval_criteria: [
      "문서함 4개 폴더 + 접근 권한 설정",
      "Q&A 자동 생성 실행 및 결과 검토",
      "동의어 사전 5쌍 이상 등록",
      "에이전트 질의 3건 정확 응답",
      "전 직원 대상 앱 공개 완료",
    ],
    reference_links: [
      {
        label: "에이전트형 앱 가이드",
        url: "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/agent-app",
      },
      {
        label: "Q&A 지식베이스",
        url: "https://guide.allganize.ai/alli/%EC%97%85%EB%A1%9C%EB%93%9C%ED%95%9C-%EB%AC%B8%EC%84%9C%EC%97%90%EC%84%9C-%EC%A7%81%EC%A0%91-%EB%8B%B5%EB%B3%80-%EC%B0%BE%EA%B8%B0-qa-%EB%85%B8%EB%93%9C/?lang=ko",
      },
    ],
  },
  // ── 인재개발 ──
  {
    scenario_key: "wm-cert-qa-chatbot",
    title: "자격증 Q&A 챗봇",
    department: "경영지원",
    pain_point:
      "금융자격증(투자자문인력, 펀드투자상담사, 파생상품투자상담사 등) 관련 문의가 인재개발실에 반복적으로 집중되어 담당자 업무 부하가 높고, 야간/주말에는 응대가 불가능합니다.",
    expected_outcome:
      "자격증 시험 일정, 응시 요건, 학습 방법, 갱신 절차 등 반복 문의를 24/7 자동 응대하여 인재개발실 문의량 70% 이상 감소. 직원 자격증 취득률 향상.",
    alli_app_type: "interactive",
    alli_nodes: [
      "메시지 보내기",
      "답변 생성",
      "조건 추가",
      "담당 멤버 연결",
    ],
    difficulty: "intermediate",
    duration_minutes: 60,
    ice_impact: 8,
    ice_confidence: 9,
    ice_ease: 8,
    sort_order: 9,
    prep_documents: [
      "자격증 FAQ CSV 파일 (30~50건)",
      "금융자격증 시험 안내 문서 (투자자문인력/펀드투자상담사/파생상품투자상담사)",
      "자격증 학습 가이드 문서",
      "자격증 시험 일정표",
    ],
    workflow_diagram: [
      "시작",
      "메시지 보내기 (인사말)",
      "답변 생성 (자격증 문서 검색)",
      "조건 추가 (답변 실패 체크)",
      "담당 멤버 연결 (인재개발실 담당자)",
    ],
    flowchart: {
      nodes: [
        { id: "start", label: "Start", type: "start" },
        { id: "n1", label: "메시지 보내기", sub: "안녕하세요,\n인재개발실 입니다.", type: "message" },
        { id: "n2", label: "답변 생성", sub: "기본 모델: AZURE GPT-4o\n에이전트: 기본 RAG\n검색 소스: 문서 ☑\n변수 저장: @TEXT", type: "answer" },
        { id: "n3", label: "조건 추가", sub: '@TEXT contains\n"없습니다"', type: "condition" },
        { id: "n4", label: "담당 멤버 연결", sub: "내부 메시지 발송 후\n담당 멤버와 채팅 연결", type: "member" },
        { id: "end", label: "답변 성공", sub: "정상 답변 전달", type: "end" },
      ],
      edges: [
        { from: "start", to: "n1" },
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4", label: '@TEXT contains "없습니다"', style: "fail" },
        { from: "n3", to: "end", label: "기타 (정상 답변)", style: "success" },
      ],
    },
    workflow_steps: [
      {
        step: 1,
        title: "Q&A 지식베이스에 자격증 FAQ 일괄 업로드",
        where: "Alli 대시보드 > 지식베이스 > Q&A > 일괄 업로드",
        action: "자격증 관련 FAQ를 CSV로 정리하여 일괄 등록",
        detail:
          'CSV 형식: "질문","답변" 열로 구성. 30~50건의 자주 묻는 질문(자격증 종류, 응시 요건, 시험 일정, 학습 방법, 갱신 절차 등)을 등록합니다.\n\n등록 후 카테고리별 해시태그를 부여합니다:\n- #투자자문인력\n- #펀드투자상담사\n- #파생상품투자상담사\n- #시험일정\n- #갱신절차\n\n[샘플 CSV 미리보기]\n질문,답변\n"투자자문인력 자격시험 응시 요건은?","학력/경력 제한 없이 누구나 응시 가능합니다. 한국금융투자협회에서 주관합니다."\n"펀드투자상담사 시험과목은?","1과목: 펀드투자, 2과목: 증권투자, 3과목: 부동산투자 총 3과목입니다."',
        docRef:
          "https://guide.allganize.ai/alli/%EC%97%85%EB%A1%9C%EB%93%9C%ED%95%9C-%EB%AC%B8%EC%84%9C%EC%97%90%EC%84%9C-%EC%A7%81%EC%A0%91-%EB%8B%B5%EB%B3%80-%EC%B0%BE%EA%B8%B0-qa-%EB%85%B8%EB%93%9C/?lang=ko",
        sampleFile: "/samples/cert-qa-sample.csv",
        sampleLabel: "자격증 FAQ CSV 샘플 다운로드 (30건)",
      },
      {
        step: 2,
        title: "공용 문서함에 자격증 관련 문서 업로드",
        where: "Alli 대시보드 > 지식베이스 > 문서 > 폴더 생성 + 업로드",
        action:
          "폴더 구조(자격증/투자자문인력, 자격증/펀드투자상담사, 자격증/파생상품투자상담사)를 만들고 문서 업로드",
        detail:
          "각 자격증별 시험 안내서, 학습 가이드, 시험 일정표를 폴더별로 분류하여 업로드합니다.\n\n폴더 구조:\n├── 자격증/\n│   ├── 투자자문인력/ (시험안내.pdf, 학습가이드.pdf)\n│   ├── 펀드투자상담사/ (시험안내.pdf, 학습가이드.pdf)\n│   └── 파생상품투자상담사/ (시험안내.pdf, 학습가이드.pdf)\n\n각 문서에 해시태그(#투자자문인력, #펀드투자상담사 등)를 부여합니다. 폴더별 접근 권한은 '전체 직원'으로 설정합니다.",
        docRef:
          "https://guide.allganize.ai/alli/%EB%8B%B5%EB%B3%80-%EC%83%9D%EC%84%B1-%EB%85%B8%EB%93%9C/?lang=ko",
        sampleFile: "/samples/cert-study-guide-sample.txt",
        sampleLabel: "자격증 학습 가이드 샘플 다운로드",
      },
      {
        step: 3,
        title: '대화형 앱 생성 및 "메시지 보내기" 노드 설정',
        where: "Alli 대시보드 > 앱 관리 > + 새 앱 만들기 > 대화형 앱",
        action: '"자격증 Q&A" 앱 생성 후 시작 노드에 메시지 보내기 노드 추가',
        detail:
          '■ 노드 설정 상세 (ID: 1)\n\n1. 메시지 내용:\n   "안녕하세요, 인재개발실 입니다."\n\n2. 메시지 유형: 텍스트\n3. 다음 노드로 자동 진행: 예\n4. 눈 아이콘(👁): 노드 활성화 상태 유지\n\n이 노드는 사용자가 챗봇에 접속하면 가장 먼저 표시되는 인사말입니다. 시작 노드에서 연결선을 드래그하여 메시지 보내기 노드를 연결합니다.',
        nodes: ["메시지 보내기"],
        docRef:
          "https://guide.allganize.ai/alli/%EB%A9%94%EC%8B%9C%EC%A7%80-%EB%B3%B4%EB%82%B4%EA%B8%B0-%EC%A7%88%EB%AC%B8%ED%95%98%EA%B8%B0-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 4,
        title: '"답변 생성" 노드 설정 (문서 기반 자동 답변)',
        where: "플로우 빌더 > 메시지 보내기 다음에 노드 추가",
        action:
          "답변 생성 노드를 추가하고 자격증 문서를 검색 소스로 설정",
        detail:
          '■ 노드 설정 상세 (ID: 2)\n\n1. 질문 입력 방식: ● 멤버 입력 (사용자가 직접 질문 입력)\n   - "변수" 선택 시 이전 노드의 변수를 질문으로 사용\n\n2. 질문 입력: 클릭 후 메시지를 입력해 주세요\n   - ☑ 노드 진입 시 항상 메시지 출력: 체크\n\n3. 기본 모델: AZURE GPT-4o\n   - 드롭다운에서 선택 (GPT-4o가 가장 정확)\n\n4. 에이전트: 기본 RAG (기본)\n   - "편집" 버튼으로 프롬프트 커스터마이징 가능\n   - 편집 시 시스템 프롬프트에 "하나증권 인재개발실의 자격증 안내 전문가로서 정확한 정보를 제공합니다" 추가 권장\n\n5. 검색 소스 (중요!):\n   □ Q&A: 선택사항 (Q&A 등록 시 체크)\n   ☑ 문서: 반드시 체크 → 펼쳐서 "자격증" 폴더 지정\n   □ 인터넷: 미체크\n\n6. 답변을 아래 변수로 저장: @TEXT\n   - 이 변수는 다음 "조건 추가" 노드에서 참조됨\n\n7. 답변 생성 후: ● 다음 노드로 진행\n   - "다시 질문하기" 선택 시 반복 대화 가능\n\n8. □ 정답을 찾지 못한 경우 분기 옵션 추가: 선택사항',
        nodes: ["답변 생성"],
        docRef:
          "https://guide.allganize.ai/alli/%EB%8B%B5%EB%B3%80-%EC%83%9D%EC%84%B1-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 5,
        title: '"조건 추가" 노드 설정 (답변 실패 감지)',
        where: "플로우 빌더 > 답변 생성 다음에 노드 추가",
        action:
          "조건 추가 노드로 답변 실패 시 담당자 연결 분기 설정",
        detail:
          '■ 노드 설정 상세 (ID: 3)\n\n1. 옵션 1 (조건 설정):\n   변수: @TEXT\n   연산자: contains\n   값: "없습니다"\n   → 이 조건이 참이면: "담당 멤버 연결" 노드로 이동\n\n   설정 방법:\n   - "= 옵션 1" 영역에서 조건식을 입력\n   - @TEXT contains "없습니다" 형태로 작성\n   - @TEXT는 답변 생성 노드에서 저장한 변수\n\n2. + 옵션 추가: (선택사항)\n   - @TEXT contains "찾을 수 없" 등 추가 실패 패턴 설정 가능\n\n3. 기타 (else 분기):\n   → 답변이 성공적으로 생성된 경우\n   → "답변이 성공적으로 생성됨" 출력 노드 또는 종료\n\n4. 메모: 조건 분기 로직 설명을 메모란에 기록 가능\n\n※ 핵심: 답변 생성 노드가 문서에서 답변을 찾지 못하면 "없습니다"가 포함된 응답을 생성하므로, 이를 감지하여 담당자에게 에스컬레이션합니다.',
        nodes: ["조건 추가"],
        docRef:
          "https://guide.allganize.ai/alli/%EC%A1%B0%EA%B1%B4-%EC%B6%94%EA%B0%80-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 6,
        title: '"담당 멤버 연결" 노드 설정 (에스컬레이션)',
        where: "플로우 빌더 > 조건 추가의 옵션 1 출력에 연결",
        action:
          "답변 실패 시 인재개발실 담당자에게 실시간 채팅 연결",
        detail:
          '■ 노드 설정 상세 (ID: 4)\n\n1. 연결 방식: "내부 메시지 발송 후 담당 멤버와 채팅 연결"\n\n2. 담당 멤버/팀 지정:\n   - 특정 멤버: 인재개발실 자격증 담당자 선택\n   - 또는 팀 단위: "인재개발실" 팀 선택 (팀 내 순차 배정)\n\n3. 연결 실패 시 대기 메시지:\n   "담당자 연결 중입니다. 잠시만 기다려주세요. 업무시간(평일 09:00~18:00) 외에는 답변이 지연될 수 있습니다."\n\n4. 추가 설정:\n   - 이메일 알림 발송: 활성화 (담당자에게 이메일 알림)\n   - 대화 내역 전달: 활성화 (이전 대화 컨텍스트 전달)\n\n※ 이 노드는 조건 추가 노드에서 @TEXT에 "없습니다"가 포함된 경우에만 진입합니다.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 담당자(수신자) 측에서 해야 할 일\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n[알림 수신 방법]\n• Alli 대시보드에 로그인 중이면 브라우저 알림이 즉시 뜸\n• 이메일 알림을 켜두면 메일로도 동시 수신\n• 알림 메시지에 직원이 물어본 내용 요약이 함께 전달됨\n  예: "[자격증 챗봇] 답변 실패 - 직원 문의 내용: 파생상품투자상담사 환불 규정"\n\n[담당자 접속 및 수락 방법]\n1. Alli 대시보드 웹 브라우저로 접속 (별도 앱 설치 불필요)\n2. 좌측 메뉴 → [대화] 클릭\n3. [대기 중] 탭에서 해당 직원 대화 확인\n4. 대화 클릭 → AI와 나눈 이전 대화 전체 확인\n5. [수락] 버튼 클릭 → 직원과 실시간 채팅 시작\n\n[운영 팁]\n• 인재개발실 담당자 2~3명을 팀으로 등록하면\n  순차/동시 알림으로 한 명이 빠르게 수락 가능\n• 연결 후 담당자가 직접 답변하면 해당 내용을\n  나중에 Q&A에 추가 등록하여 지식베이스 강화\n\n[업무 시간 외 자동 처리]\n• 담당자 미수락 시 → 설정한 "연결 실패 메시지" 자동 발송\n  예: "현재 업무시간(09:00~18:00)이 아닙니다.\n     내일 인재개발실(내선 XXXX)로 연락 바랍니다."',
        nodes: ["담당 멤버 연결"],
        docRef:
          "https://guide.allganize.ai/docs/%EB%8B%B4%EB%8B%B9%EC%9E%90-%EC%97%B0%EA%B2%B0-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        step: 7,
        title: "테스트 및 피드백 학습",
        where: "앱 미리보기 + Alli Works 피드백 기능",
        action:
          "다양한 자격증 질의로 테스트 후, 부정확한 답변에 피드백을 남겨 학습 반영 확인",
        detail:
          '테스트 질의 예시:\n- "투자자문인력 시험 일정은 언제인가요?"\n- "펀드투자상담사 합격 기준은?"\n- "파생상품투자상담사 자격 갱신은 어떻게 하나요?"\n- "증권투자권유자문인력과 투자자문인력의 차이는?"\n\n테스트 체크포인트:\n1. 등록된 Q&A에서 정확한 답변이 반환되는지\n2. 문서 기반 답변의 출처가 올바른지\n3. 답변 실패 시 조건 분기 → 담당자 연결이 동작하는지\n4. 오답에 👎 피드백 → 올바른 정보 입력 → 재질의로 개선 확인\n\n※ Alli Works 피드백 시스템을 활용하여 지속적으로 답변 품질을 개선합니다.',
      },
    ],
    eval_criteria: [
      "Q&A 일괄 업로드 및 해시태그 분류 완료 (30건 이상)",
      "자격증 문서 폴더 3개 생성 및 문서 업로드 완료",
      "대화형 앱 노드 플로우 4개 노드 연결 완료 (메시지 보내기→답변 생성→조건 추가→담당 멤버 연결)",
      "답변 생성 노드: 모델/검색소스/변수 설정 완료",
      "조건 추가 노드: @TEXT contains '없습니다' 분기 설정 완료",
      "자격증 질의 3건 이상 정확 응답 확인",
      "조건 분기 → 담당자 연결 동작 확인",
      "피드백 학습 1건 이상 반영 확인",
    ],
    reference_links: [
      {
        label: "대화형 앱 빌더 개요",
        url: "https://docs.allganize.ai/allganize-alli-works/alli-dashboard/app-management/conversation-app",
      },
      {
        label: "답변 생성 노드",
        url: "https://guide.allganize.ai/alli/%EB%8B%B5%EB%B3%80-%EC%83%9D%EC%84%B1-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        label: "조건 추가 노드",
        url: "https://guide.allganize.ai/alli/%EC%A1%B0%EA%B1%B4-%EC%B6%94%EA%B0%80-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        label: "담당 멤버 연결 노드",
        url: "https://guide.allganize.ai/docs/%EB%8B%B4%EB%8B%B9%EC%9E%90-%EC%97%B0%EA%B2%B0-%EB%85%B8%EB%93%9C/?lang=ko",
      },
      {
        label: "메시지 보내기 노드",
        url: "https://guide.allganize.ai/alli/%EB%A9%94%EC%8B%9C%EC%A7%80-%EB%B3%B4%EB%82%B4%EA%B8%B0-%EC%A7%88%EB%AC%B8%ED%95%98%EA%B8%B0-%EB%85%B8%EB%93%9C/?lang=ko",
      },
    ],
  },
];

export const ALL_SCENARIOS_FOR_ICE = TRAINING_SCENARIOS.map((s) => ({
  scenario_key: s.scenario_key,
  title: s.title,
  department: s.department,
  alli_app_type: s.alli_app_type,
  ice_impact: s.ice_impact,
  ice_confidence: s.ice_confidence,
  ice_ease: s.ice_ease,
  sort_order: s.sort_order,
}));
