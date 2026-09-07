# My Day

A mobile-first productivity app built with Next.js, React, TypeScript, Tailwind CSS, and Firebase. Two tabs: **Tasks** for things to do, and **My Day** for time reserved in your day.

## Setup

Use Node.js 20.9 or newer (Node.js 24 recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000. On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`.

## Environment

`.env.local` is already populated with the supplied Firebase web app configuration and excluded from Git. `.env.example` contains the same public web configuration for setup on other machines. Copy it to `.env.local` if necessary. Never add service-account credentials to `NEXT_PUBLIC_*` variables.

| Variable                                   | Purpose                              |
| ------------------------------------------ | ------------------------------------ |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase web API key                 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Authentication domain                |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | `lifetracker-87a61`                  |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Task image bucket                    |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID                   |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Registered Firebase web app          |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      | Supplied for reference; unused in v1 |

Configuration is read only in `src/lib/firebase.ts`. Analytics is not initialized. Public Firebase configuration identifies your project; deployed security rules protect its data. Restart the dev server after environment changes. Production public variables are embedded at build time, so rebuild when they change.

## Firebase Console setup

Open https://console.firebase.google.com/project/lifetracker-87a61/overview with an account that administers this project.

1. **Build → Authentication → Get started**. In **Sign-in method**, enable **Email/Password** (the password provider, not email-link sign-in), and save.
2. Under **Authentication → Settings → Authorized domains**, add `localhost` for development if absent, then your production hostname (for example `my-day.vercel.app`).
3. **Build → Firestore Database → Create database**. Choose a location near your users and production mode. Use the default database. In **Rules**, replace the rules with `firestore.rules` and publish. No additional indexes are required.
4. **Build → Storage → Get started**. Enable the Blaze billing plan if prompted; Cloud Storage requires it. Create the default bucket and choose a suitable location. Confirm it is `lifetracker-87a61.firebasestorage.app`, or update `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` to the bucket actually created. In **Rules**, paste `storage.rules` and publish.
5. **Project settings → General → Your apps**: confirm the provided web app configuration matches `.env.local`. No Analytics setup is needed.

Alternatively deploy the included rules using the Firebase CLI after the database and bucket exist:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,storage --project lifetracker-87a61
```

The application does not provision Firebase services or publish rules automatically. Do not leave test-mode rules enabled. The provided rules deny access to all other UID paths, including reads. Storage uploads additionally require an allowed image MIME type and a maximum size of 10 MB.

## Architecture

```text
users/{uid}/tasks/{taskId}
users/{uid}/settings/day
users/{uid}/routineBlocks/{routineId}
users/{uid}/days/{YYYY-MM-DD}/blocks/{blockId}
Storage: users/{uid}/tasks/{taskId}/{randomId-fileName}
```

- Tasks, daily blocks, and routine templates are separate entities. Blocks store an optional task ID; completion exists only on the Task. Deleting a block never touches its task. Deleted tasks leave their daily blocks with a clear missing-task label; edit the block to assign another task or switch it to Custom.
- One task listener is shared across both screens. Settings and routine listeners are shared; the schedule listener follows the selected day. The authenticated workspace is remounted when UID changes, clearing the previous account's in-memory data.
- Routine application validates all copies first, then writes them in a single batch. Applying twice cannot silently create overlaps. Template ordering is editable; actual schedules always display in clock order.
- Free time is computed locally and never saved. Scheduling utilities live in `src/utils/time.ts`, with tests for overlaps, boundaries, gaps, and date navigation.
- Local dates and `HH:mm` clock times avoid UTC date shifts. Dates are selected at local noon; task due dates are Firestore timestamps. Creation/update audit fields use `serverTimestamp()`.
- Auth uses explicit browser-local persistence. Data access uses Firebase UID rules; there is no privileged server key or public shared dataset.
- File uploads validate type and size before upload, show progress, and retain storage paths for cleanup. Removing a photo takes effect when the task is saved. New uploads are rolled back when task persistence fails. Deleting a task attempts image cleanup first and retains the task if cleanup fails, so the operation can be retried.
- Native modal dialogs provide keyboard focus containment and Escape handling, with bottom sheets on phones. Bottom navigation respects safe-area insets.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Manual checks against your configured Firebase project:

The live check on 7 September 2026 returned `auth/configuration-not-found` before creating an account. Firebase Authentication must be enabled before signup, login, persistence, Firestore, and Storage flows can be verified against this project. After completing the Console setup, an opt-in SDK integration check is available:

```bash
node --env-file=.env.local tests/firebase-live.mjs
```

This creates a temporary test account, checks task and schedule operations and cross-user access rejection, uploads/removes a tiny test image, and cleans up its test data and account. Browser interactions and refresh persistence should still be checked using the checklist below.

1. Create an account, sign out, sign in, and refresh to verify persistence.
2. Create a task with notes, estimate, due date, and multiple images. Edit it, remove one image, complete/uncomplete it, and delete it.
3. Configure day hours; add, edit, reorder, and delete routine templates. Apply templates to the selected day, then edit a daily copy and check the template stays unchanged.
4. Create a Custom block, link another block to a task, and complete that task from My Day. Check the Tasks tab reflects completion.
5. Delete a linked block and verify its task remains. Test overlap, reversed time, and day-boundary errors. Verify automatic free time and previous/next/Today navigation.
6. Sign in as a different account and confirm it has a separate empty workspace. Test unauthorized reads/writes against the deployed rules or Firebase Emulator Suite.

## Production and deployment

```bash
npm run build
```

The app uses Next.js static export. Its production artifact is `out/`; all authenticated Firebase interactions happen in the browser. Run `npm start` to preview the build at http://127.0.0.1:3000. This local preview server is only for checking the static build; deploy `out/` to a production static host.

### Vercel

Import the repository into Vercel. Set all required `NEXT_PUBLIC_FIREBASE_*` variables from `.env.example` in the project environment settings. The included `vercel.json` explicitly selects the Next.js framework, runs `npm run build`, and points Vercel's Next.js integration at `.next` for its build metadata. That integration handles the static export; do not set its Output Directory to `out`. The `out` folder is used directly by Firebase Hosting and the local production preview. Keep the Root Directory at the repository root. Deploy, then add the resulting hostname in Firebase Authentication authorized domains. Publish the Firebase rules separately before using production data.

### Firebase Hosting

`firebase.json` already serves `out/`, and `.firebaserc` selects your project.

```bash
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting,firestore:rules,storage --project lifetracker-87a61
```

The default Hosting address is `https://lifetracker-87a61.web.app`. Add any custom domain under Firebase Hosting and Firebase Authentication authorized domains.

## v1 scope and limitations

- Firebase Console configuration, service activation, billing, rule publication, and production deployment require your project account and are not performed by this code.
- Overlap checks run against the current realtime snapshot in the client. Simultaneous conflicting writes from multiple devices can race; use a server-side transactional scheduling layer if stronger concurrency guarantees are needed.
- Day hours are global. Changes validate the selected day's blocks and routine templates; existing blocks on other dates remain visible even if outside newly configured hours.
- Image compression, background orphan cleanup, password reset, email verification, drag-and-drop, offline caching, and an installable PWA are not included. The responsive static architecture can support a future PWA.
- Images use Firebase download URLs as requested. Treat those URLs as private: anyone given a token-bearing download link can access that image. Do not share links publicly.
- Routine application uses one Firestore batch; keep the number of routine templates below the Firestore batch limit of 500.
- No calendar integrations, AI scheduling, notifications, recurring tasks, sharing, or analytics.

Official references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth), [Firebase Storage setup](https://firebase.google.com/docs/storage/web/start).
