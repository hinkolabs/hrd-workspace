# HRD Workspace - 인재개발실 팀 웹앱

> **프로젝트 경로**: `c:\dev\hrd-workspace`
> **버전**: v0.2 (2026-04-11 업데이트)

## 개요

인재개발실 전용 팀 워크스페이스 웹앱.
메모/할일/캘린더 공유, 팀 채팅, AI 도구(견적 비교, 문서 변환, 업무 보고서, 지식 베이스), 사이버학당 UI 편집기를 갖춘 Next.js 16 + Supabase 앱.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 스타일링 | Tailwind CSS 4 |
| DB + Storage | Supabase (PostgreSQL, Realtime, Storage) |
| 인증 | 커스텀 JWT (bcryptjs + jose), httpOnly Cookie |
| AI | OpenAI GPT-4o (Chat, Vision, Embeddings) |
| 코드 에디터 | @monaco-editor/react |
| 패널 레이아웃 | react-resizable-panels |
| HTML 크롤링 | cheerio |
| 문서 처리 | pdf-parse (PDF 텍스트 추출) |
| 배포 | Vercel |

---

## 전체 메뉴 구조

```
[HRD Workspace]
├── 로그인 (/login) .......................... 인증/초기 계정 설정
├── 대시보드 (/) ............................. 메인 화면
│   ├── 메모 보드 (좌측) .................... 실시간 공유 메모
│   ├── 칸반 할일 (우상) .................... 대기/진행중/완료
│   └── 캘린더 (우하) ....................... 월간/주간 뷰
├── 소통
│   └── 팀 채팅 (/chat) ..................... 실시간 메시지
├── AI 도구
│   ├── 견적 비교 (/tools/estimate) ......... AI 견적 항목 파싱/비교
│   ├── 문서 변환 (/tools/hwp-convert) ...... HWP/DOC/TXT/PDF → PDF 변환
│   ├── 업무 보고서 (/tools/report) ......... 기간별 자동 보고서 생성
│   └── 지식 베이스 (/tools/knowledge) ...... RAG 문서 등록/검색/삭제/Q&A
├── 관리
│   └── 사용자 관리 (/admin) ................ 사용자 CRUD
└── 기타
    └── 사이버학당 UI 편집기 (/ui-editor) ... 웹 크롤링 + AI 편집
```

---

## 기능 상세

### 1. 인증 시스템 (/login)

| 항목 | 설명 |
|------|------|
| 인증 방식 | 커스텀 JWT (bcryptjs 해시 + jose 서명) |
| 세션 관리 | httpOnly 쿠키 `hrd-session` |
| 미들웨어 | 비인증 요청을 `/login`으로 리다이렉트 |
| 초기 설정 | 첫 실행 시 admin 계정 자동 생성 (`/api/auth/setup`) |
| 부가 기능 | 아이디 저장(localStorage), 자동 로그인(장기 JWT) |

**API 엔드포인트:**
- `POST /api/auth/login` — 로그인 (JWT 쿠키 발급)
- `POST /api/auth/logout` — 로그아웃 (쿠키 삭제)
- `GET /api/auth/me` — 현재 세션 사용자 조회
- `POST /api/auth/setup` — 최초 admin 계정 생성

### 2. 대시보드 (/)

**메모 보드 (좌측)**
- 카드 그리드 형태의 실시간 공유 메모
- 추가/편집/삭제/핀 고정, 색상 구분
- Supabase Realtime으로 실시간 동기화

**칸반 할일 보드 (우상단)**
- 3단계 칸반: 대기 → 진행중 → 완료
- 우선순위(높음/중간/낮음), 마감일 설정
- Supabase Realtime 연동

**캘린더 (우하단)**
- 월간/주간 뷰 토글
- 할일 마감일 + 메모 생성일 기반 이벤트 표시

**API 엔드포인트:**
- `GET/POST /api/memos`, `PUT/DELETE /api/memos/[id]`
- `GET/POST /api/todos`, `PUT/DELETE /api/todos/[id]`

### 3. 팀 채팅 (/chat)

- 실시간 팀 메시지 (Supabase Realtime + 폴링 폴백)
- 발신자 표시, 시간순 정렬

**API:** `GET/POST /api/chat`

### 4. 견적 비교 (/tools/estimate)

- 업체별 견적 텍스트 입력 → GPT-4o가 항목 파싱
- 자동 비교표(JSON) 생성 → 표 형태로 렌더링

**API:** `POST /api/tools/estimate`

### 5. 문서 변환기 (/tools/hwp-convert)

| 항목 | 설명 |
|------|------|
| 지원 입력 형식 | `.hwp`, `.hwpx`, `.doc`, `.docx`, `.txt`, `.pdf`, `.rtf`, `.csv`, `.md` |
| 변환 방식 | 파일 텍스트 추출 → GPT-4o → 구조화된 HTML 생성 |
| 출력 | PDF 인쇄, HTML 다운로드 |
| 다중 파일 | 여러 파일 동시 업로드 및 일괄 변환 지원 |

**API:** `POST /api/tools/hwp-convert` (FormData: file)

### 6. 지식 베이스 (/tools/knowledge)

| 항목 | 설명 |
|------|------|
| 문서 등록 | 텍스트 직접 입력 또는 파일 업로드 (.txt, .md, .csv, .pdf) |
| 문서 삭제 | 개별 문서 삭제 기능 |
| AI 질의 | 키워드 매칭 기반 문서 검색 + GPT-4o 답변 생성 |
| 출처 표시 | 답변에 참고한 문서 제목 표시 |

**API 엔드포인트:**
- `GET /api/tools/knowledge` — 문서 목록
- `POST /api/tools/knowledge` — 문서 등록 (JSON 또는 FormData)
- `DELETE /api/tools/knowledge/[id]` — 문서 삭제
- `POST /api/tools/knowledge/ask` — AI 질의

### 7. 업무 보고서 (/tools/report)

- 기간 선택 → 해당 기간 할일/메모 집계
- GPT-4o가 보고서 형태로 자동 작성
- 마크다운 형태 출력

**API:** `POST /api/tools/report`

### 8. 사용자 관리 (/admin)

- 사용자 목록 조회, 생성, 수정, 삭제, 비활성화
- 비밀번호 초기화

**API:** `GET/POST /api/admin/users`, `PUT/DELETE /api/admin/users/[id]`

### 9. 사이버학당 UI 편집기 (/ui-editor)

- URL 크롤링 → GPT-4o Vision으로 HTML 미러링
- 3패널 편집기: 미리보기(iframe) / 코드(Monaco) / AI 채팅
- 프롬프트로 HTML 수정 요청 → 실시간 반영
- 페이지 저장/관리, HTML 다운로드

---

## DB 스키마 (Supabase)

| 테이블 | 용도 |
|--------|------|
| `users` | 사용자 (username, password_hash, display_name, is_active) |
| `memos` | 메모 (title, content, pinned, color) |
| `todos` | 할일 (title, status, priority, due_date) |
| `messages` | 채팅 메시지 (sender, content) |
| `estimates` | 견적 비교 결과 (title, result jsonb) |
| `documents` | RAG 문서 (title, content, file_type, file_url, chunk_count) |

스키마 파일: `supabase-schema.sql`

---

## 환경변수 (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-key
```
