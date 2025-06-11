# 📈 Trending Analysis Color System

## Color-Coded Performance Badges

The health score application now uses a comprehensive color system for trending metrics that provides instant visual feedback on customer performance direction.

### 🟢 **Trending Up** (Green)
- **Score:** 100 points (Best Performance)
- **Pattern:** M1 < M2 < M3 < M4 (Consistent improvement)
- **Example:** Tickets: 15 → 12 → 8 → 5 (decreasing tickets = improving)
- **Meaning:** Customer performance is consistently improving month-over-month

### 🟡 **Stable/Equal** (Yellow) 
- **Score:** 75 points (Good Performance)
- **Pattern:** M1 = M2 = M3 = M4 (Consistent values)
- **Example:** Tickets: 10 → 10 → 10 → 10 (stable performance)
- **Meaning:** Customer performance is steady and predictable

### 🔴 **Trending Down** (Red)
- **Score:** 25 points (Worst Performance)
- **Pattern:** M1 > M2 > M3 > M4 (Consistent decline)
- **Example:** Tickets: 6 → 9 → 15 → 20 (increasing tickets = declining)
- **Meaning:** Customer performance is consistently deteriorating

### ⚫ **Mixed Trend** (Grey)
- **Score:** 50 points (Neutral Performance)
- **Pattern:** All other patterns (fluctuating values)
- **Example:** Tickets: 12 → 8 → 15 → 10 (unpredictable changes)
- **Meaning:** Customer performance is inconsistent or volatile

## Test Data Examples

The `test_trending_data.csv` file includes examples of each pattern:

1. **TechCorp Solutions** (15→12→8→5): 🟢 Trending Up
2. **GreenTech Startup** (5→8→12→16): 🔴 Trending Down (for ticket metrics)
3. **StableCorps Inc** (10→10→10→10): 🟡 Stable
4. **MixedTrends Co** (12→8→15→10): ⚫ Mixed Trend

## Usage Notes

- Color system applies only to metrics with "Use Trending" enabled
- Requires 4 months of data (M1, M2, M3, M4) for proper analysis
- Standard metrics continue to use green/red healthy/unhealthy badges
- CSV uploads should include columns like `Ticket_M1`, `Ticket_M2`, `Ticket_M3`, `Ticket_M4` 