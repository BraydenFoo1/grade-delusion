import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { isPublicBeta } from "@/lib/platform/mode";
import { business, legal, site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Grade Delusion handles personal data: almost nothing on the home page, and only what is needed to run accounts in the community.",
  path: legal.privacy,
});

// Draft public-beta wording (see legal.betaWordingApproved): hidden until it has been reviewed.
const showBeta = () => legal.betaWordingApproved && isPublicBeta();

const dpo = <a href={`mailto:${business.dpoEmail}`}>{business.dpoEmail}</a>;
const operator = (
  <>
    {business.legalName}
    {business.uen && <> (UEN {business.uen})</>}
  </>
);

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          {showBeta() ? (
            <>
              <strong>Public beta.</strong> This site is currently a read-only public beta. There are no member accounts, and sign-up, posting,
              commenting, reacting and reporting are not available. The sections below about accounts and the community (section 3) and
              about children under 13 as they relate to accounts (section 7) describe features that are not active during the beta; they
              apply only if and when those features open.{" "}
            </>
          ) : null}
          Grade Delusion™ is all jokes. Your privacy isn&apos;t. This policy explains what personal data we handle, why,
          and what you can ask us to do with it. It&apos;s written to follow Singapore&apos;s Personal Data Protection Act
          2012 (PDPA).
        </>
      }
      summary={
        <ul>
          <li>
            Browsing the home page, the quiz and the generator collects nothing: no ads, no tracking, and your answers
            stay in your browser.
          </li>
          <li>
            The community needs an account (13 and over). We keep your e-mail address private, show only the display
            name you choose, and set one sign-in cookie.
          </li>
          <li>Every post is read by a human moderator before anyone else can see it.</li>
          <li>We never sell your data.</li>
          <li>You can delete your account yourself, any time, in Settings.</li>
          <li>
            You can ask us to show, correct or delete your data, or take down a featured post, at any time: {dpo}.
          </li>
        </ul>
      }
    >
      <h2 id="who-we-are">1. Who we are</h2>
      <p>
        Grade Delusion™ (&quot;we&quot;, &quot;us&quot;) is a humour brand run by {operator}, {business.country}.
        {business.address && <> Our address is {business.address}.</>} For anything in this policy, contact our Data
        Protection Officer at {dpo}.
      </p>

      <h2 id="this-website">2. What the website collects when you just browse</h2>
      <p>
        <strong>Directly: nothing.</strong> On the home page and the information pages, the quiz, the Delusion
        Generator, the level picker and the reaction buttons all run entirely in your browser. Nothing you click or
        answer is sent to us or saved. Personal data is only collected in the community, described next.
      </p>
      <p>
        <strong>Technical logs.</strong> Like every website, our hosting provider automatically processes basic technical
        information when you visit, such as your IP address, browser type, the page requested and the time. This is used
        only to deliver the site, keep it secure and fix problems. We don&apos;t use it to identify you, and the hosting
        provider keeps it for a limited period.
      </p>
      <p>
        <strong>Share and copy buttons.</strong> These copy text to your clipboard or open your device&apos;s share menu.
        We don&apos;t see what you share or who you share it with.
      </p>

      <h2 id="accounts">3. Accounts and the community</h2>
      {showBeta() ? (
        <p>
          <em>Not active during the public beta.</em>
        </p>
      ) : null}
      <p>
        The community (posting delusions, commenting, reacting and reporting) needs an account. Accounts are for people
        aged 13 and over. This is what we handle when you use it:
      </p>
      <ul>
        <li>
          <strong>Your e-mail address</strong>, to confirm it&apos;s really yours, to reset your password and to
          contact you about your account. It is never shown to other members. Admins can see it, and moderators see
          only a masked version.
        </li>
        <li>
          <strong>Your password</strong>, stored only as a salted one-way hash. We can&apos;t read it.
        </li>
        <li>
          <strong>Your display name and optional bio.</strong> These are public. Please don&apos;t use your full real
          name, your school or anything that identifies you if you don&apos;t want it shown.
        </li>
        <li>
          <strong>What you post:</strong> delusions, comments, reactions and reports, plus your notifications.
        </li>
        <li>
          <strong>That you confirmed you&apos;re 13 or older and accepted our Terms</strong>, and when.
        </li>
        <li>
          <strong>Security information:</strong> for each sign-in, your IP address and browser type, used to keep your
          account safe, limit abuse and show you where you&apos;re signed in.
        </li>
      </ul>
      <p>
        <strong>What other people can see:</strong> your display name, your bio, and the posts and comments that have
        been approved or published. Nothing else.
      </p>
      <p>
        <strong>Moderation.</strong> Every new post is reviewed by a moderator before it is published. Moderators and
        admins can see posts in every state (including ones not approved), reports, and the history of moderation
        decisions about you. We keep a record of moderation decisions and administrator actions (who did what, to what,
        and when, plus any note a moderator wrote) so that decisions can be checked. These records use user IDs, not
        your e-mail address or the text of your posts.
      </p>
      <p>
        <strong>Reports.</strong> If someone reports a post or comment, we keep a copy of the reported text with the
        report, so moderators can see what was reported even if it is later edited. Only staff can see who reported.
      </p>
      <p>
        <strong>Service providers.</strong> We use Vercel to host the website, Neon to host our database and Resend to
        send e-mail such as confirmation and password-reset links. They process data for us under their own security
        commitments, and may store it outside Singapore (see section 8).
      </p>

      <h2 id="cookies">4. Cookies and similar technologies</h2>
      <p>
        We use only what is strictly necessary to run the community, so there is no cookie banner:
      </p>
      <ul>
        <li>
          <strong>A sign-in cookie</strong> (<code>gd.session_token</code>, or <code>__Secure-gd.session_token</code> over HTTPS), set only when you sign in. It keeps you
          signed in for up to 14 days, is not readable by scripts, and is not used for tracking.
        </li>
        <li>
          <strong>A saved theme choice</strong> (light or dark) in your browser&apos;s local storage, only if you use
          the theme button.
        </li>
      </ul>
      <p>
        We don&apos;t use analytics, advertising pixels or any other tracking technology. Our fonts are served from our
        own website, so your browser doesn&apos;t contact Google or any other third party to load them. If we ever add
        analytics or anything else that uses cookies, we will update this policy first and ask for your consent where
        required.
      </p>

      <h2 id="emails">5. When you email us or send a submission</h2>
      <p>
        If you email us (for example, to send a meme for us to feature), we receive your email address, your name if you
        include it, your message and any files you attach. We use this only to:
      </p>
      <ul>
        <li>reply to you;</li>
        <li>consider your submission and, if you&apos;ve agreed, post it on our website or social media; and</li>
        <li>credit you the way you asked, or keep you anonymous.</li>
      </ul>
      <p>
        Please don&apos;t send us other people&apos;s personal data, such as names, photos, faces, school details or
        screenshots of private chats, unless they&apos;ve agreed. We remove identifying details before posting anything.
        See the{" "}
        <a href={`${legal.terms}#submissions`}>submission rules</a> in our Terms of Use.
      </p>

      <h2 id="social-media">6. Social media</h2>
      <p>
        When you follow, message or comment on our{" "}
        <a href={site.socials.instagram} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
        ,{" "}
        <a href={site.socials.youtube} target="_blank" rel="noopener noreferrer">
          YouTube
        </a>{" "}
        or{" "}
        <a href={site.socials.facebook} target="_blank" rel="noopener noreferrer">
          Facebook
        </a>{" "}
        pages, those platforms collect data under their own privacy policies. We can see whatever the platform shows us,
        such as your public profile name and your comments or messages, and we use it only to run our pages and reply to
        you.
      </p>

      <h2 id="children">7. Children under 13</h2>
      {showBeta() ? (
        <p>
          <em>The account rules in this section are not active during the public beta; the rest applies now.</em>
        </p>
      ) : null}
      <p>
        Grade Delusion™ is made for students, and you don&apos;t need to give us any personal data to enjoy the home
        page. Community accounts are for people aged 13 and over, and you confirm your age when you join. If
        you&apos;re under 13, please don&apos;t create an account, and get a parent or guardian&apos;s permission before
        emailing us or sending us anything.
      </p>
      <p>
        If we learn that we&apos;ve received personal data from a child under 13 without a parent or guardian&apos;s
        consent, or that an account belongs to someone under 13, we will delete it and take down anything we posted. Parents and guardians can contact us at {dpo} at any
        time.
      </p>

      <h2 id="sharing">8. Who we share data with</h2>
      <p>
        We don&apos;t sell, rent or trade personal data. We only share it with service providers that help us run Grade
        Delusion™, such as our email and hosting providers, or when the law requires us to.
      </p>
      <p>
        Some of these providers may store data outside Singapore. When that happens, we make sure the data receives a
        standard of protection comparable to the PDPA.
      </p>

      <h2 id="retention">9. How long we keep it</h2>
      <ul>
        <li>Emails and submissions: only as long as we need them to reply and manage your submission, then we delete them.</li>
        <li>
          Accounts and everything you posted: until you delete your account (Settings, then Delete account). Deleting it
          removes your account, posts, comments, reactions and notifications straight away.
        </li>
        <li>
          Posts that were not approved: kept for 30 days after the moderator&apos;s decision, so you have time to read the
          note and ask us about it, then deleted. We run that clean-up ourselves, so it can occasionally take a little
          longer than 30 days.
        </li>
        <li>
          Moderation and administrator records: kept so decisions can be checked, even after an account is deleted. They
          hold user IDs, the moderator&apos;s display name and any note the moderator wrote, not e-mail addresses or post text.
        </li>
        <li>
          Sign-in sessions: up to 14 days. Confirmation and reset links: 1 to 24 hours. Anti-abuse counters (which are
          keyed on IP addresses and e-mail addresses) and expired sessions are cleared automatically within a few days.
        </li>
        <li>Featured posts: until you ask us to take them down.</li>
        <li>Hosting logs: kept by our hosting provider for a limited period for security purposes.</li>
      </ul>

      <h2 id="your-rights">10. Your rights and how to make a data request</h2>
      <p>
        Account holders can change their display name and bio, change their password, sign out of other devices and
        delete their account themselves in Settings. For anything else, use the steps below.
      </p>
      <p>You can ask us to:</p>
      <ul>
        <li>
          <strong>Access:</strong> tell you what personal data we hold about you and how we&apos;ve used it.
        </li>
        <li>
          <strong>Correct:</strong> fix anything that&apos;s wrong.
        </li>
        <li>
          <strong>Withdraw consent:</strong> stop using your data, including your submission.
        </li>
        <li>
          <strong>Delete / take down:</strong> erase your emails and submissions and remove any post featuring your
          content from our website and social media.
        </li>
      </ul>
      <h3>How to make a request</h3>
      <ol>
        <li>
          Email {dpo} with the subject line <strong>&quot;Data request&quot;</strong>.
        </li>
        <li>
          Tell us what you&apos;d like us to do and include any links to the relevant posts. If possible, send it from the
          email address you used to contact us, so we can confirm it&apos;s you. We may ask for a little more information
          to verify your identity.
        </li>
        <li>We&apos;ll acknowledge your request within 7 days.</li>
        <li>
          We&apos;ll complete it within 30 days. If we can&apos;t, we&apos;ll tell you why and when we expect to finish.
        </li>
      </ol>
      <p>
        Requests are free. Parents or guardians can make requests on behalf of a child. Copies that other people have
        already reshared on social media are outside our control, but we&apos;ll remove everything on our own accounts.
      </p>
      <p>
        If you&apos;re not happy with how we&apos;ve handled your data, please tell us first. You can also contact
        Singapore&apos;s{" "}
        <a href="https://www.pdpc.gov.sg" target="_blank" rel="noopener noreferrer">
          Personal Data Protection Commission
        </a>
        .
      </p>

      <h2 id="security">11. Security</h2>
      <p>
        We take reasonable steps to protect the personal data we hold, such as limiting who can access our inbox and using
        providers with strong security. No method of transmission or storage is completely secure, so we can&apos;t
        guarantee absolute security.
      </p>

      <h2 id="changes">12. Changes to this policy</h2>
      <p>
        If we change this policy, we&apos;ll update the date at the top of this page. If a change significantly affects
        how we use your data, we&apos;ll make it clear on the website.
      </p>

      <h2 id="contact">13. Contact</h2>
      <p>
        Data Protection Officer, {operator}: {dpo}
      </p>
    </LegalPage>
  );
}
