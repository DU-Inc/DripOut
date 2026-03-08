export const text = {
  splash: {
    leftPanel: 'DRIP',
    rightPanel: 'OUT',
    dash: '',
  },
  welcome: {
    title: 'Welcome to DripOut',
    subtitle: 'Discover and Share Your Style, Your Way.',
    buttons: {
      getStarted: "Let's Get Started",
      alreadyHaveAccount: 'Already have an account?',
    },
    divider: {
      guest: 'Continue as',
      guestLink: 'Guest',
      or: 'or with',
    },
  },
  auth: {
    signIn: {
      title: 'Welcome Back',
      subtitle: 'Sign in to continue',
      emailPlaceholder: 'Username, email or phone number',
      passwordPlaceholder: 'Enter your password',
      forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
      button: 'Sign In',
      terms: 'Moving forward means you agree with our terms and conditions',
      exitConfirm: {
        title: 'Confirm Exit',
        message: 'Your progress will be lost. Would you like to continue or complete sign in?',
        stayButton: 'Continue Sign In',
        exitButton: 'Exit',
      },
      faceId: {
        toggle: 'Use Face ID',
      },
      identifierType: {
        email: 'Email',
        phone: 'Phone',
        username: 'Username'
      }
    },
    forgotPassword: {
      title: 'Reset Password',
      subtitle: 'We understand, let\'s help you securely reset your password.',
      emailPlaceholder: 'Enter your email address',
      phonePlaceholder: 'Enter your phone number',
      verificationTitle: 'Verification',
      verificationSubtitle: 'Enter the 4-digit code sent to your {type}.',
      codeHint: 'For demo purposes, use code: 0000',
      codePlaceholder: 'Enter 4-digit verification code',
      newPasswordTitle: 'New Password',
      newPasswordSubtitle: 'Create a new password for your account.',
      passwordPlaceholder: 'Enter your new password',
      confirmPasswordPlaceholder: 'Confirm your new password',
      buttons: {
        continue: 'Continue',
        resetPassword: 'Reset Password'
      },
      alerts: {
        confirmExit: {
          title: 'Password Not Reset',
          message: 'Your password has not yet been reset. Would you like to continue setting a new password or go back?',
          continue: 'Enter New Password',
          exit: 'Remembered Old Password'
        },
        success: {
          title: 'Success!',
          message: 'Your password has been reset successfully.',
          button: 'Sign In'
        }
      }
    },
    signUp: {
      title: 'Create Account',
      subtitle: 'Join our community',
      steps: {
        basic: {
          title: 'Basic Details',
          emailPlaceholder: 'Email',
          passwordPlaceholder: 'Password',
          confirmPasswordPlaceholder: 'Confirm Password',
        },
        profile: {
          title: 'Profile Info',
          namePlaceholder: 'Full Name',
          usernamePlaceholder: 'Username',
          dobPlaceholder: 'Date of Birth',
        },
        preferences: {
          title: 'Your Style',
          subtitle: 'Tell us about your interests',
        },
        complete: {
          title: "You're All Set!",
          subtitle: 'Your account has been created successfully',
        },
      },
      terms: 'Moving forward means you agree with our terms and conditions',
      social: {
        google: 'Continue with Google',
        apple: 'Continue with Apple',
      },
      divider: 'Or continue with',
      footer: {
        haveAccount: 'Already have an account?',
        signIn: 'Sign In',
      },
      buttons: {
        next: 'Next',
        continue: 'Continue',
        join: 'Join Now',
        createAccount: 'Create Account',
      },
      loading: 'Creating your account...',
      success: 'Sign Up Successful!',
    },
    validation: {
      email: {
        required: 'Email is required',
        invalid: 'Please enter a valid email address',
      },
      phone: {
        required: 'Phone number is required',
        invalid: 'Please enter a valid phone number',
      },
      password: {
        required: 'Password is required',
        minLength: 'Password must be at least 8 characters',
        numbers: 'Password must contain at least 2 numbers',
        special: 'Password must contain at least 1 special character',
        match: 'Passwords do not match',
        checklist: {
          title: "Let's help you keep your account safe",
          minLength: 'At least 8 characters',
          numbers: 'At least 2 numbers',
          special: 'At least 1 special character',
        },
      },
      username: {
        required: 'Username is required',
        minLength: 'Username must be at least 3 characters',
        invalid: 'Username can only contain letters, numbers, and underscores',
      },
      name: {
        required: 'Full name is required',
        minLength: 'Name must be at least 2 characters',
      },
      dob: {
        required: 'Date of birth is required',
        invalid: 'Please enter a valid date of birth',
      },
      terms: {
        required: 'You must agree to the terms and conditions',
      },
      code: {
        required: 'Verification code is required',
        invalid: 'Please enter a valid 4-digit code'
      }
    },
  },
  components: {
    identifierInput: {
      emailTitle: "What's your email?",
      phoneTitle: "What's your number?",
      subtitle: "This information is not shared on the app.",
      emailToggle: "Email",
      phoneToggle: "Phone",
      emailPlaceholder: "Email",
      phonePlaceholder: "Phone Number",
      verificationNote: "We will contact you to verify"
    },
    passwordChecklist: {
      valid: "Password valid",
      match: "Passwords match"
    },
    birthdayPicker: {
      title: "What is your birthday?",
      subtitle: "This information isn't shared on the app and is used to keep the community safe.",
      placeholder: "Birthday",
      ageDisplay: "{age} years old",
      ageRequirement: "You must be at least 12 years old",
      continueButton: "Personal Details"
    },
    verificationPanel: {
      subtitle: 'We sent a verification code to',
      verified: 'Verified',
      verifying: 'Verifying...',
      tooManyAttempts: 'Too many attempts',
      verifyButton: 'Verify Code',
      resendWithTimer: 'Resend code in {time}s',
      resendReady: 'Didn\'t receive a code?',
      resendButton: 'Resend Code',
      resendCodeIn: 'Resend code in',
      seconds: 'seconds',
      resendCode: 'Resend verification code',
      emailVerified: 'Email verified successfully',
      verificationFailed: 'Verification failed',
      enterCode: 'Please enter the 6-digit code sent to your email'
    },
    collapsable: {
      emailVerification: "Email Verification",
      verified: "Verified",
      verifying: "Verifying",
      emailPrefix: "email",
      phonePrefix: "phone",
      birthdayTitle: "Birthday",
      birthdayPrefix: "Birthday:",
      yearsOld: "years old",
      personalDetailsTitle: "Personal Details",
      passwordSaved: "Password saved"
    },
    personalDetails: {
      title: "Personal Details",
      subtitle: "Define You — Set your identity in style",
      scroll: "Scroll",
      firstNamePlaceholder: "First Name",
      lastNamePlaceholder: "Last Name (Optional)",
      usernamePlaceholder: "Username (6-10 characters)",
      passwordPlaceholder: "Password",
      confirmPasswordPlaceholder: "Confirm Password",
      joinButton: "Join Now"
    }
  }
}; 