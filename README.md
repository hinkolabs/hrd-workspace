# HRD Workspace

인재개발실 팀 워크스페이스 웹앱 (MVP)

## 기능

- **대시보드** (`/`): 실시간 메모 보드 + 투두 칸반 보드
- **사이버학당 UI 편집기** (`/ui-editor`): 스크린샷+URL → AI 미러링 → HTML 편집 → 다운로드

## 시작하기

### 1. 환경변수 설정

`.env.local` 파일을 열고 실제 키로 교체하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key  # PPT 생성(기본) + freeform 모드에 사용
```

### 2. Supabase DB 설정

Supabase 대시보드 → SQL Editor에서 `supabase-schema.sql` 내용을 실행하세요.

Realtime 활성화:
- Supabase 대시보드 → Database → Replication → `memos`, `todos` 테이블 추가

### 3. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000`에서 확인하세요.

## 기술 스택

- Next.js 16 (App Router)
- Tailwind CSS v4
- Supabase (DB + Realtime)
- OpenAI GPT-4o Vision
- Monaco Editor
- react-resizable-panels
