# Cookie-information banner and the Privacy Policy

## What it does

`components/CookieConsent.tsx` shows a non-blocking banner on first visit with a short, humorous cookie message, links to the
Privacy Policy and Terms, and **one** button: **Got it 🤡**. There is no accept/decline choice, because nothing optional is
switched on.

Pressing the button saves the single fixed string `"acknowledged"` under the `localStorage` key `gd_cookie_consent`
(`lib/consent.ts`) and closes the banner; it stays closed on later visits. If the browser blocks storage, the acknowledgement
lasts for the page view and the banner returns next visit. Any other value under that key (for example the `"essential"` /
`"accepted"` words used by an earlier draft) counts as not acknowledged.

It is **local storage, not a browser cookie**. It holds no identifier and no timestamp, and the consent feature never sends it
anywhere (checked by an end-to-end test that records the network traffic around the click).

The site has no analytics, advertising pixels, retargeting, behavioural tracking or third-party scripts, and the banner adds
none. The earlier `hasAnalyticsConsent()` / `runIfConsented()` gate was removed with the choice: with nothing optional to
switch on it had no purpose. If any such script is ever added, the Privacy Policy must be updated first and a real choice, with
a gate in front of the script, designed at that time.

## The Privacy Policy (`/privacy`, section 4)

Updated (approved 18 November 2026; `legal.privacyLastUpdated` is "18 November 2026"):

- The opening sentence now says a banner asks you to acknowledge the cookie information and that the preference is saved so
  you are not asked again (it no longer says there is no cookie banner).
- A new list item discloses the `gd_cookie_consent` consent preference: local storage, contains only "acknowledged", no
  identifier or timestamp, not transmitted to our servers by the consent feature.
- The closing paragraph says there is no analytics, advertising pixels, behavioural tracking or other tracking technology, and
  that the policy will be updated, and consent asked, before anything of that kind runs.

The font claim ("served from our own website") is true: `app/layout.tsx` uses `next/font/google`, which downloads the fonts at
build time and serves them from the site's own `/_next/static/media/`. The built pages contain no reference to Google's font
hosts, and browser tests recorded no requests to any other host.

The Terms of Use keep their own date: `LegalPage` shows `legal.lastUpdated` ("7 November 2026") by default, and only the Privacy page passes
`legal.privacyLastUpdated`. `app/terms` was not changed.

## What else the new features store

Nothing. The Student/Parent switcher is stateless. Quiz answers and results, the certificate name, toy settings and the
countdown tab live in React state only. `tests/unit/student-toys-guard.test.ts` fails if any new file uses browser storage
other than `lib/consent.ts`, or makes a network call, or loads tracking code.
