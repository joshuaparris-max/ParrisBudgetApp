Design System Notes (v0.1)
==========================

Foundations
- Typography: Geist (sans) as default; Geist Mono for code/meta.
- Colors (light): background #ffffff, foreground #171717. Dark: background #0a0a0a, foreground #ededed.
- Spacing: 4/8/12/16/24/32 scale; buttons/cards use 12/16 padding.

Traffic lights & pacing
- Budget status: Green when remaining ≥ 0; Red when remaining < 0.
- Pacing badge: Green when paceDelta ≥ 0; Amber when paceDelta < 0 but remaining ≥ 0; Red follows budget Red.
- Stale banner: Amber when last import >7 days; could become Red if >14 days (future).

Components (shadcn/Tailwind)
- Buttons: primary (solid foreground on background), secondary (outline).
- Cards: soft shadow, 12–16px radius; sections: header, value, meta.
- Pills: categories and rule source; use subtle background tints.

Responsive patterns
- Mobile-first; stack cards vertically; tabs as horizontal scrollable.
- Desktop: grid for per-category cards; two-column layout for dashboard hero + list.

Accessibility
- Maintain 4.5:1 contrast on text vs background; status colors supplemented with text labels.
- Focus states visible; hit targets ≥44px height.

