# Threshold Configuration Guide

## Current Thresholds

### Productivity Targets
- **SBL**: 120 LPH (Lines Per Hour)
- **PTL**: 180 LPH (Lines Per Hour)

### Health Color Thresholds
- **Green**: ≥95% of target (On/above target)
- **Amber**: 70-95% of target (10-30% gap)
- **Red**: <70% of target (>30% gap)

### Other Thresholds
- **Buffer Floor**: 20 minutes global, 15 minutes for SBL/PTL
- **Trip Risk**: 0.6 (60% risk threshold)
- **Starvation**: 20 lines minimum, 50% of target LPH
- **PTL Shortfall**: 10% below target

## How to Update Thresholds

### Method 1: Direct Code Edit
Edit `/src/lib/config/stage-targets.ts`:

```typescript
export const STAGE_TARGETS: Record<string, StageTarget> = {
  SBL: { 
    target_lph: 150,  // Change from 120 to 150
    bucket_minutes: 10, 
    expected_duration_hours: 2.5 
  },
  PTL: { 
    target_lph: 200,  // Change from 180 to 200
    bucket_minutes: 10, 
    expected_duration_hours: 2.5 
  }
};

export const HEALTH_COLORS = {
  green: { threshold: 0.9, description: 'On/above target' },  // Change from 0.95
  amber: { threshold: 0.6, description: '10-30% gap' },       // Change from 0.7
  red: { threshold: 0.0, description: '>30% gap or buffer below floor' }
};
```

### Method 2: Environment Variables (Future Enhancement)
Add to `.env.local`:
```
NEXT_PUBLIC_SBL_TARGET_LPH=150
NEXT_PUBLIC_PTL_TARGET_LPH=200
NEXT_PUBLIC_GREEN_THRESHOLD=0.9
NEXT_PUBLIC_AMBER_THRESHOLD=0.6
```

### Method 3: Admin Panel (Future Enhancement)
Create a configuration UI where thresholds can be updated without code changes.

## Impact of Changes

### Increasing SBL Target (120 → 150 LPH)
- **More stations** will show as "red" (productivity issues)
- **Higher expectations** for SBL performance
- **More aggressive** recommendations for improvement

### Increasing PTL Target (180 → 200 LPH)
- **Similar impact** as SBL
- **Higher capacity** requirements
- **More shortfall** alerts if not met

### Adjusting Health Thresholds
- **Green threshold 95% → 90%**: More stations show as healthy
- **Amber threshold 70% → 60%**: Fewer stations show as red
- **More lenient** performance expectations

## Recommendations

1. **Start Conservative**: Don't increase targets too aggressively
2. **Monitor Impact**: Watch how changes affect station classifications
3. **Gradual Adjustment**: Make small incremental changes
4. **Data-Driven**: Base changes on historical performance data
5. **Team Alignment**: Ensure operations team agrees with new targets

## Current Data Analysis

Based on current data:
- **SBL Average**: ~25 LPH (21% of 120 LPH target)
- **All SBL stations** are currently "red" status
- **PTL**: 0 LPH (0% of 180 LPH target)
- **Significant improvement** needed to meet current targets

Consider whether current targets are realistic or need adjustment based on actual operational capabilities.
