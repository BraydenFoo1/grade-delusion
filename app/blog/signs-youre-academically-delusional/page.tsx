import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { ArticleBody, Byline, Callout } from "@/components/content/Blocks";
import { PUBLISHED, article, pages } from "@/lib/content";
import { articleJsonLd, pageMetadata } from "@/lib/seo";

const info = article("/blog/signs-youre-academically-delusional");

export const metadata: Metadata = pageMetadata({ ...info, type: "article", publishedTime: PUBLISHED });

const signs = [
  ["Your study timetable is more detailed than your studying.", "Colour-coded, laminated, beautiful. Untouched since Tuesday."],
  ["You count highlighting as active learning.", "The page is now entirely yellow. The knowledge remains outside your body."],
  ["You’ve predicted the exam questions.", "With total confidence. Based on nothing."],
  ["“I’ll remember it” is your entire note-taking strategy.", "You did not remember it."],
  ["You’ve calculated exactly how many marks you can lose and still get an A.", "This took longer than the revision would have."],
  ["You believe the first half of the syllabus “won’t come out”.", "The first half of the syllabus is coming out."],
  ["You “work better under pressure”.", "You have never once worked without pressure, so there’s no control group."],
  ["You bought new stationery instead of opening the old textbook.", "The textbook still has the shop sticker on it."],
  ["You think a video at 2x speed counts as two lessons.", "Efficiency, but make it delusional."],
  ["You’ve described chemistry as “basically common sense”.", "Chemistry has never been common sense. For anyone."],
  ["Your revision playlist took longer to make than your revision.", "But the transitions are perfect."],
  ["You’re waiting for motivation like it’s a bus.", "It’s not coming. It was never coming."],
  ["You trust a screenshot from the group chat more than the syllabus.", "Source: someone’s cousin, probably."],
  ["You’ve told people you “nailed it” before the results came out.", "The results are about to have a word with you."],
  ["You think the bell curve is your personal guardian angel.", "The bell curve does not know who you are."],
  ["You plan to cram the whole thing in one night. Every single time.", "And every single time, you’re surprised."],
  ["You’ve reorganised your notes three times this week.", "You haven’t read them once."],
  ["You genuinely believe this time will be different.", "Respect. Optimism is free."],
  ["You think sleep is optional but naps are essential.", "Your body clock has filed a complaint."],
  ["You read this entire list instead of studying.", "Same, honestly. Welcome home."],
];

export default function AcademicallyDelusionalPage() {
  return (
    <ContentShell
      accent="sun"
      eyebrow="Delusion · Blog"
      title={info.title}
      byline={<Byline readMinutes={info.readMinutes} />}
      intro={
        <>
          Academic delusion is the belief that you’re more prepared than you actually are. It’s extremely common,
          completely harmless (until results day) and, frankly, a little bit inspiring. Here’s how to spot it.
        </>
      }
      note="(scoring 20/20 here is not the flex you think it is.)"
      crumbs={[
        { name: pages.blog.label, path: pages.blog.path },
        { name: info.title, path: info.path },
      ]}
      related={[pages.examDelusions, pages.studyMemes, article("/blog/why-students-think-they-have-more-time")]}
      jsonLd={[articleJsonLd({ title: info.title, description: info.description, path: info.path, datePublished: PUBLISHED })]}
    >
      <ArticleBody>
        <ol role="list" className="!list-none !pl-0 space-y-8">
          {signs.map(([sign, line], i) => (
            <li key={sign} className="flex items-start gap-4">
              <span
                className="grid size-12 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-sun font-display text-xl"
                aria-hidden
              >
                {i + 1}
              </span>
              <div>
                <h2 className="!mt-0 !text-[clamp(1.25rem,3vw,1.6rem)] !leading-tight">
                  <span className="sr-only">{i + 1}. </span>
                  {sign}
                </h2>
                <p className="!mt-1 font-hand text-xl leading-snug">{line}</p>
              </div>
            </li>
          ))}
        </ol>
        <Callout title="Your score" tone="bg-mint">
          <p>
            <strong>0–5:</strong> Suspiciously realistic. <strong>6–12:</strong> Healthily hopeful.{" "}
            <strong>13–19:</strong> Certified delusional. <strong>20:</strong> You are the reason this website exists.
          </p>
        </Callout>
        <p>
          Want a more precise diagnosis? Climb the <a href={pages.examDelusions.path}>10 levels of exam delusion</a>, or
          take the official <a href="/#test">delusion test</a> on the homepage.
        </p>
      </ArticleBody>
    </ContentShell>
  );
}
