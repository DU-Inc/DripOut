export type Post = {
  id: string;
  username: string;
  userAvatar: string;
  location?: string;
  imageUrl: string;
  likes: number;
  caption: string;
  comments: number;
  timestamp: string;
};

export type User = {
  id: string;
  username: string;
  avatar: string;
  isFollowing: boolean;
}; 