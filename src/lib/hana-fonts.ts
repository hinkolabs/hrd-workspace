/**
 * 하나2.0 서체 — 웹·PDF 공통 상수
 */
export const HANA_FONT_FAMILY = "하나체";

/** @react-pdf/renderer Font.register() 용 */
export const HANA_PDF_FONTS = {
  family: HANA_FONT_FAMILY,
  fonts: [
    { src: "/fonts/Hana2-Light.ttf", fontWeight: 300, fontStyle: "normal" as const },
    { src: "/fonts/Hana2-Regular.ttf", fontWeight: 400, fontStyle: "normal" as const },
    { src: "/fonts/Hana2-Medium.ttf", fontWeight: 500, fontStyle: "normal" as const },
    { src: "/fonts/Hana2-CM.ttf", fontWeight: 600, fontStyle: "normal" as const },
    { src: "/fonts/Hana2-Bold.ttf", fontWeight: 700, fontStyle: "normal" as const },
    { src: "/fonts/Hana2-Heavy.ttf", fontWeight: 900, fontStyle: "normal" as const },
    // italic 요청 시 regular로 폴백
    { src: "/fonts/Hana2-Regular.ttf", fontWeight: 400, fontStyle: "italic" as const },
    { src: "/fonts/Hana2-Bold.ttf", fontWeight: 700, fontStyle: "italic" as const },
  ],
};
