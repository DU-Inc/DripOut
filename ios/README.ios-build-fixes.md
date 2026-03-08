# iOS Build Fixes for DripOut

## Issues Fixed

1. **Swift Optional Errors with Firebase**
   - Fixed by specifying Firebase SDK version to 10.22.0
   - Switched from static to dynamic frameworks with `use_frameworks\! :linkage => :dynamic`

2. **Missing Header Files**
   - Fixed missing `FBReactNativeSpec.h` file by creating it manually 
   - Added `pre_install` and `post_install` hooks in Podfile to ensure headers are in the right places

3. **Include Path Errors**
   - Patched `Conv.h` to use direct path to `double-conversion.h`
   - Patched `FBString.h` to use direct path to `fmt/format.h`
   - Patched `InspectorInterfaces.h` to use direct path to `folly/dynamic.h`
   - Added proper header search paths to troublesome targets

## How to Apply Fixes

1. Run the `fix_ios_build.sh` script before building:
   ```
   cd ios
   ./fix_ios_build.sh
   ```

2. Open the project in Xcode:
   ```
   open DripOutApp.xcworkspace
   ```

3. Build the project in Xcode (may take 10-15 minutes for first build)

## Important Notes

- The first build is always the slowest and may appear to hang at certain points. This is normal.
- If you clean the project or run `pod install` again, you'll need to rerun the `fix_ios_build.sh` script.
- Enabling the New Architecture (Fabric) can cause additional build issues, but it's required for some newer React Native features.

## Podfile Modifications

The following key modifications were made to the Podfile:

1. Added Firebase SDK version specification:
   ```ruby
   $FirebaseSDKVersion = '10.22.0'
   $RNFirebaseAsStaticFramework = false
   use_frameworks\! :linkage => :dynamic
   ```

2. Added header creation in pre_install hook
3. Added header search paths for problematic targets
4. Added patching for include paths in problematic files
