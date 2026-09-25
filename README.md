# Knoedler Work Instructions — independent Cloudflare edition

This is your website source code, adapted to run in YOUR Cloudflare account.
It is not deployed to your account yet. Your existing website stays unchanged.
No passwords, Google tokens or existing production records are included.

## What is included

- Work instructions with customer/Knoedler part numbers and revisions, description and operations.
- Multiple photos per step, camera uploads, annotations, text sheets and tables.
- Editing saved instructions, version checks, PDF downloads.
- Admin-assigned operation accounts and Google Drive folder IDs.
- Cloudflare D1 database schema, private R2 photo storage, and signed Cloudflare Access email login.
- Migration utilities for current saved instructions and attached photos.

## 1. Upload the source to your GitHub repository

Extract this ZIP. Open `knoedlervks-beep/knoedler-work-instruction` in GitHub.
Choose Add file → Upload files. Upload the CONTENTS of this folder, not the ZIP,
and not an extra parent folder. `package.json`, `vite.config.ts` and
`wrangler.jsonc` must be at the repository root. Keep the repository private.
Include the folders and lockfile. Commit the upload.

## 2. Create storage in your Cloudflare account

In Storage & databases:
1. Create a D1 database named `knoedler-instructions`.
2. Copy its database ID into `wrangler.jsonc`, replacing the all-zero database_id.
3. Create a private R2 bucket named `knoedler-instruction-photos`.
   Leave public access disabled. Cloudflare may ask you to enable R2 billing.
4. In the D1 database Console, run the SQL from
   `drizzle/0000_vengeful_the_enforcers.sql` once to create the tables.
   Alternatively use the CLI migration command below, but do not do both.

Commit the updated `wrangler.jsonc` in GitHub. Database IDs are not passwords.
The binding names must remain exactly `DB` and `BUCKET`.

## 3. Deploy from the Cloudflare screen you showed

Repository: `knoedlervks-beep/knoedler-work-instruction`
Project name: `knoedler-work-instruction`
Build command: `pnpm run build`
Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
Root directory: repository root (leave blank if no root field is required).
Disable non-production branch deployments/preview URLs for this initial setup.
Use Node.js 22.13 or newer and pnpm 11.25.0 (declared in package.json).
Cloudflare should install packages from pnpm-lock.yaml before the build.

The first deployment may use the Access placeholders. The API deliberately
refuses access until you complete step 4. No data is exposed by an unconfigured login.

## 4. Configure email login and your administrator account

In Cloudflare Zero Trust / Cloudflare One, set up your team and enable
One-time PIN as an authentication method. Protect your Worker's production
workers.dev address with an Access self-hosted application. Workers settings
also offer an Enable Cloudflare Access action for the workers.dev address.
Allow ONLY your administrator email and the operator email addresses you want.

Copy the team's domain and the application's Audience (AUD) into the `vars`
section of `wrangler.jsonc`:

- ADMIN_EMAIL: `knoedlervks@gmail.com` (check this is your exact email)
- CF_ACCESS_TEAM_DOMAIN: `https://YOUR-TEAM.cloudflareaccess.com`
- CF_ACCESS_AUD: the Access application's actual audience value

Commit and redeploy. The app verifies JWT signatures, issuer, audience and expiry.
An arbitrary email header cannot sign someone in. The administrator is selected
by ADMIN_EMAIL, never by whichever visitor happens to arrive first.

After login, use Workspace settings to assign each operator email to an
operation and set its Drive folder. Both the Access policy and the app's
operation assignment are required. Sign out/switch accounts at
`https://YOUR-WEBSITE/cdn-cgi/access/logout`.

If transferring old data, import it BEFORE the first successful administrator
login. See MIGRATION.md. Otherwise first login initializes an empty workspace.

## 5. Connect Google Drive (optional, separate setup)

PDF download and saving/editing instructions work without Google Drive.
The existing Drive integration is not connected in this package.
It uses ONE Google account authorized by the administrator; that account must
have write access to every destination folder. Operators sign in using their
own emails, but the server uploads PDFs using this shared Google connection.
Separate Google refresh tokens per operator are not implemented.

Create your own Google Cloud project, enable Drive API, configure the OAuth
consent screen/client, and authorize your Google account with offline access
and an appropriate Drive scope. Existing arbitrary folder access may require
the full Drive scope; drive.file alone does not grant access to all folders.
Keep credentials private. Store these as encrypted Worker secrets in Cloudflare:

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REFRESH_TOKEN

Do not put these in GitHub or wrangler.jsonc. Google OAuth testing mode can
limit refresh-token lifetime; finish the consent-screen setup appropriate to
your organization before relying on it in production.

## Optional command-line setup

Install Node.js 22.13+ and pnpm 11.25.0. In this folder:

```sh
pnpm install --frozen-lockfile
npx wrangler login
npx wrangler d1 create knoedler-instructions
npx wrangler r2 bucket create knoedler-instruction-photos
```

Update database_id in wrangler.jsonc, then initialize tables (only if you did
not already run the SQL in the dashboard):

```sh
pnpm run db:init
pnpm run typecheck
pnpm run build
pnpm run deploy
```

Local development also needs a valid Access token; there is no development
authentication bypass included. Browser testing should use your protected deployment.

## Domain, ownership and backups

Your Cloudflare account controls hosting, D1, R2, login policies and billing.
Your GitHub account controls code. Your Google account controls exported PDFs.
A workers.dev address is provided through Cloudflare; a personal domain is
optional. Add a domain in Worker Settings → Domains & Routes and protect that
hostname with Access too. Update the Access audience if creating a new app.

Before replacing a running database, export it:
`npx wrangler d1 export knoedler-instructions --remote --output=backups/database.sql`
Back up the private R2 bucket as well; SQL alone does not contain photo bytes.
Do not delete the old site until you have checked the transferred records,
photos, editing, PDF output, operator restrictions and backups.

## Validation and limits

See VALIDATION.md for what was checked. Real Cloudflare account deployment,
email login, iPad camera and Google Drive need testing after account setup.
This package preserves the app's existing framework versions, including the
Vinext beta. It does not include iPad device-management/kiosk configuration.

Official setup references:
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/d1/best-practices/import-export-data/
- https://developers.google.com/identity/protocols/oauth2/web-server
