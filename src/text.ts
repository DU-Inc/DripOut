// Language text constants for the application
export const text = {
  // Auth-related text
  auth: {
    signIn: {
      title: "Sign In",
      // ... other sign in texts
    },
    signUp: {
      title: "Sign Up",
      subtitle: "Create your account",
      // ... other sign up texts
      footer: {
        haveAccount: "Already have an account?",
        signIn: "Sign In"
      },
      loading: "PLEASE WAIT\nCreating your account...",
      success: "Sign Up Successful!"
    },
    // ... other auth-related screens
  },
  // Components text
  components: {
    collapsable: {
      emailVerification: "Email Verification",
      birthdayTitle: "Birthday",
      personalDetailsTitle: "Personal Details",
      verified: "Verified",
      verifying: "Verifying",
      emailPrefix: "email",
      phonePrefix: "phone",
      birthdayPrefix: "Born on",
      yearsOld: "years old",
      passwordSaved: "Password saved"
    },
    birthdayPicker: {
      title: "Add your birthday",
      subtitle: "This won't be part of your public profile.",
      ageRequirement: "You must be at least 12 years old to use DripOut.",
      buttonNext: "Next",
      yearSelectorHint: "Tap to select year"
    },
    personalDetails: {
      title: "Complete Your Profile",
      subtitle: "Let's finish setting up your account.",
      firstNamePlaceholder: "First Name",
      lastNamePlaceholder: "Last Name (optional)",
      usernamePlaceholder: "Username",
      passwordPlaceholder: "Password",
      confirmPasswordPlaceholder: "Confirm Password",
      joinButton: "Join Now",
      scroll: "Scroll to see missing fields",
    },
    successOptions: {
      title: "Your account has been successfully created",
      subtitle: "Would you like to complete onboarding to get more accurate content and a tailored experience or proceed to home?",
      onboardingButton: "Complete Onboarding",
      homeButton: "Go to Home",
      signIn: {
        title: "You're authenticated!",
        subtitle: "We noticed you didn't complete onboarding. Would you like to complete it now for a more personalized experience?",
        personalizedTitle: "Hey, %firstName%! You're authenticated!",
      }
    },
    // ... other component-specific text
  },
  // Welcome screen text
  welcome: {
    title: "Welcome to DripOut",
    subtitle: "Share your style journey with friends and fashion enthusiasts.",
    divider: {
      guest: "Not ready to commit?",
      guestLink: "Continue as Guest",
      or: "or"
    },
    buttons: {
      getStarted: "Get Started",
      alreadyHaveAccount: "I already have an account",
    }
  },
  // ... other sections
}; 