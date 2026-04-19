# PPT Design Presets

디자인 시안(Preset) 시스템입니다. 각 시안은 색상·폰트 토큰 + 슬라이드 크롬(타이틀바·데코레이션·로고·페이지번호)을 한 번에 정의합니다.

## 구조

```
src/lib/ppt-presets/
├── types.ts          # DesignPreset, SlideStyle 타입 정의
├── index.ts          # 레지스트리 (PRESETS 배열, getPreset(), resolveStyle())
├── lotte-2022.ts     # 롯데지주 2022 운영안 시안 (기본 시안 — 원본 PPTX 분석 기반)
├── hana-2022.ts      # 하나그룹 2022 운영안 시안 (수동 추정, 레거시 보존)
└── README.md         # 이 파일
```

## 새 디자인 시안 추가 절차

### 방법 A — PPTX 파일에서 자동 추출 (권장)

1. **원본 구조 읽기 (readonly 분석)**
   ```bash
   node scripts/analyze-hana.mjs "C:/path/to/design.pptx" --out tmp/analysis.txt
   ```
   - theme1 색/폰트, slideMaster 도형, 대표 슬라이드 도형 fill·좌표를 텍스트로 dump
   - 파일을 생성하지 않고 읽기 전용으로 관찰만 함

2. **초안 ts 자동 생성**
   ```bash
   node scripts/extract-preset-from-pptx.mjs "C:/path/to/design.pptx" --slug my-design --name "내 디자인 시안"
   ```

2. **생성된 파일 검토·수정**
   ```
   src/lib/ppt-presets/my-design.ts
   ```
   - `// TODO:` 주석이 달린 값들을 원본 PPTX와 대조해 수정
   - 특히 `decorations` 좌표와 `opacity` 값을 확인

3. **레지스트리에 등록**  
   `src/lib/ppt-presets/index.ts` 수정:
   ```ts
   import myDesign from "./my-design";
   
   export const PRESETS: DesignPreset[] = [hana2022, myDesign]; // 추가
   ```

### 방법 B — 수동 작성

`hana-2022.ts`를 복사해 값을 변경하고, `index.ts`에 등록합니다.

---

## `DesignPreset` 필드 설명

| 필드 | 설명 |
|------|------|
| `id` | 고유 식별자 (URL-safe, e.g. `"hana-2022"`) |
| `name` | 사용자에게 표시되는 이름 |
| `baseTheme` | 기본 `ThemeId` — 토큰이 없는 색상은 이 테마에서 상속 |
| `tokens.colors` | 기본 테마를 부분 오버라이드하는 색상 |
| `tokens.fonts` | 폰트 패밀리 오버라이드 |
| `chrome.titleBar` | 타이틀바 스타일 (`full-bleed`, `left-accent`, `minimal-underline`) 및 높이 |
| `chrome.decorations` | 슬라이드 배경에 반복되는 장식 도형 목록 |
| `chrome.logo` | 로고 위치 (현재 미구현 — 추후 확장) |
| `chrome.pageNumber` | 페이지 번호 위치·스타일 |
| `titleSlide` | 표지 슬라이드 스타일 변형 |
| `sectionSlide` | 섹션 슬라이드 스타일 변형 |

## 타이틀바 스타일 옵션

| 값 | 설명 |
|----|------|
| `"full-bleed"` | 배경 전체 채움 + 왼쪽 세로 액센트 + 하단 라인 (기본, hana-2022) |
| `"left-accent"` | 배경 없이 왼쪽 굵은 세로 액센트만 |
| `"minimal-underline"` | 배경 없이 하단 얇은 선만 |

## `resolveStyle()` 작동 방식

```
baseTheme (PPT_THEMES[preset.baseTheme])
    ↓ merge with
preset.tokens.colors  →  SlideStyle.colors
preset.tokens.fonts   →  SlideStyle.fonts
preset.chrome         →  SlideStyle.chrome
preset.titleSlide     →  SlideStyle.titleSlide
preset.sectionSlide   →  SlideStyle.sectionSlide
```

`buildPptx()` 에서 `resolveStyle(getPreset(presetId))` 를 호출해 `SlideStyle` 을 만들고,
모든 슬라이드 빌더 함수에 `style` 파라미터로 전달합니다.
