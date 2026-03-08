# Shadow Troubleshooting Guide

## Common Shadow Issues and Solutions

### 1. ERROR: Invalid props.style key `elevation` supplied to `Image`

**Problem**: Shadow properties (`elevation`, `shadowColor`, `shadowOffset`, etc.) are being applied directly to `Image` components.

**Solution**: Wrap the Image in a View and apply shadows to the wrapper.

❌ **Wrong:**
```tsx
<Image 
  source={{ uri: imageUrl }}
  style={{
    width: 40,
    height: 40,
    borderRadius: 20,
    elevation: 3,          // ❌ This causes the error
    shadowColor: '#000',   // ❌ This causes the error
  }}
/>
```

✅ **Correct:**
```tsx
<View style={{
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#FFFFFF', // ✅ Solid background for shadow efficiency
  elevation: 3,               // ✅ Applied to View, not Image
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
}}>
  <Image 
    source={{ uri: imageUrl }}
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 20,
      // ✅ No shadow properties on Image
    }}
  />
</View>
```

### 2. WARN: View has a shadow set but cannot calculate shadow efficiently

**Problem**: Shadow properties are applied to Views with transparent or missing background colors.

**Solution**: Always provide a solid background color when using shadows.

❌ **Wrong:**
```tsx
<View style={{
  backgroundColor: 'transparent',  // ❌ Transparent background
  shadowColor: '#000',
  elevation: 5,
}}>
```

❌ **Also Wrong:**
```tsx
<View style={{
  backgroundColor: 'rgba(0,0,0,0.4)', // ❌ Semi-transparent background
  shadowColor: '#000',
  elevation: 5,
}}>
```

✅ **Correct:**
```tsx
<View style={{
  backgroundColor: '#FFFFFF',      // ✅ Solid background
  shadowColor: '#000',
  elevation: 5,
}}>
```

### 3. Using the Shadow Utils

Import and use the shadow utilities to prevent these issues:

```tsx
import { validateShadowStyle, createImageWithShadow } from '../utils/shadowUtils';

// For validating existing styles
const safeStyle = validateShadowStyle(myStyle, 'View');

// For Image components that need shadows
const { wrapperStyle, imageStyle } = createImageWithShadow('medium', myImageStyle);

return (
  <View style={wrapperStyle}>
    <Image style={imageStyle} source={{ uri: imageUrl }} />
  </View>
);
```

## Quick Fixes

### Fix 1: Remove shadows from Images
```bash
# Find all Image components with shadow properties
grep -r "Image.*elevation\|elevation.*Image" src/
```

### Fix 2: Add solid backgrounds to Views with shadows
```bash
# Find Views with transparent backgrounds and shadows
grep -r "backgroundColor.*transparent.*shadow\|shadow.*backgroundColor.*transparent" src/
```

### Fix 3: Use the shadow utilities
```tsx
// Instead of applying shadows directly, use utilities
import { createSafeShadow } from '../utils/shadowUtils';

const styles = StyleSheet.create({
  container: createSafeShadow('medium', '#FFFFFF'),
});
```

## Prevention Checklist

- [ ] Never apply `elevation`, `shadowColor`, `shadowOffset`, `shadowOpacity`, or `shadowRadius` to `Image` components
- [ ] Always use solid background colors (`backgroundColor: '#FFFFFF'`) when applying shadows to Views
- [ ] Avoid transparent backgrounds (`'transparent'` or `'rgba(0,0,0,0)'`) on Views with shadows
- [ ] Use the shadow utility functions for consistent, safe shadow application
- [ ] Test on both iOS and Android to ensure shadows render correctly 