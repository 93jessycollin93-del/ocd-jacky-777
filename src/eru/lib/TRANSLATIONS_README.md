# Eru i18n — how translations are managed

## File of record

`src/lib/translations.json` is the single source of truth at runtime. Shape:

```jsonc
{
  "en": { "nav": { "home": "Home" }, "settings": { ... } },
  "uk": { "nav": { "home": "Головна" }, ... },
  "zh": { "nav": { "home": "主页" }, ... },     // Simplified Chinese
  "ru": { "nav": { "home": "Главная" }, ... },
  "fr": { ... },
  "es": { ... }
}
```

The runtime loader is `src/context/LanguageContext.jsx`. Components consume it
via `useLanguage()` and call:

```jsx
const { t } = useLanguage();
t('settings.title', undefined, 'Settings')   // (key, args, fallback)
```

The third arg is the **English fallback** rendered when the active locale is
missing the key. Always pass it — it makes the app degrade gracefully and
makes diffs reviewable without opening the JSON.

## Adding a new key

1. Add the key + value to **every** locale block in `translations.json`.
2. Use `t('section.your_key', undefined, 'English fallback')` in the JSX.
3. Run `npm run lint:i18n` to confirm no hardcoded strings were left behind
   on the touched files (see `scripts/audit-strings.mjs`).

## Outsourcing translation work to Crowdin (recommended)

For non-trivial translation passes, machine translation is not enough — a
financial app needs a fluent reviewer per locale. The standard workflow:

1. **Create a Crowdin project** at https://crowdin.com/projects with English
   as the source language and `uk`, `zh-CN`, `ru` (and any others) as targets.
2. **Add the Crowdin GitHub integration** so translators' work auto-opens PRs
   to this repo. Translators see the strings in Crowdin's UI; you review the
   PR and merge.
3. **Configure secrets** in your CI environment (or locally):
   - `CROWDIN_PROJECT_ID` — from the project URL
   - `CROWDIN_PERSONAL_TOKEN` — generate at
     https://crowdin.com/settings#api-key with project read/write scope
4. **Push English source** the first time:
   ```bash
   npm i -g @crowdin/cli
   crowdin upload sources
   ```
5. **Pull completed translations** any time:
   ```bash
   crowdin download
   ```

The `crowdin.yml` at the repo root is already configured. Translations come
back as per-locale files (`translations.uk.json` etc.); use
`scripts/sync-translations.mjs` to merge them back into `translations.json`.

## Why we don't rely on machine translation alone

Russian, Ukrainian, and Chinese all have multiple valid renderings for
financial / app vocabulary ("wallet", "trade", "balance", "escrow", "drop").
Machine translation will pick the most common — but not always the correct
context. Examples:

- "Wallet" → ru: «Кошелёк» (correct for crypto) vs «Бумажник» (wrong — physical)
- "Trade" → zh: 交易 (correct) vs 贸易 (international trade only)
- "Sign out" → uk: «Вийти» (correct) vs «Вихід» (noun form, wrong context)

For Eru, every pushed translation is best-effort by an LLM and **needs spot
review by a fluent speaker** before it's marketed as production-grade.

## Locale variants

- `zh` is Simplified Chinese (mainland China, Singapore). Traditional Chinese
  (`zh-TW`, used in Hong Kong / Taiwan) is intentionally NOT supported yet —
  the vocabulary differs enough that auto-converting is unsafe.
- `uk` is Ukrainian, distinct from Russian. They share a script but use
  different vocabulary, idioms, and verb aspects. Don't translate one as the
  other.

## Skipping legal copy

`PrivacyPolicy.jsx` and the legal-document tabs inside `Settings.jsx`
(Disclaimer / Terms / Privacy / Tax) are **intentionally NOT machine
translated**. They're legal documents — translation needs a lawyer's review
per jurisdiction. They render in English regardless of the locale until a
human-reviewed translation is supplied.
