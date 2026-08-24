# Setup checklist

Manual steps required outside this codebase to bring the rewritten site (and later, the macOS app) fully online. Code-side work is done; these are console/account actions only you can take.

## 1. Firebase (`itspranavbadgi` project)
- [ ] **Authentication → Sign-in method**: enable the **Google** provider.
- [ ] Sign in once (via the site's future macOS app, or manually create a user under Authentication → Users) to get your admin **UID**.
- [ ] Open `database.rules.json` in this repo, replace every `'ADMIN_UID'` placeholder with your real UID.
- [ ] Deploy the rules: paste the file's contents into Firebase console → Realtime Database → Rules → publish. (Or install the Firebase CLI and run `firebase deploy --only database` — optional, not required.)
- [ ] Verify rules with the Rules Playground: public read of `projects`/`settings`/`about` succeeds; anonymous read of `messages` fails; anonymous *create* of a new `messages/$id` succeeds; anonymous *overwrite* of an existing message fails; your admin UID can read/write everywhere.
- [ ] Seed initial content directly in the console (or wait for the macOS app): `settings`, `about`, and a couple of `projects` entries, so the site isn't empty.
- [ ] When you start the macOS app: register a macOS app under Project settings → Your apps, download `GoogleService-Info.plist`, drop it into `macos-app/BadgipAdmin/`.

## 2. EmailJS (contact form notifications)
- [ ] Create a free account at emailjs.com.
- [ ] Add an email service (e.g. Gmail) and a template with `name`, `email`, `message` variables.
- [ ] Copy the **Public Key**, **Service ID**, and **Template ID** into `js/config.js` (`emailjsConfig`), replacing the `REPLACE_WITH_...` placeholders.
- [ ] Until this is done, the contact form still works — messages just land in Firebase RTDB without an email notification.

## 3. GitHub
- [ ] Run `gh auth refresh -s workflow` locally (or re-generate a PAT with the `workflow` scope) before this branch's `.github/workflows/deploy.yml` can be pushed.
- [ ] After merging to `main`: repo Settings → Pages → Source → **GitHub Actions**.
- [ ] Settings → Pages → Custom domain → `www.itspranavbadgi.com`, then enable **Enforce HTTPS** once the certificate issues.
- [ ] When building the macOS app: create a **fine-grained PAT** scoped to just this repo, with `Contents: Read and write` and `Actions: Read and write`. Enter it into the app once built — it's stored in macOS Keychain, not in this repo.

## 4. DNS (at your domain registrar for itspranavbadgi.com)
- [ ] Add a `CNAME` record: host `www` → value `pbadgi09.github.io`.
- [ ] The bare apex (`itspranavbadgi.com` without `www`) is intentionally not configured — only `www.itspranavbadgi.com` is in scope.

## 5. Local testing
- `npx serve .` from the repo root serves the static site locally (Firebase RTDB reads/writes work fine from `localhost`).
