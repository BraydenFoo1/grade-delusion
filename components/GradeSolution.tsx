import Reveal from "./ui/Reveal";
import { Eyebrow } from "./ui/Doodles";
import { site } from "@/lib/site";

const rows = [
  ["Improves your grades", "Predicts your grades (wrongly)"],
  ["Proper study plans", "“I'll start tomorrow” plans"],
  ["Real tutors", "Real memes"],
  ["Fixes the problem", "Is the problem"],
];

export default function GradeSolution() {
  return (
    <section id="about" aria-labelledby="about-title" className="bg-paper py-24 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <Eyebrow n="06">the fine print</Eyebrow>
          <h2 id="about-title" className="font-display text-[clamp(2.4rem,6vw,4.25rem)] uppercase leading-[0.92]">
            Yes, we have a serious{" "}
            <span className="inline-block -rotate-6 align-middle font-hand text-[0.45em] normal-case leading-none text-hot">
              (sort of)
            </span>{" "}
            side.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed">
            Grade Delusion is a fun brand created by <b>Grade Solution</b> — because every student needs both academic
            support and a little humour.
          </p>
          <a
            href={site.gradeSolutionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-btn mt-8 bg-mint"
          >
            Visit Grade Solution <span aria-hidden>↗</span>
          </a>
        </Reveal>

        <Reveal delay={150}>
          <table className="w-full -rotate-1 overflow-hidden rounded-3xl border-[3px] border-ink bg-paper text-left shadow-[8px_8px_0_var(--ink)] [border-collapse:separate] [border-spacing:0]">
            <caption className="sr-only">Grade Solution versus Grade Delusion</caption>
            <thead>
              <tr className="font-display text-base uppercase tracking-wide sm:text-xl">
                <th scope="col" className="w-1/2 border-b-[3px] border-r-[3px] border-ink bg-mint p-4">
                  Grade Solution
                </th>
                <th scope="col" className="w-1/2 border-b-[3px] border-ink bg-sun p-4">
                  Grade Delusion™
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([a, b], i) => (
                <tr key={a} className="text-sm font-medium sm:text-base">
                  <td className={`border-r-[3px] border-ink p-4 ${i < rows.length - 1 ? "border-b-2 border-b-ink/15" : ""}`}>
                    {a}
                  </td>
                  <td className={`p-4 font-hand text-xl leading-tight sm:text-2xl ${i < rows.length - 1 ? "border-b-2 border-b-ink/15" : ""}`}>
                    {b}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 text-center font-hand text-2xl">you need both. trust us.</p>
        </Reveal>
      </div>
    </section>
  );
}
