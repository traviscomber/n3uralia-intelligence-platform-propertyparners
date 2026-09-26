# Japanese simplicity standard

These principles govern product UI and implementation choices for Property Partners. They are not decorative references; each one maps to a concrete coding rule.

1. Ma (間) — space
   - Leave visual and cognitive room.
   - In code: prefer fewer blocks, fewer simultaneous actions, and clear separation between primary and secondary content.

2. Kanso (簡素) — simplicity
   - Remove what is not essential to the user's decision.
   - In code: avoid duplicate state, duplicate labels, unnecessary wrappers, and features without a clear user outcome.

3. Seijaku (静寂) — calm
   - The interface should feel quiet even when the operation is complex.
   - In code: avoid noisy alerts, competing CTAs, gratuitous animation, and verbose status copy.

4. Shibui (渋い) — subtle usefulness
   - Quality should be evident without decoration.
   - In code: use restrained components, plain language, and evidence only where it improves a decision.

5. Shizen (自然) — naturalness
   - Flows should match how people actually work.
   - In code: model the business workflow directly; do not expose technical architecture to the user.

6. Wabi-sabi (侘寂) — honest imperfection
   - Missing or incomplete information is shown honestly.
   - In code: use clear empty/partial/error states; never invent values or replace unknowns with false zeroes.

7. Fukinsei (不均斉) — purposeful asymmetry
   - Not every element deserves equal weight.
   - In code: make the next decision dominant and subordinate evidence, history, and methodology.

8. Datsuzoku (脱俗) — freedom from convention
   - Do not copy generic SaaS patterns when they add friction.
   - In code: keep only conventions that help the Property Partners workflow; remove generic dashboards and admin noise.

9. Miegakure (見え隠れ) — hide and reveal
   - Detail appears when needed, not all at once.
   - In code: use progressive disclosure for evidence, methodology, history, and advanced controls.

10. Danshari (断捨離) — remove excess
   - Continually discard what no longer earns its place.
   - In code: delete dead code, stale copy, redundant branches, and obsolete states instead of accumulating layers.

## Default decision rule

One screen, one dominant question, one primary action.

Order of information:
1. What matters now.
2. What decision or action follows.
3. Who owns it.
4. Evidence and detail only on demand.

When two implementations solve the same user need, prefer the one with fewer concepts, fewer states, fewer requests, and less code while preserving correctness, permissions, traceability, and production safety.
