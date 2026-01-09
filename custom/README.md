# Custom Clock

Design your own time system. Configure any number of hands, each with its own units per rotation, creating cascading subdivisions of the day.

## Features

- **Configurable hands**: Add as many hands as you want, each with custom units per rotation
- **Number styles**: Arabic numerals, Roman numerals, or none
- **Cycles per day**: 1 for 24h-style clocks, 2 for 12h-style clocks
- **URL persistence**: Share your custom clock via URL
- **Presets**: Quick access to common configurations

## How It Works

Hands are ordered from slowest to fastest. We divide the day, then subdivide that division, and so on.

For example, with hands configured as [12, 60, 60]:
- The slowest hand (hours) divides the day into 12 parts
- The middle hand (minutes) subdivides each hour into 60 parts
- The fastest hand (seconds) subdivides each minute into 60 parts

This is equivalent to a standard 12-hour clock.

## Visuals

Hand appearance is calculated automatically based on position:
- **Color**: Black for all hands, red for the fastest
- **Length**: `0.85 × (n + 2t)² / (3t − 1)²` where n=index, t=total hands
- **Width**: Linear from 6% (slowest) to 2% (fastest) of radius
- **Spring physics**: Only the fastest hand has spring animation

Tick marks are drawn for each hand level, with slower hands having larger ticks that overlay faster ones.

## Presets

| Preset | Configuration | Description |
|--------|---------------|-------------|
| Regular 12h | 12, 60, 60 (2x/day) | Standard 12-hour clock |
| Regular 24h | 24, 60, 60 | 24-hour variant |
| Decimal | 10, 10, 10 | Base-10 time (1000 millidays per day) |
| Binary | 2, 2, 2, 2 | 4 hands, each with 2 positions (16 states per day) |
| Hexadecimal | 16, 16, 16 | Base-16 for the computationally inclined |

## URL Format

Configuration is stored in the URL for easy sharing:

```
?h=12,60,60&n=arabic&c=2
```

- `h`: Comma-separated hand units (slowest to fastest)
- `n`: Number style (`arabic`, `roman`, `none`)
- `c`: Cycles per day (default 1, use 2 for 12-hour clocks)
