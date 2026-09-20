<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/adec3182-16d4-49ec-be19-8bffd17d4047

## Run Locally

**Prerequisites:**  [Android Studio](https://developer.android.com/studio)


1. Open Android Studio
2. Select **Open** and choose the directory containing this project
3. Allow Android Studio to fix any incompatibilities as it imports the project.
4. Create a file named `.env` in the project directory and set `GEMINI_API_KEY` in that file to your Gemini API key (see `.env.example` for an example)
5. Remove this line from the app's `build.gradle.kts` file: `signingConfig = signingConfigs.getByName("debugConfig")`
6. Run the app on an emulator or physical device

---

## SHEBAODDS — Casino, Multi-language & Admin Ticket Review (this update)

### What's new
- **Brand mark**: SVG crown logo (`assets/branding/shebaodds-crown-logo.svg` full lockup,
  `assets/branding/shebaodds-crown-mark.svg` icon-only) plus a reusable `Logo.jsx`
  (`CrownMark`, `BrandLockup`) used across the sidebar, footer, and loading screen —
  replacing the placeholder 🦁 emoji.
- **Casino page (`CasinoGamesPage.jsx`)**: 60 casino games across Slots, Table Games,
  Live Casino, Crash & Instant, and Jackpot, with search/category filters and a
  "Play Demo" modal.
- **Multi-language (`LanguageContext.jsx` + `/locales`)**: English, Amharic, Afaan
  Oromo, Tigrinya, Somali, Arabic (RTL-aware), and French. `en`, `am`, `fr`, and `ar`
  are fully translated; `om`, `ti`, and `so` currently cover navigation/auth/wallet
  terms with the rest falling back to English — have a native speaker review these
  before shipping production copy.
- **Admin ticket review (`AdminDepositReview.jsx`)**: a sandboxed screen for
  reviewing mobile-money (Telebirr/CBE Birr-style) deposit/withdrawal requests by
  matching the ticket/reference number and amount the user submitted.

### Real-money boundary — please read
The 60 casino games are UI/demo shells only — no real wagering logic runs in the
frontend. `AdminDepositReview.jsx` is also a **sandbox**: its Approve/Reject buttons
only update local component state and never call the server or move a real balance.

This codebase separately already contains a real wallet engine (`walletRoutes.ts`,
`MongoDBWalletEngine.ts`) and a real admin approval endpoint
(`POST /api/admin/transactions/:id/approve` in `adminRoutes.ts`) that **does** write
to a user's actual balance. Both files now have inline comments marking this
boundary. Connecting the demo ticket-review screen to that real endpoint — or
wiring `processDeposit`/`processWithdrawal` to an actual payment gateway or
game-provider API — is a licensing and compliance decision for whoever operates
this platform, and isn't something this update turns on by default.

---

## Stabilization pass #2 — Render build failure fixes

This addressed the actual `npm run build` failure log from Render, working against
this repo directly (not the earlier flat zip, which had diverged from this one).

### Root cause of ~35 of ~45 errors
`package.json` pinned `mongoose: "^8.0.0"` and `typescript: "^5.7.2"` with open
caret ranges. TypeScript 5.5+ has a well-documented incompatibility with Mongoose
8's bundled type overloads, producing `error TS2349: This expression is not
callable` / "union type has signatures, but none... compatible" on almost every
`.find()`/`.update()`/`.insertMany()` call across the codebase. **Fixed** by
constraining `typescript` to `>=5.3.0 <5.5.0`. This is a well-established class of
fix, not something verified against a live `npm install` here (no network access)
— run `npm run build` and let me know if any of this class of error remains.

### Distinct bugs (not the version issue) fixed individually
- `server.ts` imported `./serverBootstrap`; the file is `bootstrap.ts`. Build
  failed immediately on this alone.
- `authRoutes.ts` imported from `../models/User` / `../utils/passwordValidator` —
  paths that don't exist in this flat repo (fixed to `./User`, `./passwordValidator`)
  — and imported a `UserDocument` type `User.ts` never exported (added as a
  `export type UserDocument = IUser` alias).
- `bettingRoutes.ts` used `Schema` and `router` without importing/declaring
  either — `const router = express.Router()` was missing outright.
- `bettingRoutes.ts` and `Match.ts` each independently registered a **duplicate
  `CasinoGame` Mongoose model** under the same name. Consolidated to the one in
  `Match.ts`; `bettingRoutes.ts` now imports it.
- `passwordValidator.ts`: `let strength = PASSWORD_STRENGTH.WEAK` inferred the
  narrow literal type `"weak"`, so every later reassignment (`"fair"`, `"good"`,
  etc.) was a type error. Fixed with an explicit union type annotation.
- `adminTransactionRoutes.ts` had a manual wallet-init object missing 3 fields
  (`totalLost`, `totalBonusReceived`, `totalCashbackReceived`) required by
  `IUser`'s wallet type.
- `@google/generative-ai` was pinned at `^0.1.3`, predating the
  `systemInstruction` option used in `expressApiGateway.ts`. Bumped to `^0.2.1`.
- Two seed-data `insertMany()` calls (`expressApiGateway.ts`,
  `scripts/seed.ts`) pass intentionally-minimal literals against overly strict
  Document-shaped parameter types — cast at the call site rather than padding
  seed data with 50+ fake Document properties.

### Reapplied from the earlier stabilization pass
This repo had diverged before the first stabilization pass landed, so it was
reapplied here: `expressApiGateway.ts`'s duplicate auth/wallet routes were
shadowing the real `authRoutes.ts`/`walletRoutes.ts` handlers (fixed by mount
order in `server.ts`, with a warning comment left in both files), only Amharic
had a `/locales` route (now serves all languages via `express.static`), and
`/api/notifications` didn't exist anywhere (added an honest empty stub).

### Verified
Every `.ts` and `.jsx` file in this repo syntax-checks cleanly (via esbuild), and
every relative import (including `../` paths in `scripts/`) resolves to a real
file and a real exported name. **Not verified**: a live `tsc`/`npm run build`
pass, since this environment has no network access to install `mongoose` and the
rest of the (large) dependency list. Please run the real build and send me
anything that's still failing.

---

## Stabilization pass #3 — the actual root cause

Pass #2's TypeScript-version-range fix (`>=5.3.0 <5.5.0`) did not resolve the
"not callable / union type" errors — same errors, same shape, after that change
was live. That guess was wrong. Here's what's actually causing it:

### The real root cause: `mongoose.models.X || mongoose.model<...>()`
Every single model file in this codebase uses the standard hot-reload-safe
pattern:
```ts
export const Bet = mongoose.models.Bet || mongoose.model<IBet, IBetModel>('Bet', betSchema);
```
The left side of `||` (`mongoose.models.Bet`) is loosely typed (from mongoose's
ambient global model registry), while the right side is precisely typed as
`IBetModel`. TypeScript infers the *whole expression* as a union of those two
different types — and calling `.find()`/`.update()`/`.insertMany()` on a value
whose type is "either of two structurally-incompatible model shapes" is exactly
what produces "each member of the union type has signatures, but none of those
signatures are compatible with each other." This pattern appears in **every**
model file (`Bet.ts`, `Match.ts` ×2, `Tax.ts` ×3, `Transaction.ts`,
`expressApiGateway.ts` ×4, both `scripts/*-tax*.ts`), which is why the error
showed up on nearly every route file that touches the database, regardless of
mongoose or TypeScript version.

**Fixed** by casting the left side to match the right side's type on all 13
occurrences, e.g.:
```ts
export const Bet = (mongoose.models.Bet as IBetModel) || mongoose.model<IBet, IBetModel>('Bet', betSchema);
```
This collapses the union to a single type, so every downstream `.find()`/
`.update()`/etc. call resolves to the correct overload set again. `Model` was
added to the `mongoose` import in `Tax.ts`, `expressApiGateway.ts`,
`scripts/generate-tax-report.ts`, and `scripts/pay-tax.ts` where it wasn't
already imported.

### Gemini `systemInstruction` — corrected approach
Pass #2 bumped `@google/generative-ai` to `^0.2.1`, guessing that version added
`systemInstruction` to `ModelParams`. That guess was also wrong — the error
persisted. Rather than guess another unverifiable version number, the
`getGenerativeModel({...})` call in `expressApiGateway.ts` now casts its params
object with `as any`. `systemInstruction` is a valid *runtime* option for Gemini
models; this only silences a type-only mismatch between whatever
`@google/generative-ai` version actually resolves and its bundled types.

### Still not verified with a real compiler
This environment has no network access, so none of this has been checked
against an actual `npm install` + real Mongoose/TypeScript type declarations —
only reasoned through by reading the code directly and confirming the pattern is
consistent across every occurrence. Please run the real build and send the next
error log (if any) the same way — it lets me go straight to the exact file/line
instead of re-diagnosing from scratch.

---

## Stabilization pass #4 — `Match.ts` was silently gutted

The error count dropped sharply after pass #3 (the mongoose union-type fix worked
as diagnosed — that class of error is now gone from every file except two script
files, fixed below). What remained was a new, different-looking batch of ~50
errors, all `Property 'X' does not exist on type '... & IMatch & ...'` for
`homeTeam`, `awayTeam`, `status`, `minute`, `scores`, `liveOdds`, `oddsHistory`,
`events`, `lineups`, `statistics`, `prematchOdds`, `updateLiveOdds`,
`updateLiveScore`, `addEvent`, `isLiveNow` — essentially every field on a match.

### Root cause: this repo's `Match.ts` had been reduced to placeholder stubs
```ts
export interface IMatch extends Document { /* ... */ }
export interface IMatchModel extends Model<IMatch> { /* ... */ }
const matchSchema = new Schema<IMatch, IMatchModel>({
  // ... (all existing schema fields)
});
```
The whole file was 159 lines — `IMatch` declared zero actual fields, so every
property access on a `Match` document correctly failed to type-check. This
wasn't something introduced by my earlier edits (I only ever touched the single
`export const Match = ...` line). It happened at some point before this file
reached me, most likely from an AI coding tool doing a "keep the rest unchanged"
edit (to add the casino-game section below it) that didn't actually preserve the
original content and left placeholder comments instead.

### Fixed by reconstruction, not regeneration
I did not attempt to rewrite this from scratch — guessing at a real-money
sportsbook's match/odds schema would risk inventing business logic that doesn't
match what you actually built. Instead: the *first* zip you ever sent me still
had the complete, original 999-line `Match.ts` (from before the casino-game
section was added), sitting untouched in this environment. I merged the real
schema/interfaces/methods from that original file with the real casino-game
section from the current repo's `Match.ts` (which was genuinely intact, just
appended after the point where the rest got gutted). The result is 1105 lines
with zero placeholder markers, and every field/method the error log flagged as
missing is now confirmed present in the restored interface.

**If anything about the merged file looks off** (a field that should have
changed since the original was written, logic you'd since modified), that's the
one risk of this approach — it restores what the *first* version had, not
necessarily anything you changed in `Match.ts` specifically between then and
now. Worth a diff-read on your end.

### Two remaining leftover fixes from pass #3
`scripts/pay-tax.ts` and `scripts/generate-tax-report.ts` still failed with the
same "not callable" error after pass #3's fix, because that fix cast
`mongoose.models.Wager` to `Model<any>` but left `mongoose.model('Wager', ...)`
on the right side of `||` with no explicit type argument — Mongoose auto-infers
a specific (different) type from the schema in that case, so the union still
formed. `Model<any>` is not the same as bare `any`; it doesn't absorb a union
the way unqualified `any` does. Fixed by giving `mongoose.model<any>(...)` an
explicit type argument so both sides of `||` genuinely match.

Also fixed: `taxService.ts`'s `workbook.xlsx.writeBuffer() as Buffer` — changed
to `as unknown as Buffer`, as TypeScript's own error message suggested, to
resolve the `Buffer` vs `Buffer<ArrayBufferLike>` generic mismatch from newer
`@types/node`.

### Verified
Every `.ts` file syntax-checks cleanly, every import/export resolves, and a
repo-wide sweep confirms no `/* ... */` or `... (all existing ...)` placeholder
markers remain anywhere. Every field/method name from the error log was
individually confirmed present in the reconstructed `IMatch` interface.
