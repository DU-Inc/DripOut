export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string) => {
  const hasMinLength = password.length >= 8;
  const hasNumbers = (password.match(/\d/g) || []).length >= 2;
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid: hasMinLength && hasNumbers && hasSpecial,
    hasMinLength,
    hasNumbers,
    hasSpecial,
  };
};

export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
  return usernameRegex.test(username);
};

export const validateName = (name: string): boolean => {
  return name.length >= 2;
};

export const validateDOB = (dob: string): boolean => {
  const date = new Date(dob);
  const now = new Date();
  const age = now.getFullYear() - date.getFullYear();
  return age >= 13 && age <= 100;
}; 