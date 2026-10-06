import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { MemeGroups, type MemeGroup } from "@/components/content/Blocks";
import { article, pages } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const page = pages.studyMemes;
const guide = article("/blog/last-minute-study-guide");
const moreTime = article("/blog/why-students-think-they-have-more-time");

export const metadata: Metadata = pageMetadata(page);

const groups: MemeGroup[] = [
  {
    id: "fake-productivity",
    title: "Fake productivity",
    intro: "Looking busy is a skill. Being busy is a different, harder skill.",
    memes: [
      {
        emoji: "🖥️",
        top: "Opening my laptop to study:",
        bottom: "Rearranging my desktop icons by colour. Productive? Spiritually.",
      },
      { emoji: "🗂️", top: "Studying with 14 tabs open:", bottom: "One of them is the notes. Thirteen are “research”." },
    ],
  },
  {
    id: "study-schedules",
    title: "Making study schedules",
    intro: "The timetable is a work of art. Following it is a work of fiction.",
    memes: [
      { emoji: "🎨", top: "Making a study timetable:", bottom: "Three hours. Four colours. Zero studying. Peak achievement." },
      { emoji: "🕡", top: "Timetable: “Biology, 4–6pm.”", bottom: "It is 6:42pm. The timetable is now decorative." },
    ],
  },
  {
    id: "reorganising-notes",
    title: "Reorganising notes instead of studying",
    intro: "If the notes look clean enough, maybe the knowledge will move in by itself.",
    memes: [
      {
        emoji: "✍️",
        top: "Instead of revising:",
        bottom: "Rewriting all my notes in nicer handwriting. Absorbing nothing, beautifully.",
      },
      { emoji: "🖊️", top: "When new highlighters arrive:", bottom: "Must restart ALL notes with the new colour system." },
    ],
  },
  {
    id: "studying-at-2am",
    title: "Studying at 2am",
    intro: "The brain finally wakes up exactly when the body needs to sleep.",
    memes: [
      {
        emoji: "🌌",
        top: "2am revision:",
        bottom: "Understanding calculus? No. Understanding the meaning of life? Briefly, yes.",
      },
      {
        emoji: "⏰",
        top: "Me at 2am:",
        bottom: "“If I sleep now I get four hours… if I sleep now I get three hours…”",
      },
    ],
  },
  {
    id: "start-tomorrow",
    title: "“I’ll start tomorrow”",
    intro: (
      <>
        The most powerful sentence in the student language. There’s real science behind it, explained in{" "}
        <a href={moreTime.path}>why students always think they have more time</a>.
      </>
    ),
    memes: [
      { emoji: "🔁", top: "Monday me:", bottom: "“Fresh start on Tuesday.”" },
      { emoji: "🫥", top: "Me: “I’ll start tomorrow.”", bottom: "Tomorrow me: “Who said that? Not me.”" },
    ],
  },
];

export default function StudyMemesPage() {
  return (
    <ContentShell
      accent="volt"
      eyebrow="Productivity (allegedly)"
      title={
        <>
          Funny study memes &amp; <span className="brush">study delusions</span>
        </>
      }
      intro={
        <>
          For students who spent longer making the study plan than studying. If the exam is tomorrow, the{" "}
          <a href={guide.path}>last-minute study guide</a> might help (the second half, anyway).
        </>
      }
      note="(reading this counts as a study break. you’re welcome.)"
      crumbs={[{ name: page.label, path: page.path }]}
      related={[pages.studentLife, guide, pages.blog]}
    >
      <MemeGroups groups={groups} />
    </ContentShell>
  );
}
