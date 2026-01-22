# Precalculated Grid

> Display every possible time at once and scroll to the correct one

Every clock, whether mechanical, digital, or atomic, holds an internal state that is fundamentally unreadable to humans. Springs and gears, oscillating crystals, decaying atoms: all must be "translated" into something we can understand.

This translation happens constantly. Wastefully. Redundantly. A wrist watch for example has dozens of intricate mechanisms for the sole purpose of making that internal state readable. If we cut humans out of the equation, it could be simply a crystal and a battery.

The Precalculated Grid takes a more pragmatic approach: display every possible human-readable time at once and simply scroll to the correct one. The first 236,196 six-digit combinations are arranged in a 486×486 grid. Valid times are green; impossible times (like 13:87:63) are red. Their exclusion calculation was skipped for optimization, of course (but the colour coding is a nice to have).

Each second, the view pans to center on the current time. No translation required.

I've been made aware that what I've been referring as a "pan" is a mathematical operation known as a "translation". No matter.
