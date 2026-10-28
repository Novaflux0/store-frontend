# @agency/ui

Minimal, accessible React 19 primitives shared by `storefront` (including the Release 2
portal) and available to the `admin` app. Server-component safe: no hooks, no `'use client'`.

| Export                                      | Notes                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`, `ButtonLink`, `buttonClassName()` | Variants `primary` / `ghost`, sizes `md` / `lg`. `Button` defaults to `type="button"`. Use `buttonClassName()` to style `next/link`.  |
| `Field`                                     | Label + control + hint + error. The control is a render function receiving `id`, `aria-invalid`, `aria-describedby`, `aria-required`. |
| `Input`, `Textarea`, `Select`               | Styled native controls (React 19 `ref` as a prop, so React Hook Form's `register()` spreads onto them).                               |
| `CheckboxField`                             | Checkbox with label on the right and a linked error message.                                                                          |
| `Container`                                 | Centred max-width column; `as` picks the element (`section`, `header`, …).                                                            |
| `VisuallyHidden`                            | `sr-only` text.                                                                                                                       |
| `cx()`                                      | Joins class names, skipping falsy values.                                                                                             |

```tsx
<Field id="email" label="Email" error={errors.email?.message} required>
  {(control) => <Input type="email" autoComplete="email" {...control} {...register('email')} />}
</Field>
```

## Styling

Components use Tailwind v4 utilities that rely on the design tokens defined in
`storefront/src/styles/globals.css` (`bg`, `fg`, `surface`, `border`, `muted`, `danger`,
`neon-cyan`, `font-display`, `ease-futuristic`). The consuming app must scan this
package's sources so the classes are generated:

```css
@source '../../../shared/ui/src';
```

## Build and tests

Same dual CommonJS / ESM build as the other shared packages
(`shared/scripts/build-package.mjs`).
React is a peer dependency. `pnpm test` runs Vitest + Testing Library in jsdom with an
80% coverage threshold.
