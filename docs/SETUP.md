# Setup checklist

Manual steps required outside this codebase to bring the rewritten site (and later, the macOS app) fully online. Code-side work is done; these are console/account actions only you can take.

## 1. Firebase (`itspranavbadgi` project)
- [x] **Authentication → Sign-in method**: enabled the **Google** provider.
- [x] Got the admin **UID** (`WnssuGlei3M2aSbav6iWftHCmug1`) via a one-off local sign-in page.
- [x] `database.rules.json` updated with the real UID and published to Realtime Database → Rules (verified live via REST: public reads work, anonymous read/write on `messages` denied except create).
- [ ] Seed initial content: `settings`, `about`, and a couple of `projects` entries — now done through the macOS app instead of the console.
- [x] Registered a macOS app under Project settings → Your apps, downloaded `GoogleService-Info.plist`, placed at `macos-app/Sources/BadgipAdmin/Resources/GoogleService-Info.plist`.

## 1b. Google Sign-In OAuth client (for the macOS app)
- [x] No separate Google Cloud Console setup needed — Firebase auto-provisioned an OAuth client when the Apple app was registered with Google Sign-In enabled. Its `CLIENT_ID`/`REVERSED_CLIENT_ID` (from the plist) are already set in `macos-app/Sources/BadgipAdmin/Services/Config.swift`.
- [ ] In Xcode, add a URL Type (`com.googleusercontent.apps.466226587643-o1gmqikbvocdt2faps83via4hsldhmt6`) to the `BadgipAdmin` target's Info settings — required for the OAuth callback to reach the app. Full detail in `macos-app/README.md`.

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
