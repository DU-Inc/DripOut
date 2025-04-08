export type StyleCategory = 'fashion' | 'beauty' | 'lifestyle';

export type StylePreference = {
  id: string;
  name: string;
  category: StyleCategory;
  icon: string;
};

export type UserPreferences = {
  selectedStyles: string[];
  categories: {
    [key in StyleCategory]: string[];
  };
}; 