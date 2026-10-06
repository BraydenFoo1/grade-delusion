import type { Metadata } from "next";
import ContentShell from "@/components/content/ContentShell";
import { ArticleBody, Byline, Callout } from "@/components/content/Blocks";
import { PUBLISHED, article, pages } from "@/lib/content";
import { articleJsonLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

const info = article("/blog/why-students-think-they-have-more-time");

export const metadata: Metadata = pageMetadata({ ...info, type: "article", publishedTime: PUBLISHED });

export default function MoreTimePage() {
  return (
    <ContentShell
      accent="mint"
      eyebrow="Procrastination · Blog"
      title={info.title}
      byline={<Byline readMinutes={info.readMinutes} />}
      intro={
        <>
          Four weeks to finish an assignment feels like forever. Then suddenly it’s 10pm the night before and you’re
          googling “how many words is a paragraph”. Why does this happen to literally everyone?
        </>
      }
      note="(you have less time than you think. including right now.)"
      crumbs={[
        { name: pages.blog.label, path: pages.blog.path },
        { name: info.title, path: info.path },
      ]}
      related={[pages.studyMemes, article("/blog/last-minute-study-guide"), pages.studentLife]}
      jsonLd={[articleJsonLd({ title: info.title, description: info.description, path: info.path, datePublished: PUBLISHED })]}
    >
      <ArticleBody>
        <h2>It has a real name: the planning fallacy</h2>
        <p>
          Good news: you’re not uniquely bad at time. In 1979, psychologists Daniel Kahneman and Amos Tversky described
          the <strong>planning fallacy</strong>, our tendency to underestimate how long a task will take, even when
          we’ve been wrong about similar tasks before. So yes, “this will only take an hour” has been scientifically
          delusional for decades.
        </p>

        <h2>Future you is a stranger with superpowers</h2>
        <p>
          When you plan, you imagine a version of yourself who wakes up early, never checks their phone and loves
          revision. That person does not exist. Present you gets the fun; future you gets the assignment, the stress and
          the 11:58pm upload. It’s the worst group project of all time, and you’re both members.
        </p>

        <h2>Deadlines look tiny from far away</h2>
        <p>
          A deadline three weeks away feels abstract, like a rumour. A deadline tomorrow feels like a truck. Nothing
          about the work changed; it just got closer. That’s why “I have ages” and “I have no time” are often the same
          deadline, viewed from different days.
        </p>

        <h2>The “quick” version in your head skips the boring bits</h2>
        <p>
          When you picture finishing an essay, you imagine typing. You don’t imagine reading the question three times,
          finding sources, fixing the formatting, the laptop update, or the snack break that becomes a nap. The real
          task is always longer than the highlight reel.
        </p>

        <h2>The group-chat confidence loop</h2>
        <p>
          Someone says “I haven’t started either”. Everyone relaxes. Nobody starts. Collective delusion is still
          delusion; it just has better company.
        </p>

        <Callout title="Okay, the serious bit" tone="bg-sun">
          <p>If you actually want to beat the planning fallacy (we believe in you, mostly):</p>
          <ul>
            <li>
              <strong>Use your history, not your hopes.</strong> If the last essay took six hours, this one will too.
            </li>
            <li>
              <strong>Set a fake deadline two days early.</strong> Then treat it like the real one.
            </li>
            <li>
              <strong>Break it into tiny pieces.</strong> “Write the intro” is easier to start than “do the essay”.
            </li>
            <li>
              <strong>Start for ten minutes.</strong> Starting is the hardest part; momentum does the rest.
            </li>
            <li>
              <strong>Tell someone your plan.</strong> A little accountability goes a long way.
            </li>
          </ul>
          <p>
            And if you want proper help planning your revision, that’s literally what{" "}
            <a href={site.gradeSolutionUrl} target="_blank" rel="noopener noreferrer">
              Grade Solution
            </a>{" "}
            does.
          </p>
        </Callout>

        <p>
          Still convinced you’ve got loads of time? Check where you sit on the{" "}
          <a href={pages.examDelusions.path}>10 levels of exam delusion</a>, or enjoy some very relatable{" "}
          <a href={pages.studyMemes.path}>study memes</a> (quickly).
        </p>
      </ArticleBody>
    </ContentShell>
  );
}
