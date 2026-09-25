# Transfer your existing instructions and photos

Existing production data is NOT inside this ZIP. Direct database inspection
returned truncated document fields, so those results were not used as a backup.
The utility below exports full current documents through the website API.
It includes settings, current instructions and their attached photos. It does
NOT include older revision history, unattached photos, or PDFs already in Drive.
Drive file IDs are retained; the connected Google account must be able to edit
them. Keep the original site if you need its historical database records.

1. Pause edits while taking this snapshot. On a desktop browser, open the OLD
   site and sign in as administrator:
   https://knoedler-work-instructions.rahul-thakur.chatgpt.site
2. Open Developer Tools → Console. Review and run the contents of
   `scripts/export-current-data.js`. This reads only same-origin app records
   and photos and downloads `knoedler-backup.json` to your computer.
3. Keep that file private. Do not upload it to GitHub. Use a NEW EMPTY D1
   database whose tables are initialized. Do not log into the new app yet.
4. In this package folder, after installing dependencies and `wrangler login`:

```sh
node scripts/prepare-import.mjs /path/to/knoedler-backup.json
node scripts/import-photos.mjs
npx wrangler d1 execute knoedler-instructions --remote --file=backups/prepared/import.sql
```

Use quotes around a file path with spaces. The photo script uploads to the
R2 bucket named in wrangler.jsonc. The SQL intentionally uses INSERT, not
REPLACE: it will not silently overwrite existing records. Do not rerun SQL
against a partially populated database; inspect any failure first. Use a new
empty destination if you must restart the import.

5. Finish Access settings and log in as the new administrator. Check instruction
   count, all photos/annotations, text sheets, tables and PDF downloads. Make a
   test edit and sign in as an operator to verify operation restrictions.
6. Only then start using the new site. Retain the original site and snapshot
   until you have confirmed the migration and made backups of D1 and R2.

A current-state snapshot creates one revision per imported current document.
This is not a full historical database migration. Neither migration utility
has been run against your production data or your new Cloudflare account.
