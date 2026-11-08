# GRADE DELUSION™

> **All students only have delusions.™**

Grade Delusion is a student-focused entertainment and digital media brand built around the funniest, most relatable parts of student life.

From exam stress and study struggles to academic confidence and questionable decisions, Grade Delusion turns everyday student experiences into memes, jokes, content and interactive experiences.

🌐 **Website:** https://grade-delusion.vercel.app/

---

## 🎓 What is Grade Delusion?

Grade Delusion is where academic confidence meets academic reality.

We create:

- 😂 Student memes
- 📝 Exam memes
- 📚 Study memes
- 🤡 Academic delusions
- 💬 Funny student quotes
- 🎓 Student-life content
- 🧠 Interactive experiences
- 📰 Student-focused articles

Because sometimes you studied for 10 hours...

…and sometimes you just had **Grade Delusion**.

---

## ✨ Features

### 🧠 Delusion Generator
Generate completely questionable academic confidence on demand.

### 📊 Delusion Levels
From mild confidence to **EXTREME DELUSION**.

### 📝 Delusion Test
Find out how academically delusional you really are.

### 😂 Delusion Feed
A collection of relatable student memes and situations.

### 🥚 Easter Eggs
The website contains hidden interactive Easter eggs for people willing to look closely.

---

## 🌐 Website

Visit the live website:

**https://grade-delusion.vercel.app/**

Explore:

- `/student-memes`
- `/exam-memes`
- `/study-memes`
- `/exam-delusions`
- `/funny-student-quotes`
- `/student-life`
- `/blog`

---

## 🛠️ Tech Stack

Grade Delusion is built with:

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Vercel**
- **GitHub**

---

## 📱 Social Media

Instagram:  
https://www.instagram.com/gradedelusion/

Facebook:  
https://www.facebook.com/profile.php?id=61595322110945

YouTube:  
https://youtube.com/@gradesolutionsg

Email:  
gradedelusion.sg@gmail.com

---

## 🎨 Brand

**Brand:** Grade Delusion™  
**Tagline:** All students only have delusions.™

### Brand personality

- Funny
- Relatable
- Chaotic
- Bold
- Student-focused
- Gen-Z
- Self-aware

---

## 🚀 Development

Clone the repository:

```bash
git clone https://github.com/BraydenFoo1/grade-delusion.git
cd grade-delusion
```

Then install and run:

```bash
npm install
npm run dev          # http://localhost:3000
```

---

## 🧑‍🎓 Grade Delusion V2: the community platform

On top of the marketing site there is now a moderated community: students sign up, submit delusions, and moderators
approve them before anyone else sees them.

**Students:** register and verify e-mail, dashboard, submit / edit / delete posts (text only, up to 500 characters),
public feed with search, category filter, sorting and pagination, reactions, comments and replies, profiles, activity
history, notifications, reporting, account settings (profile, password, devices, delete account).

**Moderators and admins:** review queue, reports, post and comment management, user search and suspension / bans,
role management, an append-only audit log, platform settings (switches, limits, blocked words, announcement) and an
overview with a chart. Every permission is enforced on the server.

**Stack:** Next.js (App Router) · TypeScript (strict) · Tailwind CSS 4 · Better Auth · Neon Postgres · Drizzle ORM ·
Resend · Zod.

### Run it locally (no accounts or services needed)

```bash
npm install
npm run dev
```

Open <http://localhost:3000/community>. With no `.env.local`, the app uses an embedded database in `.data/` and writes
e-mails (confirmation and reset links) to `.data/outbox/`. To get an admin account: sign up, click the link from
`.data/outbox/`, then **stop the dev server** (Ctrl+C), run `npm run admin:promote -- you@example.com`, and start
`npm run dev` again. (The embedded database allows one process at a time; the command refuses, with a clear message,
if the dev server still has it open.)

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit and database/auth/authorization integration tests (Vitest, real Postgres engine in memory) |
| `npm run build && npm run test:e2e` | End-to-end tests in Chrome against a production build: user journey, security, accessibility (axe) in light and dark, responsive layout |
| `npm run db:generate` / `db:migrate` / `db:reset-local` | Migrations (see `docs/DATABASE.md`) |
| `npm run admin:promote -- <email>` | Make a confirmed member the first admin |
| `npm run retention:purge` | Preview / run deletion of rejected posts older than 30 days |

### Documentation

[Environment variables](docs/ENVIRONMENT.md) · [Database setup](docs/DATABASE.md) ·
[Authentication setup](docs/AUTHENTICATION.md) · [Admin and moderation guide](docs/ADMIN.md) ·
[Security notes](docs/SECURITY.md) · [Deployment preparation](docs/DEPLOYMENT.md)
