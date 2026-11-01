# Kikapu Brand Guidelines

**Product:** Kikapu, a Kenyan household receipt-scanning and expense-tracking app
**Tagline:** Every receipt has a story. Make yours add up.
**Status:** Documents the existing, shipped visual identity (live at kikapu-tawny.vercel.app). This is not a rebrand; it is the single source of truth that the `brand` skill's sync script reads to regenerate design tokens.
**Last updated:** 2026-11-01

## Quick Reference

| Token | Value |
|---|---|
| Primary Color | #14213D |
| Secondary Color | #FAF9F6 |
| Accent Color | #10B981 |
| Body Font | Inter |
| Display Font | Sora |
| Border Radius | 0.85rem |

## Brand Essence

Kikapu ("basket" in Swahili) turns a pile of paper receipts into a clear picture of where a household's money goes. The visual identity needs to feel trustworthy enough for financial data, warm enough for a busy parent doing this at 9pm after the kids are asleep, and quick to scan on a cracked-screen Android phone with patchy data.

Design principles:
- **Navy, not black.** A deep midnight navy carries the seriousness of a finance app without the coldness of pure black or the harshness of pure white backgrounds.
- **One accent color, used sparingly.** Emerald green appears only for primary actions and positive/success states, so it keeps its meaning (go, save, confirm) instead of becoming decoration.
- **Ivory, not white.** The light-mode background is a warm off-white, closer to paper, which suits a product about physical receipts.
- **KES-first.** Numbers are the hero. Color never competes with the amount on screen.

## Color Palette

### Primary Colors

| Name | Hex | RGB | HSL | Usage |
|---|---|---|---|---|
| Navy | #14213D | rgb(20, 33, 61) | hsl(221, 51%, 16%) | Primary text and headings, light-mode button backgrounds, light-mode logo mark background, focus rings' offset |
| Emerald (Primary, Dark Mode) | #22C38E | rgb(34, 195, 142) | hsl(160, 70%, 45%) | Dark mode swaps the primary action color to a brighter emerald, since navy loses contrast against the dark background. This is an intentional per-theme substitution, not a shade of navy. |

### Secondary Colors

| Name | Hex | RGB | HSL | Usage |
|---|---|---|---|---|
| Ivory | #FAF9F6 | rgb(250, 249, 246) | hsl(45, 29%, 97%) | Light mode page background. Warm off-white rather than pure white, evoking paper receipts. |
| Charcoal Navy (Dark Mode) | #0D1321 | rgb(13, 19, 33) | hsl(221, 42%, 9%) | Dark mode page background |

### Accent Colors

| Name | Hex | RGB | HSL | Usage |
|---|---|---|---|---|
| Emerald | #10B981 | rgb(16, 185, 129) | hsl(160, 84%, 39%) | Primary call-to-action buttons, active nav state, links, focus ring, "success" semantic color (light mode) |
| Emerald (Dark Mode) | #22C38E | rgb(34, 195, 142) | hsl(160, 70%, 45%) | Same role as above, retuned for dark backgrounds |

### Neutral & Supporting Colors

| Name | Hex | RGB | HSL | Usage |
|---|---|---|---|---|
| Slate | #64748B | rgb(100, 116, 139) | hsl(215, 16%, 47%) | Secondary / muted text, placeholder text, captions |
| Light Card | #FFFFFF | rgb(255, 255, 255) | hsl(0, 0%, 100%) | Light mode card and popover surfaces, raised above the ivory page background |
| Dark Card | #151D2E | rgb(21, 29, 46) | hsl(221, 38%, 13%) | Dark mode card and popover surfaces |
| Border / Input (Light) | #DCE2E9 | — | hsl(215, 20%, 88%) | Light mode borders and input outlines |
| Border / Input (Dark) | #272F42 | — | hsl(221, 28%, 22%) | Dark mode borders and input outlines |

### Semantic Colors

| Name | Hex | RGB | HSL | Usage |
|---|---|---|---|---|
| Warning Amber | #F59E0B | rgb(245, 158, 11) | hsl(38, 92%, 50%) | Budget-approaching-limit warnings, caution badges |
| Destructive Red | #EF4444 | rgb(239, 68, 68) | hsl(0, 84%, 60%) | Delete actions, over-budget states, validation errors |
| Success | #10B981 | rgb(16, 185, 129) | hsl(160, 84%, 39%) | Shares the Emerald accent value; used for "within budget," "saved," and confirmation states |

## Accessibility

Kikapu targets WCAG 2.1 AA (4.5:1 minimum contrast for normal text, 3:1 for large text and UI components).

| Pair | Ratio | Result |
|---|---|---|
| Navy text on Ivory background | 15.17:1 | Pass AAA |
| Navy text on white card | 15.97:1 | Pass AAA |
| Ivory text on Navy button | 15.17:1 | Pass AAA |
| Navy text on Emerald button | 6.30:1 | Pass AA + AAA |
| Navy text on Amber warning badge | 7.44:1 | Pass AAA |
| Slate text on Ivory background | 4.52:1 | Pass AA (normal text, by a narrow margin — do not use Slate at a smaller size than the current 14px minimum) |
| White text on Destructive Red button | 3.76:1 | Passes the 3:1 UI-component threshold; below the 4.5:1 normal-text threshold. Acceptable for an icon-only or short-label button at the current size, but do not set long sentences in white-on-red. |

**Fixed in this pass:** the light-theme `--accent-foreground` and `--success-foreground` tokens in `client/src/index.css` were white-on-emerald (2.54:1, fails AA). Both now resolve to Navy (6.30:1). Dark mode was already correct and was not changed.

**Known follow-up:** the Destructive Red pairing above is a minor, longstanding gap, not something introduced here — flag before shipping any longer-form destructive-button copy.

Other accessibility commitments already in the codebase: visible focus rings on every interactive element (`:focus-visible` ring), `prefers-reduced-motion` support, and no color-only state indicators (budget and status always pair color with an icon or label).

## Typography

| Role | Font | Source |
|---|---|---|
| Display / Headings (h1-h4) | Sora, bold | Google Fonts, loaded in `client/index.html` |
| Body, UI, numbers | Inter | Google Fonts, loaded in `client/index.html` |

Numbers (receipt totals, budget figures) always use Inter's tabular figures where supported, so columns of KES amounts align.

## Logo Usage

The mark is a Lucide `ShoppingBasket` icon inside a rounded square filled with the primary color (Navy in light mode, Emerald in dark mode), paired with the "Kikapu" wordmark set in Sora bold.

Current implementation: `client/src/components/marketing/MarketingNav.tsx`, `MarketingFooter.tsx`, and the auth pages all build this mark inline (an 8x8 rounded square at `rounded-lg`, icon at `size-4.5`) rather than from a single shared logo asset.

Guidelines:
- Keep the icon-in-rounded-square + wordmark pairing together. Do not use the icon alone as a standalone logo without the wordmark, except as a favicon or app icon.
- Maintain clear space around the mark equal to the height of the square itself.
- Minimum size: the 32px (`size-8`) square used in navigation is the practical floor; do not render the mark smaller than that.
- Do not recolor the mark outside the Navy/Emerald pairing defined above, stretch it, rotate it, or place it on a background that drops contrast below the ratios in the Accessibility section.

## Voice & Tone

**Personality:** Warm, practical, honest, never overclaiming. Kikapu talks to a busy parent, not a finance professional — it respects their time and intelligence without assuming financial literacy they may not have.

**Voice chart:**

| We are | We are not |
|---|---|
| Plain and direct | Jargon-heavy or "fintech-speak" |
| Encouraging | Preachy or guilt-tripping about spending |
| Honest about limits (e.g. OCR mistakes) | Overpromising ("AI-powered" when a feature is just pattern matching) |
| Kenyan-grounded (KES, M-Pesa, local store names) | Generic or US-centric in examples |

**Tone by context:**
- Onboarding and empty states: encouraging, light ("Scan your first receipt to see where it goes").
- Budget warnings: factual, non-judgmental ("You're at 92% of your groceries budget this month"), never alarmist.
- Errors (OCR failure, network issue): honest and actionable ("Couldn't read that receipt clearly — try retaking the photo in better light"), never blaming the user.

**Prohibited terms:** "leverage," "synergy," "revolutionize," "AI-powered" (when describing the deterministic, non-AI receipt parser), "smart" as a filler adjective, exclamation-point stacking.

## Imagery Guidelines

- Photography, where used, should show real Kenyan shopping contexts: dukas, supermarkets, open-air markets, receipts in hand, not generic stock-photo finance imagery (calculators, piggy banks, suits shaking hands).
- Icons are Lucide (outline style, `size-4` to `size-6`, matching the icon library already used throughout the app) for consistency; do not mix in a second icon set.
- Illustrations, if introduced, should stay in the Navy/Emerald/Ivory/Amber palette defined above rather than introducing new brand colors.
