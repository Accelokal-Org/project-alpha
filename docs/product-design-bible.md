# Deskonekt — Product and Design Bible

## Brand hierarchy

**Deskonekt**

*Your classes. Your work. One desk.*

**by Accelokal**

The product name is **Deskonekt**. Preserve the tagline exactly: **“Your classes. Your work. One desk.”** Preserve its three short sentences, capitalization, and punctuation. The attribution is **“by Accelokal”**, subordinate to the product name and tagline.

## Positioning

Deskonekt is a seamless academic workspace built around the teacher. It connects classes, schedules, lesson plans, attendance, assessments, scores, grades, and academic workflows in one practical workspace.

This statement describes the product vision. The current implementation is the foundation slice described in [implementation.md](implementation.md); planned capabilities must not be presented as already available.

## Meaning of the name

- **Desk**: the teacher’s workspace.
- **Konekt**: everything academic is connected.
- **Deskonekt**: one place where the teacher’s day-to-day academic work comes together.

## Brand in the application

- The sign-in experience presents the name, exact tagline, and Accelokal attribution.
- The working application uses a compact Deskonekt wordmark with the smaller “by Accelokal” attribution. Keep the space focused on the teacher’s records and tasks.
- Browser titles and application metadata use Deskonekt. Shared UI copy lives in `lib/brand.ts`.
- Use practical, direct labels: My classes, Student roster, Record attendance, Publish scores, Submit grades.
- Use the tagline on introduction and brand surfaces; avoid repeating promotional copy inside every operational screen.

## Design personality

Take interaction cues from Google Sheets and Google Workspace: predictable navigation, information density, first-class tables, direct editing, compact forms, keyboard access, and clear status feedback. A teacher should be able to find a class, update records, and move on.

Keep the workspace predominantly white and soft blue-gray, with Accelokal colors as accents:

| Color | Purpose |
| --- | --- |
| Deep navy `#07124A` | Structure, navigation, strong headings |
| Electric purple `#6133E8` | Primary actions and selected states |
| Cyan/teal `#11B8C7` | Secondary emphasis and brand accents |
| Soft blue-white `#F4F7FB` | Workspace background |
| White `#FFFFFF` | Tables, forms, content surfaces |

Use restrained typography and minimal decoration. Favor useful tables and contextual actions over giant hero cards, decorative metrics, saturated gradients, or excessive animation. Reserve the more expressive brand treatment for sign-in and introductory surfaces.

## Product principles

- Build around the teacher’s daily academic work and unify teaching/advisory responsibilities.
- Treat school policies, schedules, grading structures, and templates as configurable data.
- Connect academic records and workflows while preserving role and assignment boundaries.
- Students receive only their own permitted, officially published or released information.
- Keep the MVP focused on academic records and workflows; exclude LMS, messaging, and native AI features.
