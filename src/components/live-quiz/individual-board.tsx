import { type IndividualSummary, type PersonRow, personLabel } from "@/lib/live-quiz";

type Size = "phone" | "screen" | "admin";

function chipClass(size: Size, mine: boolean) {
  if (size === "screen") return `rounded-full px-5 py-2 text-3xl ${mine ? "bg-emerald-400 font-black text-zinc-950" : "bg-white/10 text-white"}`;
  if (size === "admin") return `rounded-full px-3 py-1 text-sm ${mine ? "bg-emerald-100 font-semibold text-emerald-800" : "bg-gray-100 text-gray-700"}`;
  return `rounded-full px-3 py-1.5 text-base ${mine ? "bg-emerald-100 font-semibold text-emerald-800" : "bg-gray-100 text-gray-800"}`;
}

export function PeopleChips({ people, size = "phone", mine = "" }: { people: PersonRow[]; size?: Size; mine?: string }) {
  return (
    <ul className={`flex flex-wrap ${size === "screen" ? "gap-3" : "gap-2"}`}>
      {people.map((person, index) => (
        <li key={`${index}-${person.teamName}-${person.nickname}`} className={chipClass(size, Boolean(mine) && person.nickname === mine)}>
          {personLabel(person)}
          <span className={size === "screen" ? "ml-2 text-xl text-white/60" : "ml-1.5 text-xs text-gray-400"}>{person.teamName}</span>
        </li>
      ))}
    </ul>
  );
}

/** 개인전 문제의 정답자 명단. */
export function RoundWinnersPanel({ people, size = "phone", mine = "" }: { people: PersonRow[]; size?: Size; mine?: string }) {
  const screen = size === "screen";
  return (
    <section className={size === "admin" ? "mt-4" : screen ? "mt-8" : "mt-6"}>
      <p className={screen ? "text-4xl font-black text-amber-300" : size === "admin" ? "text-sm font-semibold text-gray-800" : "text-xl font-black"}>
        개인전 정답자 {people.length}명
      </p>
      <div className="mt-3">
        {people.length > 0 ? (
          <PeopleChips people={people} size={size} mine={mine} />
        ) : (
          <p className={screen ? "text-3xl text-white/70" : "text-base text-gray-500"}>맞힌 사람이 없습니다</p>
        )}
      </div>
    </section>
  );
}

/** 마지막 화면에서 조별 점수 옆에 두는 개인전 결과. */
export function IndividualFinalPanel({ summary, size = "phone", mine = "" }: { summary: IndividualSummary; size?: Size; mine?: string }) {
  const screen = size === "screen";
  const perfect = summary.perfect.length > 0;
  return (
    <section className={screen ? "rounded-3xl bg-white/5 p-8" : "rounded-2xl bg-white p-4 shadow-sm"}>
      <h2 className={screen ? "text-4xl font-black text-amber-300" : "text-xl font-black"}>
        {summary.rounds === 1 ? "개인전" : `개인전 ${summary.rounds}문제`} {perfect ? "모두 맞힌 사람" : "결과"}
      </h2>
      <div className="mt-4">
        {perfect ? (
          <PeopleChips people={summary.perfect} size={size} mine={mine} />
        ) : summary.topCorrect > 0 ? (
          <>
            <p className={screen ? "mb-4 text-2xl text-white/70" : "mb-2 text-sm text-gray-500"}>
              모두 맞힌 사람이 없습니다. 가장 많이 맞힌 사람은 {summary.topCorrect}/{summary.rounds}문제입니다.
            </p>
            <PeopleChips people={summary.top} size={size} mine={mine} />
          </>
        ) : (
          <p className={screen ? "text-3xl text-white/70" : "text-base text-gray-500"}>맞힌 사람이 없습니다</p>
        )}
      </div>
    </section>
  );
}
