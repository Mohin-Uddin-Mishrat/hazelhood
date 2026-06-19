"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiEdit3,
  FiEye,
  FiHeart,
  FiHome,
  FiMoon,
  FiPlus,
  FiSave,
  FiShield,
  FiSmartphone,
  FiTrash2,
} from "react-icons/fi";

type Entry = {
  id: string;
  date: string;
  prayers: number;
  expense: number;
  studyHours: number;
  mobileHours: number;
  addaHours: number;
  masturbated: boolean;
  didWrong: boolean;
  wrongNote: string;
  note: string;
};

type View = "input" | "records";
type RecordFilter = "month" | "year" | "all";

type Summary = {
  days: number;
  prayers: number;
  expense: number;
  studyHours: number;
  mobileHours: number;
  addaHours: number;
  cleanDays: number;
  wrongDays: number;
};

const storageKey = "daily-accountability-entries";

const today = () => new Date().toISOString().slice(0, 10);

const defaultForm = (): Omit<Entry, "id"> => ({
  date: today(),
  prayers: 0,
  expense: 0,
  studyHours: 0,
  mobileHours: 0,
  addaHours: 0,
  masturbated: false,
  didWrong: false,
  wrongNote: "",
  note: "",
});

function readEntriesFromStorage() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Entry[]) : [];
  } catch {
    return [];
  }
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00`));
}

function summarize(entries: Entry[]): Summary {
  return entries.reduce(
    (acc, entry) => ({
      days: acc.days + 1,
      prayers: acc.prayers + entry.prayers,
      expense: acc.expense + entry.expense,
      studyHours: acc.studyHours + entry.studyHours,
      mobileHours: acc.mobileHours + entry.mobileHours,
      addaHours: acc.addaHours + entry.addaHours,
      cleanDays: acc.cleanDays + (entry.masturbated ? 0 : 1),
      wrongDays: acc.wrongDays + (entry.didWrong ? 1 : 0),
    }),
    {
      days: 0,
      prayers: 0,
      expense: 0,
      studyHours: 0,
      mobileHours: 0,
      addaHours: 0,
      cleanDays: 0,
      wrongDays: 0,
    },
  );
}

function average(total: number, days: number) {
  return days ? (total / days).toFixed(1) : "0";
}

export default function Home() {
  const [view, setView] = useState<View>("input");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [hydrated, setHydrated] = useState(false);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("month");
  const [selectedMonth, setSelectedMonth] = useState(today().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(today().slice(0, 4));

  useEffect(() => {
    queueMicrotask(() => {
      const storedEntries = readEntriesFromStorage();
      setEntries(storedEntries);
      setHydrated(true);
    });
  }, []);

  function persistEntries(nextEntries: Entry[]) {
    setEntries(nextEntries);
    window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
  }

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  );

  const monthOptions = useMemo(() => {
    const months = new Set(sortedEntries.map((entry) => entry.date.slice(0, 7)));
    months.add(selectedMonth);
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [selectedMonth, sortedEntries]);

  const yearOptions = useMemo(() => {
    const years = new Set(sortedEntries.map((entry) => entry.date.slice(0, 4)));
    years.add(selectedYear);
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [selectedYear, sortedEntries]);

  const filteredEntries = useMemo(() => {
    if (recordFilter === "month") {
      return sortedEntries.filter((entry) => entry.date.startsWith(selectedMonth));
    }

    if (recordFilter === "year") {
      return sortedEntries.filter((entry) => entry.date.startsWith(selectedYear));
    }

    return sortedEntries;
  }, [recordFilter, selectedMonth, selectedYear, sortedEntries]);

  const totals = useMemo(() => summarize(filteredEntries), [filteredEntries]);

  const yearlyBreakdown = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
      const monthEntries = sortedEntries.filter((entry) =>
        entry.date.startsWith(month),
      );

      return {
        month,
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(
          new Date(`${month}-01T00:00:00`),
        ),
        summary: summarize(monthEntries),
      };
    });
  }, [selectedYear, sortedEntries]);

  const groupedRecords = useMemo(() => {
    return filteredEntries.reduce<Record<string, Entry[]>>((groups, entry) => {
      const label = monthLabel(entry.date.slice(0, 7));
      groups[label] = groups[label] ? [...groups[label], entry] : [entry];
      return groups;
    }, {});
  }, [filteredEntries]);

  function updateField<T extends keyof Omit<Entry, "id">>(
    field: T,
    value: Omit<Entry, "id">[T],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newEntry: Entry = {
      id: crypto.randomUUID(),
      ...form,
      wrongNote: form.didWrong ? form.wrongNote : "",
    };

    const nextEntries = [
      newEntry,
      ...entries.filter((entry) => entry.date !== newEntry.date),
    ].sort((a, b) => b.date.localeCompare(a.date));

    persistEntries(nextEntries);
    setSelectedMonth(newEntry.date.slice(0, 7));
    setSelectedYear(newEntry.date.slice(0, 4));
    setRecordFilter("month");
    setForm(defaultForm());
    setView("records");
  }

  function clearEntries() {
    persistEntries([]);
  }

  function editEntry(entry: Entry) {
    setForm({
      date: entry.date,
      prayers: entry.prayers,
      expense: entry.expense,
      studyHours: entry.studyHours,
      mobileHours: entry.mobileHours,
      addaHours: entry.addaHours,
      masturbated: entry.masturbated,
      didWrong: entry.didWrong,
      wrongNote: entry.wrongNote,
      note: entry.note,
    });
    setView("input");
  }

  const filterTitle =
    recordFilter === "month"
      ? monthLabel(selectedMonth)
      : recordFilter === "year"
        ? selectedYear
        : "All records";

  return (
    <main className="min-h-screen bg-[#f5f7f2] text-[#17211b]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-7 bg-[#17211b] p-5 text-[#f8fbef] sm:p-7">
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#d7ff63] text-2xl text-[#17211b]">
              <FiShield />
            </span>
            <div>
              <p className="mb-1 text-xs font-extrabold uppercase text-[#b9c7b9]">
                Daily
              </p>
              <h1 className="text-xl font-black leading-none">Accountability</h1>
            </div>
          </div>

          <nav className="grid gap-2.5" aria-label="Dashboard navigation">
            <TabButton active={view === "input"} onClick={() => setView("input")}>
              <FiPlus />
              Input Activity
            </TabButton>
            <TabButton active={view === "records"} onClick={() => setView("records")}>
              <FiCalendar />
              Month & Year Record
            </TabButton>
          </nav>

          <div className="mt-auto flex items-start gap-3 rounded-lg border border-[#405342] bg-[#26362c] p-4 leading-relaxed text-[#cbd7ca]">
            <FiEye className="mt-1 shrink-0" />
            <p>Your activity data is saved in browser localStorage on this device.</p>
          </div>
        </aside>

        <section className="flex flex-col gap-6 p-5 sm:p-7">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-1 text-xs font-extrabold uppercase text-[#667366]">
                Personal dashboard
              </p>
              <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-7xl">
                {view === "input" ? "Track today with honesty" : "Review your progress"}
              </h2>
            </div>
            <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#dfe8d8] bg-white px-4 font-extrabold text-[#2b3b30]">
              <FiMoon />
              {new Intl.DateTimeFormat("en", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }).format(new Date())}
            </div>
          </header>

          <section
            className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Filtered overview"
          >
            <Metric icon={<FiCheckCircle />} label="Prayer" value={`${totals.prayers}`} note={filterTitle} />
            <Metric icon={<FiBookOpen />} label="Study" value={`${totals.studyHours}h`} note="focused time" />
            <Metric icon={<FiDollarSign />} label="Expense" value={`BDT ${totals.expense}`} note="tracked spend" />
            <Metric icon={<FiHeart />} label="Clean days" value={`${totals.cleanDays}`} note="self-control" />
          </section>

          {view === "input" ? (
            <form
              className="grid gap-5 rounded-lg border border-[#dfe8d8] bg-white p-5 shadow-[0_22px_70px_rgba(23,33,27,0.08)] sm:p-6"
              onSubmit={saveEntry}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-extrabold uppercase text-[#667366]">
                    Daily input
                  </p>
                  <h3 className="text-2xl font-black leading-tight">What happened today?</h3>
                </div>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#17211b] px-5 font-extrabold text-white transition hover:-translate-y-0.5"
                  type="submit"
                >
                  <FiSave />
                  Save Day
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Date" icon={<FiCalendar />}>
                  <input
                    className={inputClass}
                    type="date"
                    value={form.date}
                    onChange={(event) => updateField("date", event.target.value)}
                    required
                  />
                </Field>
                <Field label="Salah prayed" icon={<FiHome />}>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="5"
                    value={form.prayers}
                    onChange={(event) => updateField("prayers", Number(event.target.value))}
                  />
                </Field>
                <Field label="Expense" icon={<FiDollarSign />}>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    value={form.expense}
                    onChange={(event) => updateField("expense", Number(event.target.value))}
                  />
                </Field>
                <Field label="Study hours" icon={<FiBookOpen />}>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.25"
                    value={form.studyHours}
                    onChange={(event) => updateField("studyHours", Number(event.target.value))}
                  />
                </Field>
                <Field label="Mobile hours" icon={<FiSmartphone />}>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.25"
                    value={form.mobileHours}
                    onChange={(event) => updateField("mobileHours", Number(event.target.value))}
                  />
                </Field>
                <Field label="Adda hours" icon={<FiClock />}>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.25"
                    value={form.addaHours}
                    onChange={(event) => updateField("addaHours", Number(event.target.value))}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <ChoiceCard checked={form.masturbated} tone="warning">
                  <input
                    className="h-4.5 w-4.5 accent-[#17211b]"
                    type="checkbox"
                    checked={form.masturbated}
                    onChange={(event) => updateField("masturbated", event.target.checked)}
                  />
                  <FiActivity />
                  Masturbated today
                </ChoiceCard>
                <ChoiceCard checked={form.didWrong}>
                  <input
                    className="h-4.5 w-4.5 accent-[#17211b]"
                    type="checkbox"
                    checked={form.didWrong}
                    onChange={(event) => updateField("didWrong", event.target.checked)}
                  />
                  <FiEdit3 />
                  Did something wrong
                </ChoiceCard>
              </div>

              {form.didWrong && (
                <Field label="What went wrong?" icon={<FiEdit3 />}>
                  <textarea
                    className={textareaClass}
                    value={form.wrongNote}
                    onChange={(event) => updateField("wrongNote", event.target.value)}
                    placeholder="Write the truth briefly, then move forward."
                  />
                </Field>
              )}

              <Field label="Daily note" icon={<FiEdit3 />}>
                <textarea
                  className={textareaClass}
                  value={form.note}
                  onChange={(event) => updateField("note", event.target.value)}
                  placeholder="Wins, lessons, dua, plan for tomorrow..."
                />
              </Field>
            </form>
          ) : (
            <section className="grid gap-5 rounded-lg border border-[#dfe8d8] bg-white p-5 shadow-[0_22px_70px_rgba(23,33,27,0.08)] sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="mb-1 text-xs font-extrabold uppercase text-[#667366]">
                    LocalStorage history
                  </p>
                  <h3 className="text-2xl font-black leading-tight">
                    {filterTitle}
                  </h3>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="grid grid-cols-3 rounded-lg border border-[#dfe8d8] bg-[#f8faf5] p-1">
                    {(["month", "year", "all"] as RecordFilter[]).map((filter) => (
                      <button
                        className={`rounded-md px-3 py-2 text-sm font-extrabold capitalize transition ${
                          recordFilter === filter
                            ? "bg-[#17211b] text-white"
                            : "text-[#526052] hover:bg-white"
                        }`}
                        key={filter}
                        onClick={() => setRecordFilter(filter)}
                        type="button"
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  {recordFilter === "month" && (
                    <select
                      className={selectClass}
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(event.target.value)}
                    >
                      {monthOptions.map((month) => (
                        <option key={month} value={month}>
                          {monthLabel(month)}
                        </option>
                      ))}
                    </select>
                  )}

                  {recordFilter === "year" && (
                    <select
                      className={selectClass}
                      value={selectedYear}
                      onChange={(event) => setSelectedYear(event.target.value)}
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#dfe8d8] bg-[#f5f7f2] px-4 font-extrabold text-[#344536] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                    onClick={clearEntries}
                    type="button"
                    disabled={!entries.length}
                  >
                    <FiTrash2 />
                    Clear
                  </button>
                </div>
              </div>

              {!hydrated ? (
                <EmptyState title="Loading records" text="Reading saved activity from localStorage." />
              ) : filteredEntries.length ? (
                <div className="grid gap-6">
                  <section className="grid gap-4 rounded-lg border border-[#dfe8d8] bg-[#f8faf5] p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-extrabold uppercase text-[#667366]">
                          {recordFilter === "month"
                            ? "Monthly tracking"
                            : recordFilter === "year"
                              ? "Yearly tracking"
                              : "All-time tracking"}
                        </p>
                        <h4 className="text-xl font-black">{filterTitle} summary</h4>
                      </div>
                      <p className="font-bold text-[#667366]">
                        {totals.days} tracked {totals.days === 1 ? "day" : "days"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <TrackBox label="Avg salah/day" value={average(totals.prayers, totals.days)} />
                      <TrackBox label="Avg study/day" value={`${average(totals.studyHours, totals.days)}h`} />
                      <TrackBox label="Avg mobile/day" value={`${average(totals.mobileHours, totals.days)}h`} />
                      <TrackBox label="Wrong days" value={`${totals.wrongDays}`} />
                      <TrackBox label="Total adda" value={`${totals.addaHours}h`} />
                      <TrackBox label="Total expense" value={`BDT ${totals.expense}`} />
                      <TrackBox label="Clean days" value={`${totals.cleanDays}/${totals.days}`} />
                      <TrackBox label="Total prayers" value={`${totals.prayers}`} />
                    </div>
                  </section>

                  {recordFilter === "year" && (
                    <section className="grid gap-3 rounded-lg border border-[#dfe8d8] bg-[#f8faf5] p-4">
                      <div>
                        <p className="text-xs font-extrabold uppercase text-[#667366]">
                          Month by month
                        </p>
                        <h4 className="text-xl font-black">{selectedYear} tracker</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left">
                          <thead className="text-sm text-[#667366]">
                            <tr>
                              <th className="px-3 py-2">Month</th>
                              <th className="px-3 py-2">Days</th>
                              <th className="px-3 py-2">Prayer</th>
                              <th className="px-3 py-2">Study</th>
                              <th className="px-3 py-2">Expense</th>
                              <th className="px-3 py-2">Mobile</th>
                              <th className="px-3 py-2">Clean</th>
                              <th className="px-3 py-2">Wrong</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yearlyBreakdown.map(({ label, month, summary }) => (
                              <tr className="bg-white font-bold text-[#344536]" key={month}>
                                <td className="rounded-l-lg border-y border-l border-[#e4ebdf] px-3 py-3">
                                  {label}
                                </td>
                                <td className="border-y border-[#e4ebdf] px-3 py-3">{summary.days}</td>
                                <td className="border-y border-[#e4ebdf] px-3 py-3">{summary.prayers}</td>
                                <td className="border-y border-[#e4ebdf] px-3 py-3">{summary.studyHours}h</td>
                                <td className="border-y border-[#e4ebdf] px-3 py-3">BDT {summary.expense}</td>
                                <td className="border-y border-[#e4ebdf] px-3 py-3">{summary.mobileHours}h</td>
                                <td className="border-y border-[#e4ebdf] px-3 py-3">{summary.cleanDays}</td>
                                <td className="rounded-r-lg border-y border-r border-[#e4ebdf] px-3 py-3">
                                  {summary.wrongDays}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {Object.entries(groupedRecords).map(([label, records]) => (
                    <div className="grid gap-3" key={label}>
                      <h4 className="text-lg font-black">{label}</h4>
                      <div className="grid gap-3">
                        {records.map((entry) => (
                          <article
                            className="grid gap-3 rounded-lg border border-[#dfe8d8] bg-[#f8faf5] p-4"
                            key={entry.id}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <strong>{entry.date}</strong>
                              <button
                                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#dfe8d8] bg-white px-3 font-extrabold text-[#344536] transition hover:-translate-y-0.5"
                                type="button"
                                onClick={() => editEntry(entry)}
                              >
                                <FiEdit3 />
                                Edit
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <RecordPill>{entry.prayers}/5 salah</RecordPill>
                              <RecordPill>BDT {entry.expense}</RecordPill>
                              <RecordPill>{entry.studyHours}h study</RecordPill>
                              <RecordPill>{entry.mobileHours}h mobile</RecordPill>
                              <RecordPill>{entry.addaHours}h adda</RecordPill>
                              <RecordPill>
                                {entry.masturbated ? "Reset day" : "Clean day"}
                              </RecordPill>
                            </div>
                            {(entry.didWrong || entry.note) && (
                              <p className="leading-relaxed text-[#526052]">
                                {entry.didWrong ? `Wrong: ${entry.wrongNote || "Noted"}. ` : ""}
                                {entry.note}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No records found"
                  text="Save a day or change the month/year filter to see your localStorage records."
                />
              )}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

const inputClass =
  "min-h-12 w-full rounded-lg border border-[#dfe8d8] bg-[#f8faf5] px-3.5 py-3 text-[#17211b] outline-none transition focus:border-[#86a42c] focus:ring-4 focus:ring-[#86a42c]/15";

const textareaClass = `${inputClass} min-h-28 resize-y`;

const selectClass =
  "min-h-11 rounded-lg border border-[#dfe8d8] bg-white px-3.5 font-bold text-[#344536] outline-none focus:border-[#86a42c] focus:ring-4 focus:ring-[#86a42c]/15";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3.5 py-3 text-left font-extrabold transition ${
        active
          ? "bg-[#edf8d0] text-[#17211b]"
          : "text-[#d8e0d6] hover:bg-[#edf8d0] hover:text-[#17211b]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="flex min-h-32 items-center gap-3.5 rounded-lg border border-[#dfe8d8] bg-white p-4 shadow-[0_22px_70px_rgba(23,33,27,0.08)]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#eff7e5] text-[22px] text-[#557415]">
        {icon}
      </span>
      <div>
        <p className="text-sm text-[#667366]">{label}</p>
        <strong className="my-1 block text-3xl leading-none text-[#17211b]">
          {value}
        </strong>
        <small className="block text-[#667366]">{note}</small>
      </div>
    </article>
  );
}

function Field({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="inline-flex items-center gap-2 text-sm font-extrabold text-[#435045]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function ChoiceCard({
  checked,
  children,
  tone = "default",
}: {
  checked: boolean;
  children: ReactNode;
  tone?: "default" | "warning";
}) {
  const selectedClass =
    tone === "warning"
      ? "border-[#e8aa7a] bg-[#fff1e7]"
      : "border-[#b6d45b] bg-[#edf8d0]";

  return (
    <label
      className={`flex min-h-16 items-center gap-3 rounded-lg border p-4 font-extrabold text-[#344536] transition ${
        checked ? selectedClass : "border-[#dfe8d8] bg-[#f8faf5]"
      }`}
    >
      {children}
    </label>
  );
}

function RecordPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg border border-[#e4ebdf] bg-white px-2.5 py-2 text-sm font-bold text-[#435045]">
      {children}
    </span>
  );
}

function TrackBox({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#e4ebdf] bg-white p-4">
      <p className="text-sm font-bold text-[#667366]">{label}</p>
      <strong className="mt-1 block text-2xl font-black text-[#17211b]">
        {value}
      </strong>
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-64 justify-items-center gap-2.5 text-center text-[#667366]">
      <FiCalendar className="self-end text-4xl text-[#86a42c]" />
      <h4 className="text-lg font-black text-[#17211b]">{title}</h4>
      <p className="max-w-md">{text}</p>
    </div>
  );
}
