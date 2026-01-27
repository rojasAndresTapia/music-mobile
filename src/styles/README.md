# Theme System

This directory contains the global theme system for the music mobile app.

## Usage

Import theme constants from `../styles/theme`:

```typescript
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../styles/theme';
```

## Available Exports

### Colors
- `Colors.primary` - Main app color (blue)
- `Colors.shuffleActive` - Soft green when shuffle is active
- `Colors.shuffleInactive` - Grey when shuffle is inactive
- `Colors.background` - Main background color
- `Colors.textPrimary` - Primary text color
- And many more...

### Shadows
- `Shadows.small` - Subtle shadow
- `Shadows.medium` - Medium shadow
- `Shadows.large` - Large shadow
- `Shadows.primary` - Shadow with primary color tint
- `Shadows.shuffle` - Shadow with shuffle color tint

### Spacing
- `Spacing.xs` through `Spacing.xxxl` - Consistent spacing values

### BorderRadius
- `BorderRadius.small` through `BorderRadius.full` - Consistent border radius values

### Typography
- `Typography.sizes` - Font sizes (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
- `Typography.weights` - Font weights (normal, medium, semibold, bold)

## Example Usage

```typescript
import { Colors, Shadows, Spacing } from '../styles/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
  text: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
  },
});
```

## Updating Colors

To change colors globally, simply update the values in `theme.ts`. All components using the theme will automatically reflect the changes.
