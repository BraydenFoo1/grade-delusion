import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { MemeGroups, type MemeGroup } from "@/components/content/Blocks";
import { pages } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const page = pages.studentMemes;

export const metadata: Metadata = pageMetadata(page);

const groups: MemeGroup[] = [
  {
    id: "procrastination",
    title: "Procrastination",
    intro: "The ancient art of doing absolutely everything except the one thing you’re supposed to do.",
    memes: [
      {
        emoji: "🧹",
        top: "Me with an essay due tomorrow:",
        bottom: "Deep-cleaning my entire room for the first time since Primary 4.",
      },
      {
        emoji: "📱",
        top: "“Just one video, then I’ll start.”",
        bottom: "Four hours later: watching a documentary about deep-sea fish.",
      },
    ],
  },
  {
    id: "exams",
    title: "Exams",
    intro: (
      <>
        Walking in with main-character energy and walking out with side-quest results. There’s a whole page of{" "}
        <a href={pages.examMemes.path}>exam memes</a> if this one hurt.
      </>
    ),
    memes: [
      { emoji: "🫡", top: "Me walking into the exam hall:", bottom: "Main-character energy. Zero chapters revised." },
      {
        emoji: "😶",
        top: "Invigilator: “You may begin.”",
        bottom: "My brain: deletes every formula like it’s clearing phone storage.",
      },
    ],
  },
  {
    id: "studying",
    title: "Studying",
    intro: (
      <>
        Ten minutes of focus, followed by a well-deserved two-hour break. More of this chaos on the{" "}
        <a href={pages.studyMemes.path}>study memes</a> page.
      </>
    ),
    memes: [
      { emoji: "🏆", top: "After studying for 10 minutes:", bottom: "Rewarding myself with a 2-hour break because I “earned it”." },
      {
        emoji: "🖍️",
        top: "Reading the same paragraph for the fifth time:",
        bottom: "Still no idea what it says. Highlighted it anyway.",
      },
    ],
  },
  {
    id: "assignments",
    title: "Assignments",
    intro: "The brief said 1,500 words. The brief did not say they had to be good words.",
    memes: [
      {
        emoji: "📄",
        top: "Me at 1,214 words out of 1,500:",
        bottom: "“In conclusion, to conclude, as a concluding conclusion…”",
      },
      { emoji: "🚗", top: "The assignment was set four weeks ago.", bottom: "I started it in the car on the way to school." },
    ],
  },
  {
    id: "group-projects",
    title: "Group projects",
    intro: "Four members. One doing the work. Three providing “moral support”.",
    memes: [
      { emoji: "👻", top: "Group member: “I’ll do my part tonight.”", bottom: "Last seen: three weeks ago." },
      {
        emoji: "🎤",
        top: "Presenting the group project:",
        bottom: "Finding out what our slides say at the same time as the teacher.",
      },
    ],
  },
  {
    id: "deadlines",
    title: "Deadlines",
    intro: "Deadlines are like mirrors in a car: closer than they appear.",
    memes: [
      { emoji: "🐌", top: "11:58pm. Deadline: 11:59pm.", bottom: "The upload bar moving at the speed of a sleepy snail." },
      { emoji: "🗓️", top: "Me: “The deadline is ages away.”", bottom: "The deadline: “Hey bestie, it’s tomorrow.”" },
    ],
  },
  {
    id: "results",
    title: "Results",
    intro: "Where academic confidence finally meets academic reality.",
    memes: [
      { emoji: "🧮", top: "Calculating my expected grade:", bottom: "Rounding every “maybe” up to full marks." },
      { emoji: "🙈", top: "Results day:", bottom: "Refreshing the portal with one eye open and both hands over my heart." },
    ],
  },
];

export default function StudentMemesPage() {
  return (
    <ContentShell
      accent="sun"
      eyebrow="Certified relatable"
      title={
        <>
          Student memes &amp; <span className="brush">academic delusions</span>
        </>
      }
      intro={
        <>
          Every stage of being a student, from “I have loads of time” to “why is the portal not loading”. No textbooks
          were opened in the making of these memes. For the full exam-season experience, see the{" "}
          <a href={pages.examDelusions.path}>10 levels of exam delusion</a>.
        </>
      }
      note="(you’re procrastinating right now. we respect it.)"
      crumbs={[{ name: page.label, path: page.path }]}
      related={[pages.examMemes, pages.studyMemes, pages.blog]}
    >
      <MemeGroups groups={groups} />
    </ContentShell>
  );
}
