import { SignJWT } from 'jose';
import { readFileSync, writeFileSync } from 'fs';

async function run() {
  // 1. Generate JWT
  const jwtSecret = '5e8f5f9530be5a25befa9d37fad2e3b1853e5e188d6c3cd7c7d9f219ce0954bd82c3f57b28f7448b8ff238407164c577';
  const secret = new TextEncoder().encode(jwtSecret);
  const token = await new SignJWT({ userId: 'agent', username: 'agent', displayName: 'Agent' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2h')
    .setIssuedAt()
    .sign(secret);

  const cookie = `hrd-session=${token}`;
  const filePath = 'C:\\Users\\jay\\Downloads\\[CEO수정]경영지원 그룹장 260420_그룹CEO업무보고.pptx';
  const fileBuffer = readFileSync(filePath);
  const file = new File([fileBuffer], 'ceo_report.pptx', {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });

  // 2. Call redesign API
  console.log('Calling redesign API...');
  const form = new FormData();
  form.append('file', file);
  form.append('theme', 'hana');
  form.append('designMode', 'preset');
  form.append('preserveContent', 'true');
  form.append('extraInstructions', '임원 보고용. 슬라이드 제목에 슬라이드 번호(1,2,3 등)를 사용하지 말고 내용에서 의미있는 제목을 추출하세요. 발표자명(경영지원그룹 정기환 전무)은 subtitle이나 별도 필드로 처리하세요. 텍스트 내용은 절대 수정·삭제하지 말 것.');

  const redesignRes = await fetch('http://localhost:3000/api/tools/ppt/redesign', {
    method: 'POST',
    headers: { 'Cookie': cookie },
    body: form,
  });

  console.log('Redesign status:', redesignRes.status);
  if (!redesignRes.ok) {
    const err = await redesignRes.text();
    throw new Error('Redesign failed: ' + err);
  }

  const redesignData = await redesignRes.json();
  console.log('Redesign done. Slides:', redesignData.presentation.slides.length);

  // Post-process: fix slides where title is just a slide number
  const meaningfulTitles = [
    '관계사 협업  Why?  —  문제 제기',
    '관계사 협업  HOW?  ①  기업문화',
    '관계사 협업  HOW?  ②  인사 + 시너지',
    '협업 우수사례',
    '실천 선언  —  관계사 협업!  HOW!',
  ];
  redesignData.presentation.slides = redesignData.presentation.slides.map((slide, idx) => {
    const t = slide.title?.trim();
    if (t && /^\d{1,2}$/.test(t) && meaningfulTitles[idx]) {
      console.log(`  Fixing slide ${idx+1} title: "${t}" → "${meaningfulTitles[idx]}"`);
      return { ...slide, title: meaningfulTitles[idx] };
    }
    return slide;
  });
  // Fix subtitle if it's the presenter name in Korean garbled form or just slide number
  redesignData.presentation.slides = redesignData.presentation.slides.map((slide) => {
    if (slide.subtitle && /^\d{1,2}$/.test(slide.subtitle.trim())) {
      return { ...slide, subtitle: '경영지원그룹  정기환 전무' };
    }
    if (slide.layout === 'title' && !slide.subtitle) {
      return { ...slide, subtitle: '경영지원그룹  정기환 전무  |  2026. 04. 20' };
    }
    return slide;
  });

  writeFileSync(
    'C:\\Users\\jay\\Downloads\\redesign_result.json',
    JSON.stringify(redesignData, null, 2)
  );

  // 3. Build PPTX
  console.log('Calling build API...');
  const buildRes = await fetch('http://localhost:3000/api/tools/ppt/build', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify(redesignData.presentation),
  });

  console.log('Build status:', buildRes.status);
  if (!buildRes.ok) {
    const err = await buildRes.text();
    throw new Error('Build failed: ' + err);
  }

  const pptxBuffer = Buffer.from(await buildRes.arrayBuffer());
  const outPath = 'C:\\Users\\jay\\Downloads\\경영지원그룹장_CEO업무보고_임원보고용_최종.pptx';
  writeFileSync(outPath, pptxBuffer);
  console.log(`Saved: ${outPath} (${pptxBuffer.length} bytes)`);
}

run().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
