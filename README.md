# Scaffold Buddy: mobile app

Scaffold Focus is a phone-first web app that helps you do one thing at a time. It shows time you can see and has Filo, a little builder buddy, working beside you. The design is based on research into ADHD, attention and executive function, summarised in [`docs/adhd-design-research.md`](docs/adhd-design-research.md).

This is a front-end prototype. Sample tasks, ideas and thoughts are added on the first visit, and everything is saved in the browser's `localStorage`. There is no backend.

## Run locally

```sh
npm install
npm run dev
```

Then open `http://localhost:5173/`. Use your browser's device toolbar or a phone on the same network (`npm run dev -- --host`) to see it at phone size.

## Build and deploy

```sh
npm run build
```

The build writes static files to `dist/`. On Vercel, import this repo and keep the detected **Vite** preset (build command `npm run build`, output directory `dist`). The site can then be wrapped as a native app with a website-to-app service such as Median.

## Features

- **Now:** one task at a time, picked for the moment (a current or upcoming slot, your Top 3, your energy, or something carried over). It has a visual time ring, the first small step, a big **Start with just 2 minutes** button, and **Done** and **Not now**.
- **Focus mode:** shows only the current step, a Time-Timer-style shrinking wedge with a halfway cue, and Filo working alongside as a body double. **Park a thought** sends stray ideas to the Inbox without leaving. When time's up you choose: keep going, take a break, done, or come back later.
- **Capture:** talk (browser speech recognition) or type. Filo splits the dump into tasks, ideas and thoughts, and picks up days, times and durations.
- **Plan:** a Top 3 cap, a timeline whose blocks are sized by duration with labelled free time, a "Now" line, and a "Maybe later" list with no dates.
- **Kind by default:** nothing is red or "overdue". Older tasks are **carried over** with one-tap Today, Tomorrow or Later. Every change can be undone. There are no streaks; it counts the "days you showed up" instead.
- **Make it yours:** settings for calm motion, sounds, larger text, focus length and when your day ends.

## Code layout

- `index.html` has the app shell, tab bar, sheets and focus mode markup.
- `src/main.js` holds the views and interactions, and `src/focus.css` the styles.
- `src/breakdown.js` suggests small steps, `src/sorter.js` splits and classifies captures and parses dates and times, and `src/filo.js` draws and animates Filo.
- `src/seed.js` creates the sample data.
- `public/` holds the web app manifest and icons, so the app can be installed to the home screen.
