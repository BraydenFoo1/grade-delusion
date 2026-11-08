import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { isPublicBeta } from "@/lib/platform/mode";
import { business, legal, site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "The rules for using Grade Delusion, joining the community and sending us memes.",
  path: legal.terms,
});

// Draft public-beta wording (see legal.betaWordingApproved): hidden until it has been reviewed.
const showBeta = () => legal.betaWordingApproved && isPublicBeta();

const contact = <a href={`mailto:${business.dpoEmail}`}>{business.dpoEmail}</a>;

const fonts = [
  { name: "Anton", by: "The Anton Project Authors", license: "SIL Open Font License 1.1", file: "/licenses/Anton-OFL.txt" },
  { name: "Caveat", by: "The Caveat Project Authors", license: "SIL Open Font License 1.1", file: "/licenses/Caveat-OFL.txt" },
  {
    name: "Space Grotesk",
    by: "The Space Grotesk Project Authors",
    license: "SIL Open Font License 1.1",
    file: "/licenses/SpaceGrotesk-OFL.txt",
  },
  { name: "Permanent Marker", by: "Font Diner", license: "Apache License 2.0", file: "/licenses/PermanentMarker-Apache-2.0.txt" },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={
        <>
          {showBeta() ? (
            <>
              <strong>Public beta.</strong> Accounts and community participation (section 5) are not available during the public beta;
              those terms apply only if and when they open.{" "}
            </>
          ) : null}
          The rules for using Grade Delusion™ and sending us your memes. By using this website, you agree to these
          terms.
        </>
      }
      summary={
        <ul>
          <li>Everything here is a joke. None of it is real academic, medical or professional advice.</li>
          <li>Share our memes with friends, but don&apos;t pass them off as your own or use them commercially.</li>
          <li>
            If you send us a meme, it must be yours, it must be kind, and we can post it. You can ask us to take it down
            any time.
          </li>
          <li>
            Community accounts are for people aged 13 and over. Under 13? Don&apos;t sign up, and get a parent or
            guardian&apos;s OK before emailing us anything.
          </li>
          <li>
            Posts in the community are read by a moderator first. Be kind, and don&apos;t share personal details. We
            can remove content and suspend accounts that break the rules.
          </li>
        </ul>
      }
    >
      <h2 id="about">1. About these terms</h2>
      <p>
        Grade Delusion™ is a humour brand run by {business.legalName}
        {business.uen && <> (UEN {business.uen})</>}, {business.country} (&quot;we&quot;, &quot;us&quot;). These terms
        apply to this website. Our <a href={legal.privacy}>Privacy Policy</a> explains how we handle personal data.
      </p>

      <h2 id="its-a-joke">2. It&apos;s satire</h2>
      <p>
        Everything on Grade Delusion™ is for entertainment. The delusion test, delusion levels, &quot;delusion
        ratings&quot;, the Delusion Generator and every meme are jokes. Results are random or made up for fun and say
        nothing real about you, your abilities or your grades.
      </p>
      <p>
        Phrases like &quot;clinically confident&quot; are jokes, not diagnoses. Nothing here is academic, medical,
        psychological or professional advice. If you&apos;re genuinely stressed about school, please talk to a teacher,
        school counsellor, parent or someone you trust. For actual study help, visit{" "}
        <a href={site.gradeSolutionUrl} target="_blank" rel="noopener noreferrer">
          Grade Solution
        </a>
        .
      </p>
      <p>
        The meme posts on the home page are examples written by us, and the reaction buttons there only show your own
        taps; they aren&apos;t real engagement numbers. Posts in the community are written by members, not by us.
      </p>

      <h2 id="our-content">3. Our content</h2>
      <p>
        The text, memes, illustrations, design and the Grade Delusion™ name and logo belong to Grade Delusion. You
        may share links and screenshots for personal, non-commercial use, as long as you don&apos;t edit them to mislead
        anyone and you credit Grade Delusion™ ({site.handle}). Please don&apos;t reuse our content commercially, sell it,
        or present it as your own without our written permission. If we forsee any of these, we would not hesitate to take legal action.
      </p>

      <h2 id="submissions">4. Submission rules</h2>
      <p>
        When you email us a meme, idea or other content (a &quot;submission&quot;), you confirm and agree to the
        following:
      </p>
      <ul>
        <li>
          <strong>It&apos;s yours.</strong> You made it, or you have permission from whoever did.
        </li>
        <li>
          <strong>It respects other people.</strong> It doesn&apos;t include anyone else&apos;s name, face, school
          details, private messages or other personal data without their permission, and it doesn&apos;t target,
          bully or embarrass a real student, teacher or school.
        </li>
        <li>
          <strong>It&apos;s appropriate.</strong> Nothing hateful, sexual, violent, illegal or defamatory.
        </li>
        <li>
          <strong>Permission to post.</strong> You give us a free, non-exclusive permission to post, crop, caption and
          share your submission on our website and social media. You keep ownership of it.
        </li>
        <li>
          <strong>Credit.</strong> Tell us how you&apos;d like to be credited (for example, your handle) or whether you
          want to stay anonymous. We&apos;ll follow your choice.
        </li>
        <li>
          <strong>Takedown any time.</strong> Ask us at {contact} and we&apos;ll remove it from our website and accounts
          within 30 days. See the <a href={`${legal.privacy}#your-rights`}>data request steps</a>.
        </li>
        <li>
          <strong>Under 13?</strong> You need a parent or guardian&apos;s permission before sending us anything.
        </li>
      </ul>
      <p>
        We don&apos;t pay for submissions, we don&apos;t have to post every submission, and we may decline or remove
        content at our discretion.
      </p>

      <h2 id="community">5. Accounts and the community</h2>
      {showBeta() ? (
        <p>
          <em>Not available during the public beta.</em>
        </p>
      ) : null}
      <p>
        You can browse the community without an account. To post, comment, react or report, you need one.
      </p>
      <ul>
        <li>
          <strong>You must be 13 or older</strong> and confirm it when you join. Please give a real e-mail address you
          control, keep your password to yourself and tell us if someone else gets into your account. You&apos;re
          responsible for what happens under your account.
        </li>
        <li>
          <strong>Be kind.</strong> Laugh with students, not at them. No bullying, harassment, hate, sexual content,
          threats, or content that encourages cheating or hurting yourself or others.
        </li>
        <li>
          <strong>Keep it private.</strong> No real names, faces, schools, phone numbers, e-mail addresses or other
          personal details (yours or anyone else&apos;s), and no links or advertising.
        </li>
        <li>
          <strong>Make it yours.</strong> Post only your own words. You keep ownership of what you post, and you give us
          a free, non-exclusive permission to display, crop and share it in the community and on our social media for as
          long as it is up.
        </li>
        <li>
          <strong>Report in good faith.</strong> Use the report button for content that breaks these rules. Reporting
          something just to annoy someone is itself misuse.
        </li>
      </ul>
      <p>
        <strong>How moderation works.</strong> New posts are reviewed by a moderator before they appear. We may approve,
        reject or remove any post or comment, suspend or ban accounts, limit how often you can post, and block certain
        words, at our discretion and without notice where needed to keep the community safe. We try to review promptly
        but can&apos;t promise a timeframe. If you think we got it wrong, e-mail {contact} and we&apos;ll take a second
        look.
      </p>
      <p>
        <strong>Leaving.</strong> You can delete your own posts and comments, or your whole account, in the app
        whenever you like. Posts that weren&apos;t approved are deleted about 30 days after the decision. See the{" "}
        <a href={legal.privacy}>Privacy Policy</a> for what we keep.
      </p>

      <h2 id="respect">6. Using the site respectfully</h2>
      <p>
        Don&apos;t use Grade Delusion™ content to bully or harass anyone, and don&apos;t try to disrupt, hack or misuse
        the website. If we catch anyone misusing the wbesite, we would not hesitate to ban the user's IP address which may affect others, so please do not attempt to misuse it as we take it very seriously. Furthermore, it is a punishable offence under the Computer Misuse Act (CMA)
      </p>

      <h2 id="links">7. Links to other sites</h2>
      <p>
        We link to Instagram, YouTube, Facebook and Grade Solution. Those sites have their own terms and privacy policies,
        and we&apos;re not responsible for them.
      </p>

      <h2 id="liability">8. No guarantees</h2>
      <p>
        We provide Grade Delusion™ &quot;as is&quot;, for fun. We try to keep it working and accurate, but we don&apos;t
        promise it will always be available or error-free. To the extent the law allows, we aren&apos;t liable for any
        loss arising from your use of the site, including any decision to skip revision because a meme felt
        relatable. Nothing in these terms limits rights you have under law that can&apos;t be excluded.
      </p>

      <h2 id="credits">9. Credits and licences</h2>
      <p>The illustrations and doodles on this site are original artwork. Fonts used:</p>
      <ul>
        {fonts.map((f) => (
          <li key={f.name}>
            <strong>{f.name}</strong> by {f.by}, used under the{" "}
            <a href={f.file} target="_blank" rel="noopener noreferrer">
              {f.license}
            </a>
            .
          </li>
        ))}
      </ul>
      <p>
        Emoji are displayed using your device&apos;s built-in emoji font. Instagram and Facebook are trademarks of Meta
        Platforms, Inc., and YouTube is a trademark of Google LLC. Their logos are used only to link to our profiles and
        don&apos;t imply endorsement.
      </p>

      <h2 id="law">10. Governing law</h2>
      <p>These terms are governed by the laws of Singapore.</p>

      <h2 id="changes">11. Changes and contact</h2>
      <p>
        If we update these terms, we&apos;ll change the date at the top of this page. Questions? Email {contact}.
      </p>
    </LegalPage>
  );
}
