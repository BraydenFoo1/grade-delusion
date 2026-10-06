import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { business, legal, site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Grade Delusion handles personal data. Short answer: we collect almost nothing.",
  path: legal.privacy,
});

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
          Grade Delusion™ is all jokes. Your privacy isn&apos;t. This policy explains what personal data we handle, why,
          and what you can ask us to do with it. It&apos;s written to follow Singapore&apos;s Personal Data Protection Act
          2012 (PDPA).
        </>
      }
      summary={
        <ul>
          <li>No accounts, no sign-up forms, no ads, no tracking and no cookies.</li>
          <li>
            Your quiz answers, delusion levels and generator results stay in your browser and disappear when you leave
            the page.
          </li>
          <li>We only get personal data if you email us or interact with us on social media.</li>
          <li>We never sell your data.</li>
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

      <h2 id="this-website">2. What this website collects</h2>
      <p>
        <strong>Directly: nothing.</strong> The website has no forms, logins or comment boxes. The quiz, the Delusion
        Generator, the level picker and the reaction buttons all run entirely in your browser. Nothing you click or
        answer is sent to us or saved.
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

      <h2 id="cookies">3. Cookies and similar technologies</h2>
      <p>
        We don&apos;t use cookies, local storage, analytics, advertising pixels or any other tracking technology, so
        there&apos;s no cookie banner. Our fonts are served from our own website, so your browser doesn&apos;t contact
        Google or any other third party to load them.
      </p>
      <p>
        If we ever add analytics or anything else that uses cookies, we will update this policy first and ask for your
        consent where required.
      </p>

      <h2 id="emails">4. When you email us or send a submission</h2>
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

      <h2 id="social-media">5. Social media</h2>
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

      <h2 id="children">6. Children under 13</h2>
      <p>
        Grade Delusion™ is made for students, and you don&apos;t need to give us any personal data to enjoy the website.
        If you&apos;re under 13, please get a parent or guardian&apos;s permission before emailing us or sending us
        anything.
      </p>
      <p>
        If we learn that we&apos;ve received personal data from a child under 13 without a parent or guardian&apos;s
        consent, we will delete it and take down anything we posted. Parents and guardians can contact us at {dpo} at any
        time.
      </p>

      <h2 id="sharing">7. Who we share data with</h2>
      <p>
        We don&apos;t sell, rent or trade personal data. We only share it with service providers that help us run Grade
        Delusion™, such as our email and hosting providers, or when the law requires us to.
      </p>
      <p>
        Some of these providers may store data outside Singapore. When that happens, we make sure the data receives a
        standard of protection comparable to the PDPA.
      </p>

      <h2 id="retention">8. How long we keep it</h2>
      <ul>
        <li>Emails and submissions: only as long as we need them to reply and manage your submission, then we delete them.</li>
        <li>Featured posts: until you ask us to take them down.</li>
        <li>Hosting logs: kept by our hosting provider for a limited period for security purposes.</li>
      </ul>

      <h2 id="your-rights">9. Your rights and how to make a data request</h2>
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

      <h2 id="security">10. Security</h2>
      <p>
        We take reasonable steps to protect the personal data we hold, such as limiting who can access our inbox and using
        providers with strong security. No method of transmission or storage is completely secure, so we can&apos;t
        guarantee absolute security.
      </p>

      <h2 id="changes">11. Changes to this policy</h2>
      <p>
        If we change this policy, we&apos;ll update the date at the top of this page. If a change significantly affects
        how we use your data, we&apos;ll make it clear on the website.
      </p>

      <h2 id="contact">12. Contact</h2>
      <p>
        Data Protection Officer, {operator}: {dpo}
      </p>
    </LegalPage>
  );
}
