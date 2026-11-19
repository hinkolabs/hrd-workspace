# 실시간 팀 대항 퀴즈 SSOT

이 문서는 오프라인 행사에서 쓰는 실시간 팀 대항 퀴즈의 구현 기준이다. 다른 작업 공간에서 같은 기능을 다시 만들 때 이 문서와 `src/lib/live-quiz-schema.ts`의 SQL을 기준으로 한다.

기준 구현은 Next.js 16 App Router, 기존 관리자 JWT, Supabase service role이다. 홍보용 퀴즈(`promo_quiz_*`)와는 별개다. 이름, 사번, 닉네임은 받지 않는다.

## 1. 행사 흐름

관리자가 조와 문제 5~10개를 만들고 발행한다. 참가자는 로그인 없이 QR로 들어와 콤보박스에서 조를 고른 뒤 준비를 누른다. 관리자는 조별 준비 인원을 본다. 시작을 누르면 준비된 인원이 잠기고 1번 문제가 모두에게 열린다. 사람이 있는 조가 2개 미만이면 시작하지 않는다. 다음 문제는 자동으로 시작하지 않는다.

제한 시간이 끝나면 모든 참가자가 같이 종료되고 서버가 채점한다. 운영 화면은 진행 중 마감 버튼을 두지 않는다. 관리자가 N번 문제 끝을 누르면 그 문제의 정답과 누적 1등 조만 참가자와 발표 화면에 나온다. 1등이 여러 조면 모두 1등으로 보인다. 다음을 누르면 다음 문제가 시작된다. 마지막 문제 뒤에는 참가자가 다시 기다리고, 관리자가 퀴즈 종료 및 결과 집계를 누르면 모든 조의 점수와 등수가 나온다.

권장 구성은 8문제, 각 30초다. 배점 기본값은 100, 100, 100, 150, 150, 150, 200, 250이다. 문제 수, 시간, 배점은 관리자가 바꾼다. 목표 진행 시간은 10~15분이다.

## 2. 화면

| 화면 | 경로 | 누가 쓰나 |
| --- | --- | --- |
| 관리자 목록 | `/admin/quiz` | 관리자. 사이드바 **관리 → 실시간 퀴즈** |
| 준비 / 운영 | `/admin/quiz/new`, `/admin/quiz/[id]` | 초안이면 편집, 발행 후면 운영 콘솔 |
| 참가자 | `/q/[code]` | 로그인 없음. 사이트 메뉴 없음. 휴대폰 |
| 발표 | `/q/[code]/screen` | 로그인 없음. 조작 버튼 없음. 프로젝터 |

참가 코드는 6자다. 알파벳은 `abcdefghjkmnpqrstuvwxyz23456789`다. 발행하면 `code`와 `public_path = /q/{code}`를 저장한다.

참가자 세션은 `localStorage` 키 `hrd-live-quiz:{code}`에 join token만 저장한다. 같은 브라우저에서 새로고침하면 그 토큰으로 복구한다. 토큰이 무효면 지운다. 입장 후 조는 바꿀 수 없다.

## 3. 기존 앱에 붙이는 위치

- 관리자 판별은 서버에서 한다. 쿠키 세션의 `role === "admin"`만 관리자 API를 통과시킨다. 화면에서 메뉴를 숨기는 것으로 권한을 대신하지 않는다.
- `src/proxy.ts`의 공개 경로에 `/q/`와 `/api/live-quiz/`를 넣는다. 그 외 관리자 API는 기존 로그인 게이트를 탄다.
- `src/components/layout/app-shell.tsx`는 `pathname.startsWith("/q/")`이면 사이드바를 그리지 않고 `/api/auth/me`도 호출하지 않는다.
- DB 접근은 서버의 `createServerClient()`와 `SUPABASE_SERVICE_ROLE_KEY`만 쓴다. 브라우저에는 anon 키로 Realtime 구독만 한다. service role을 클라이언트 컴포넌트에 import하지 않는다.
- 추가 환경변수는 없다.
- 라우트 핸들러의 `params`는 `Promise`다.
- 퀴즈 테이블에는 RLS를 켜고 정책을 만들지 않는다. anon이 정답과 개인 답변을 읽지 못한다. 참가자 화면은 Supabase를 직접 조회하지 않고, 서버 API만 호출한다.

## 4. 상태

`quiz_events.status`: `draft | live | ended | cancelled`

`quiz_events.phase`: `edit | lobby | question | closed | reveal | final | ended`

`final_step`은 스키마에 남아 있다. 현재 운영 화면은 2등 발표와 1등 발표를 쓰지 않는다.

발행하면 `status=live`, `phase=lobby`가 된다. 시작 때 lobby이면 준비 인원으로 `roster_locked=true`가 되고, 각 조의 입장 수가 `quiz_teams.locked_size`다. 이 값이 점수 분모다. 예상 인원(`expected_size`)은 분모가 아니다. 확정 뒤 신규 입장은 거절한다. 접속이 끊기거나 미제출이어도 분모에서 빼지 않는다. 미제출은 오답이다.

문제 시작은 `phase=question`이고 `current_question_id`, `question_started_at`, `question_ends_at`를 한 번에 기록한다. 마감 시각은 서버 시각 + 제한 시간이다. 클라이언트 시계는 믿지 않는다.

`setTimeout`으로 마감을 처리하지 않는다. `question_ends_at`이 지난 `question` 상태를 조회할 때 `ensureClosed`가 한 번만 `closed`로 바꾸고 채점한다. 조건은 `phase=question`이고 `current_question_id`가 같을 때다. 진 쪽은 저장된 상태를 다시 읽는다.

## 5. 점수

문제별 조 점수 = `(그 조 정답 인원 / 그 조 locked_size) × 배점`

문제의 `scope`가 `individual`이면 개인전이다. 답은 맞았는지 개인에게 보여 주지만 `points_scaled`는 0이라 조별 누적 점수와 순위에 들어가지 않는다. `team`이 기본값이다.

계산은 정수로 유지한다.

```text
POINTS_SCALE = 1_000_000_000
points_scaled = floor(correct * points * POINTS_SCALE / roster)
```

`roster <= 0`이거나 정답 인원이 0이면 0점이다. `locked_size`가 0인 조는 순위에서 뺀다. 결과 행은 `(question_id, team_id)`로 upsert해서 재집계가 점수를 더하지 않게 한다.

순위는 `points_scaled` 합계의 내림차순이다. 같으면 조 이름 한국어 정렬이다. 경쟁 순위라서 공동 1등이면 다음은 3등이다. 화면에는 `formatScaled`로만 소수 둘째 자리를 보여 준다. `round(scaled / 1e7) / 100` 뒤 `toFixed(2)`다. 순위 비교에 반올림 값을 쓰지 않는다.

같은 비율은 같은 정수여야 한다. `1/3`과 `2/6`은 같다.

검증값. 100점 문제:

| 정답 / 인원 | 화면 |
| --- | --- |
| 4/5 | 80.00 |
| 5/6 | 83.33 |
| 5/5 | 100.00 |
| 4/6 | 66.67 |

빨리 제출해도 가산점은 없다. 전원 정답은 표시만 하고 가산점은 없다.

동점 판정은 정수 합계로 한다. 공동 1등은 같은 순위를 쓰고 다음은 그 수만큼 건너뛴다. 문제 끝 화면의 1등은 그 문제만이 아니라 지금까지의 누적 점수다.

이전 순위는 현재 문제 점수를 빼기 전의 합계로 계산한다. 관리자 콘솔에만 순위 변화를 보여 준다.

## 6. 정답 판정

객관식은 보기 2개 또는 4개다. 보기 id는 2개면 `a` `b`, 4개면 `a` `b` `c` `d`다. 보기에는 글, 사진, 또는 둘 다 넣을 수 있다. 문제 본문 사진과 보기 사진은 따로다. 정답은 선택한 option id와 같을 때만 맞다. 비슷한 문구로 맞히지 않는다. 공개 상태에는 보기 사진 원본을 넣지 않고, 사진이 있는지만 표시한 뒤 이미지 조회로 받는다.

단답형은 허용 정답 목록과 완전 일치다. 최대 8개, 각 80자 이하다. 정규화는 NFKC, trim, 소문자, 전각 공백을 반각으로 바꾼 뒤 비교한다. `ignore_spaces` 기본값은 true이고, true면 모든 공백을 지운다. false면 연속 공백을 하나으로 만든다. `하나 그린`과 `하나그린`은 공백 무시일 때 같다. `하나`는 `하나그린`과 같지 않다. AI 판정은 쓰지 않는다.

애매한 답은 마감 후 관리자 검토에서 정답/오답을 뒤집는다. `override_correct`가 null이 아니면 그 값을 쓰고, 그 문제만 다시 채점한다. 작업은 `quiz_audit_logs`에 남긴다.

## 7. 문제와 조 제한

- 문제 1~10개. 발행은 5~10개이고, 각 문제에 내용과 정답이 있어야 한다.
- 조 2~12개. 이름 20자 이하, 행사 안에서 이름이 겹치면 안 된다. 예상 인원 1~99.
- 제한 시간 10~90초, 기본 30초. 배점 1~1000, 기본 100.
- 제목 80자 이하. 문제 내용과 해설 500자 이하. 보기 80자 이하.
- 사진은 선택이다. 브라우저에서 긴 변 1200px jpeg로 줄이고, data URL 길이 900,000자 이하다.
- 문제 영상은 mp4 또는 webm, 40MB 이하다. Supabase Storage `quiz-media`에 올리고 문제에는 `storage:quiz-media/clips/{uuid}.mp4` 경로만 저장한다. 참가자와 발표 화면은 문제가 열린 뒤에만 30분짜리 재생 주소를 받는다. 문제 사진과 영상은 같은 칸이라 하나만 남는다. 보기 사진은 영상으로 바꾸지 않는다.
- 초안 저장은 빈 문제를 허용한다. 발행만 완성 조건을 검사한다.
- 인원 확정 전이고 답변이 없으면 조와 문제를 통째로 갈아 끼울 수 있다. 참가자가 있는 조는 id를 유지하고, 참가자가 있는 조는 지우지 못한다. 조 순서 변경은 `sort_order`를 잠깐 +12로 옮긴 뒤 1~12로 되돌린다. 그래서 조 `sort_order` 체크는 1~24다.
- 이미 채점된 문제는 정답, 허용 답, 공백 옵션, 해설, 보기만 수정하고 재채점한다.

## 8. 운영 명령

모두 `POST /api/admin/live-quizzes/[id]/control`이고 body는 `{ action }`이다. 서버가 세션 표시 이름을 actor로 기록한다. 성공하면 행사 채널에 신호를 보낸다. 같은 단계 전이는 `phase`가 기대값일 때만 update되어, 중복 클릭은 409가 된다.

| action | 조건 | 결과 |
| --- | --- | --- |
| `lock_roster` | lobby, 1명 이상인 조가 2개 이상 | 각 조의 `locked_size`를 현재 입장 수로 고정. 0명 조도 0으로 고정 |
| `unlock_roster` | lobby이고 채점 결과가 없음 | `locked_size`를 null로 |
| `start` | lobby면 인원을 먼저 잠근다. phase는 lobby 또는 reveal | 아직 결과 없는 다음 문제를 question으로. 종료 시각 기록 |
| `end` | question | `question_ends_at`을 현재로 당기고 마감 채점. 운영 화면 버튼은 없다 |
| `reveal` | closed | reveal. 참가자와 발표 화면에 그 문제 정답과 누적 1등만 |
| `show_second` | reveal 또는 final. 1·2등 동점이고 문제가 10개 미만이면 409 | `phase=final`, `final_step=1` |
| `show_first` | 위와 같은 동점 제한 | `final_step=2` |
| `end_event` | reveal, final, ended | `status=ended`, `phase=ended` |
| `add_tiebreak` | question이 아니고 문제가 10개 미만 | 빈 객관식 100점 30초를 뒤에 추가. 운영 화면에서 채운 뒤 시작 |
| `cancel` | ended가 아님 | `status=cancelled`, `phase=ended` |

진행 중에는 정답 수와 정답 여부를 참가자와 발표 화면에 보여 주지 않는다. 관리자 콘솔은 마감 후에 정답과 답안 목록을 본다. 참가자와 발표 화면의 공개 순위는 reveal에서 1등만, ended에서 전체 점수와 등수다. 마지막 문제의 reveal이면 `awaitingFinal`이 true다. 공개 응답의 `questionResults`와 `ceremony`는 null이다.

## 9. 참가자 API

토큰 헤더는 `x-quiz-token`이다. 발표 화면은 `x-quiz-view: screen`이다. 발표 화면은 presence에 참가자로 올리지 않는다.

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| GET | `/api/live-quiz/[code]` | 공개 상태. 호출 시 마감 시각이 지났으면 채점 |
| POST | `/api/live-quiz/[code]/join` | body `{ teamId }`. lobby이고 인원 미확정일 때만. 토큰 반환 |
| POST | `/api/live-quiz/[code]/answer` | body `{ questionId, optionId, text }`. 현재 문제이고 서버 시각이 `ends_at` 이전일 때만 |
| GET | `/api/live-quiz/[code]/image?question=` | 현재 문제 사진 또는 영상 재생 주소. 참가자 토큰 또는 발표 화면 헤더 |
| POST | `/api/admin/live-quizzes/media` | 관리자 영상 업로드 주소 발급 |
| GET | `/api/admin/live-quizzes/media?ref=` | 관리자 영상 미리보기 주소 |
| POST | `/api/live-quiz/[code]/leave` | 409. 조 변경을 받지 않음 |

답변은 `(question_id, participant_id)` unique다. 중복이면 `{ ok: true, already: true }`다. 넣은 직후 종료 시각이 당겨져 있으면 그 행을 지우고, 이미 마감됐으면 재채점한다. 시간 안에 들어왔는데 상태가 이미 closed면 재채점해서 그 답을 포함한다. 응답에 정답 여부는 넣지 않는다.

공개 문제 JSON에는 reveal 전에 `correctOptionId`, `answerLabel`, `explanation`을 넣지 않는다. 단답 허용 목록도 넣지 않는다.

입장 가능한 조 목록은 lobby이고 인원이 확정되지 않았을 때만 내려간다.

## 10. 관리자 API

모두 관리자 세션이 필요하다.

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| GET, POST | `/api/admin/live-quizzes` | 목록, 생성 |
| POST | `/api/admin/live-quizzes/setup` | 테이블이 없으면 SQL 안내. 자동 DDL은 기대하지 않음 |
| GET, PUT, DELETE | `/api/admin/live-quizzes/[id]` | 조회, 구성 저장, 삭제 |
| POST | `/api/admin/live-quizzes/[id]/publish` | 발행 |
| GET | `/api/admin/live-quizzes/[id]/live` | 운영 콘솔 상태. 1초 폴링 |
| POST | `/api/admin/live-quizzes/[id]/control` | 진행 명령 |
| PATCH | `/api/admin/live-quizzes/[id]/question` | body에 `questionId`와 문제 필드 |
| POST | `/api/admin/live-quizzes/[id]/review` | body `{ answerId, correct }` |
| GET | `/api/admin/live-quizzes/[id]/export` | CSV. UTF-8 BOM. 문제별 원점수는 소수 넷째 자리 |
| DELETE | `/api/admin/live-quizzes/[id]/participants/[participantId]` | lobby이고 미확정일 때만 |

테이블이 없으면 목록 API는 200과 `{ needsSetup: true, sql }`을 준다. 관리 화면은 그 SQL을 바로 보여 주고 복사할 수 있게 한다. SQL은 아래 7개 테이블을 `create table if not exists`로 만든다. 기존 테이블을 drop하지 않는다.

## 11. 실시간

채널 이름은 `quiz:{code}`다. 서버는 `channel.httpSend("state", { at })`만 보낸다. 정답, 문제 본문, 점수를 이벤트에 넣지 않는다. 클라이언트가 이벤트를 받으면 서버 상태를 다시 조회한다.

관리자 폴링은 1초, 참가자와 발표 화면은 2초다. Realtime이 끊겨도 폴링이 맞춘다. 404나, 한 번도 성공한 상태가 없는 503이면 폴링을 멈춘다.

참가자는 presence에 `{ participantId, teamId }`를 올린다. 관리 화면의 접속 인원은 그 presence의 고유 participant id 수다. 제출 인원은 `quiz_answers` 건수다. 둘을 섞지 않는다. Realtime이 막히면 접속 인원은 0으로 남을 수 있다.

남은 시간은 `serverNow`와 로컬 시계의 차이를 저장해 `endsAt`까지 계산한다. 표시는 초 단위 ceil이다. 마지막 5초는 크게 강조한다.

## 12. 화면 동작

관리자 편집은 조 이름과 예상 인원, 객관식/단답형, 정답, 시간, 배점, 해설, 사진, 순서 변경이다. 발행 뒤 lobby이고 인원 확정 전이면 편집으로 돌아올 수 있다.

운영 콘솔 한 화면에 QR, 참가 주소, 발표 화면 열기, 조별 준비 인원, 현재 문제, 남은 시간, 시작, N번 문제 끝, 다음, 퀴즈 종료 및 결과 집계, 누적 순위, 답안 검토, CSV, 행사 취소가 있다. 행사 취소는 확인창을 띄운다. 현재 단계에서 쓸 수 없는 버튼은 보이지 않는다.

참가자 화면은 휴대폰이다. 조는 콤보박스에서 고르고 준비를 누른다. 보기는 한 줄에 하나이고, 사진 두 장 중 고르는 문제는 두 장이다. 제출 버튼은 화면 아래에 고정한다. 단답 입력은 16px보다 크게 해서 아이폰이 확대하지 않게 한다. 제출 뒤에는 제출 완료만 보여 준다. 문제 끝 뒤에는 정답과 누적 1등만 보여 준다. 종료 및 결과 집계 뒤에는 전체 등수와 점수를 보여 준다.

발표 화면은 어두운 전체 화면이다. lobby에서는 QR, question에서는 문제와 남은 시간, closed에서는 시간 종료, reveal에서는 정답과 누적 1등, ended에서는 전체 등수와 점수다.

## 13. 데이터베이스

SQL 전문은 `src/lib/live-quiz-schema.ts`의 `LIVE_QUIZ_SCHEMA_SQL`과 같다. Supabase SQL Editor에서 한 번 실행한다.

테이블:

- `quiz_events`: 행사, 상태, 현재 문제, 시작·종료 시각, 인원 확정, 시상 단계
- `quiz_teams`: 조, 예상 인원, 확정 인원
- `quiz_questions`: 문제, 정답, 시간, 배점, 사진
- `quiz_participants`: 참가자와 조, `join_token` unique
- `quiz_answers`: 개인 답변. `(question_id, participant_id)` unique
- `quiz_question_results`: 문제별 조 점수. `(question_id, team_id)` unique. `points_scaled bigint`
- `quiz_audit_logs`: 관리자 작업

`current_question_id`에는 FK를 걸지 않는다. 문제와 행사가 서로를 가리키는 순환을 피하기 위해서다. 문제 재작성 전에 이 값을 null로 만든다.

RLS는 켜고 policy는 없다. 마지막에 `notify pgrst, 'reload schema';`를 실행한다.

## 14. 다시 만들 때 파일

도메인과 채점은 서버 모듈에 둔다. 클라이언트는 그 타입과 순수 함수만 import한다.

- `src/lib/live-quiz.ts`: 제한값, 타입, 정규화, 채점 정수, 순위, 검증
- `src/lib/live-quiz-schema.ts`: SQL 문자열
- `src/lib/live-quiz-server.ts`: 관리자 권한, CRUD, 진행, 마감, 집계, 공개 상태
- `src/lib/quiz-video.ts`: 문제 영상 업로드 주소와 재생 주소
- `src/lib/live-quiz-broadcast.ts`: 서버 broadcast
- `src/components/live-quiz/use-server-clock.ts`: 서버 시각 보정
- `src/components/live-quiz/use-quiz-sync.ts`: broadcast와 presence
- `src/components/admin/live-quiz-editor.tsx`: 준비 화면
- `src/components/admin/live-quiz-console.tsx`: 운영 화면
- `src/app/admin/quiz/page.tsx`: 목록과 SQL 안내
- `src/app/admin/quiz/new/page.tsx`, `src/app/admin/quiz/[id]/page.tsx`
- `src/app/q/layout.tsx`: `viewport-fit=cover`
- `src/app/q/[code]/page.tsx`, `src/app/q/[code]/screen/page.tsx`
- `src/app/api/admin/live-quizzes/**`
- `src/app/api/live-quiz/**`
- `scripts/check-live-quiz.ts`: 점수와 판정 단위 검증
- 의존성: `qrcode`. 클라이언트에서 QR data URL을 만든다.

통합 수정은 사이드바 메뉴, proxy 공개 경로, app-shell의 `/q/` 예외, `supabase-schema.sql` 맨 아래 SQL뿐이다.

## 15. 완료로 인정하는 테스트

`npx tsx scripts/check-live-quiz.ts`가 다음을 통과해야 한다.

- 4/5, 5/6, 5/5, 4/6 점수와 화면 반올림
- 같은 비율의 정수 점수 일치
- 공동 1등, 공동 2등
- 단답 공백, 대소문자, 부분 문자열은 오답
- 객관식 option id 일치

그 다음 테이블을 만든 뒤 수동으로 확인한다.

- 두 조 이상이 준비를 누른 뒤 시작을 누르면 그 인원이 잠긴다.
- 관리자가 한 번 시작하면 새로고침 없이 참가자 화면에 같은 문제가 나온다.
- 같은 답을 두 번 제출해도 한 건만 저장된다.
- 종료 시각 이후 제출은 거절되고 분모에는 남는다.
- 5명 중 4명과 6명 중 5명의 점수가 80.00과 83.33이다.
- 새로고침 뒤 조와 제출 상태가 돌아온다.
- 정답 수정 후 재집계해도 누적 점수가 두 배로 늘지 않는다.
- 문제 끝에는 누적 1등만 보이고, 종료 및 결과 집계 뒤에 전체 등수가 보인다.

## 16. 이 구현에서 하지 않은 것

- 운영 Supabase에 퀴즈 SQL을 실행하지 않았다. 대상 프로젝트의 SQL Editor에서 실행해야 한다.
- `www.stkcat.com`은 `main`을 `hinkolabs/hrd-workspace`에 push하면 배포된다.
- 효과음, AI 문제 생성, 개인 통계, 다국어, 속도 보너스는 없다.
- 다른 기기로 같은 조에 여러 번 입장하는 것은 막지 못한다. 인원 확정으로 분모를 고정한다.
- Realtime 채널은 행사 코드를 아는 클라이언트가 구독할 수 있다. 페이로드에는 상태가 바뀌었다는 시각만 있다.
