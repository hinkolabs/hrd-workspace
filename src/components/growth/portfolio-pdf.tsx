"use client";

import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { GrowthCohort, GrowthJournal, GrowthRetro, GrowthMandalart } from "@/lib/growth-types";

// Register Noto Sans Korean for PDF (Google Fonts CDN)
Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.0.woff", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm20xz64px_1hVWr0wuPNGmlQNMEfD4.9.woff", fontWeight: 700 },
  ],
});

const S = StyleSheet.create({
  page: { fontFamily: "NotoSansKR", padding: 40, fontSize: 10, color: "#1f2937" },
  cover: { marginBottom: 24, padding: 20, backgroundColor: "#4f46e5", borderRadius: 12 },
  coverTitle: { fontSize: 22, fontWeight: 700, color: "#ffffff", marginBottom: 4 },
  coverSub: { fontSize: 11, color: "#c7d2fe" },
  sectionHeader: { fontSize: 13, fontWeight: 700, color: "#4f46e5", marginBottom: 8, marginTop: 16, borderBottom: "1 solid #e0e7ff", paddingBottom: 4 },
  card: { backgroundColor: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 8, border: "1 solid #e5e7eb" },
  cardTitle: { fontSize: 11, fontWeight: 700, color: "#111827", marginBottom: 4 },
  cardMeta: { fontSize: 9, color: "#9ca3af", marginBottom: 6 },
  cardBody: { fontSize: 9.5, color: "#374151", lineHeight: 1.5 },
  label: { fontSize: 8, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 3 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  col: { flex: 1 },
  stat: { backgroundColor: "#eef2ff", padding: 10, borderRadius: 8, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: 700, color: "#4f46e5" },
  statLabel: { fontSize: 8, color: "#6366f1", marginTop: 2 },
  goalBox: { backgroundColor: "#eef2ff", padding: 12, borderRadius: 8, marginBottom: 8 },
  goalText: { fontSize: 13, fontWeight: 700, color: "#4338ca" },
  retroBox: { backgroundColor: "#f0fdf4", padding: 10, borderRadius: 8, marginBottom: 6, border: "1 solid #bbf7d0" },
  retroMonth: { fontSize: 10, fontWeight: 700, color: "#166534", marginBottom: 4 },
  retroText: { fontSize: 9, color: "#374151", lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#9ca3af" },
});

type Props = {
  user: { displayName: string; username: string };
  cohort: GrowthCohort | null;
  mandalart: GrowthMandalart | null;
  journals: GrowthJournal[];
  retros: GrowthRetro[];
  onClose: () => void;
};

function PortfolioDoc({ user, cohort, mandalart, journals, retros }: Omit<Props, "onClose">) {
  const totalReactions = journals.reduce((s, j) => s + (j.reactions?.reduce((r, rx) => r + rx.count, 0) ?? 0), 0);

  return (
    <Document title={`${user.displayName} 성장 포트폴리오`} author="하나증권 인재개발실">
      <Page size="A4" style={S.page}>
        {/* Cover */}
        <View style={S.cover}>
          <Text style={S.coverTitle}>{user.displayName}</Text>
          <Text style={S.coverSub}>성장 포트폴리오</Text>
          {cohort && (
            <Text style={{ ...S.coverSub, marginTop: 4 }}>
              {cohort.start_date} ~ {new Date().toISOString().slice(0, 10)}
            </Text>
          )}
        </View>

        {/* Stats */}
        <View style={S.row}>
          <View style={{ ...S.col, ...S.stat }}>
            <Text style={S.statNum}>{journals.length}</Text>
            <Text style={S.statLabel}>성장일기</Text>
          </View>
          <View style={{ ...S.col, ...S.stat }}>
            <Text style={S.statNum}>{retros.length}</Text>
            <Text style={S.statLabel}>월간 회고</Text>
          </View>
          <View style={{ ...S.col, ...S.stat }}>
            <Text style={S.statNum}>{totalReactions}</Text>
            <Text style={S.statLabel}>받은 응원</Text>
          </View>
        </View>

        {/* Mandalart */}
        {mandalart?.center_goal && (
          <>
            <Text style={S.sectionHeader}>핵심 목표</Text>
            <View style={S.goalBox}>
              <Text style={S.goalText}>{mandalart.center_goal}</Text>
            </View>
          </>
        )}

        {/* Top journals */}
        {journals.length > 0 && (
          <>
            <Text style={S.sectionHeader}>대표 성장일기</Text>
            {journals.map((j) => (
              <View key={j.id} style={S.card}>
                <Text style={S.cardTitle}>{j.title}</Text>
                <Text style={S.cardMeta}>
                  {new Date(j.created_at).toLocaleDateString("ko-KR")}
                  {j.mood ? ` · ${j.mood}` : ""}
                </Text>
                {j.content && (
                  <Text style={S.cardBody}>
                    {j.content.replace(/[#*`>\-]/g, "").slice(0, 300)}
                    {j.content.length > 300 ? "..." : ""}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        <Text style={S.footer} fixed>
          하나증권 인재개발실 · {new Date().toLocaleDateString("ko-KR")} 출력
        </Text>
      </Page>

      {/* Retros page */}
      {retros.length > 0 && (
        <Page size="A4" style={S.page}>
          <Text style={{ ...S.sectionHeader, marginTop: 0 }}>월간 회고 모음</Text>
          {retros.map((r) => {
            const [y, mo] = r.month.split("-");
            return (
              <View key={r.id} style={S.retroBox}>
                <Text style={S.retroMonth}>{y}년 {parseInt(mo)}월</Text>
                {r.achievements && (
                  <>
                    <Text style={{ ...S.label }}>성과</Text>
                    <Text style={S.retroText}>{r.achievements.slice(0, 200)}</Text>
                  </>
                )}
                {r.learnings && (
                  <>
                    <Text style={{ ...S.label, marginTop: 4 }}>배운 것</Text>
                    <Text style={S.retroText}>{r.learnings.slice(0, 200)}</Text>
                  </>
                )}
                {r.next_goals && (
                  <>
                    <Text style={{ ...S.label, marginTop: 4 }}>다음 목표</Text>
                    <Text style={S.retroText}>{r.next_goals.slice(0, 200)}</Text>
                  </>
                )}
                {r.mentor_feedback && (
                  <>
                    <Text style={{ ...S.label, marginTop: 4, color: "#7c3aed" }}>멘토 피드백</Text>
                    <Text style={{ ...S.retroText, color: "#5b21b6" }}>{r.mentor_feedback.slice(0, 200)}</Text>
                  </>
                )}
              </View>
            );
          })}
          <Text style={S.footer} fixed>
            하나증권 인재개발실 · {new Date().toLocaleDateString("ko-KR")} 출력
          </Text>
        </Page>
      )}
    </Document>
  );
}

export default function PortfolioPDF({ user, cohort, mandalart, journals, retros, onClose }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        성장일기 <strong>{journals.length}</strong>편, 월간 회고 <strong>{retros.length}</strong>개월이 포함됩니다.
      </p>
      <PDFDownloadLink
        document={<PortfolioDoc user={user} cohort={cohort} mandalart={mandalart} journals={journals} retros={retros} />}
        fileName={`${user.displayName}_성장포트폴리오_${new Date().toISOString().slice(0, 10)}.pdf`}
        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        {({ loading }) => loading ? "PDF 생성 중..." : "PDF 다운로드"}
      </PDFDownloadLink>
      <button
        onClick={onClose}
        className="w-full py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
      >
        닫기
      </button>
    </div>
  );
}
