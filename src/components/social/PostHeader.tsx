import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../../Config/firebaseconfig';
import { isRealUserId } from '../../utils/userUtils';
import Icon from 'react-native-vector-icons/Ionicons';

// Define FashionPost interface here since it's needed
interface FashionPost {
  id: string;
  userId: string;
  username: string;
  userDisplayName?: string;
  userAvatar?: string;
  title?: string;
  gallery: string[];
  caption: string;
  tags: string[];
  outfitItems: any[];
  publishedDate: string;
  comments: any[];
  commentCount: number;
  upvotes: number;
  saves: number;
  isSaved: boolean;
  isUpvoted: boolean;
  isFollowing?: boolean;
  createdAt?: any;
}


interface PostHeaderProps {
  post: FashionPost;
  styles: any;
  isDarkMode: boolean;
  textColor: string;
  subTextColor: string;
  mainColor: string;
  onFollowToggle: (postId: string, userId: string) => void;
}

const PostHeader: React.FC<PostHeaderProps> = ({
  post,
  styles,
  isDarkMode,
  textColor,
  subTextColor,
  mainColor,
  onFollowToggle
}) => {
  const navigation = useNavigation();

  const handleProfilePress = () => {
    console.log('PROFILE IMAGE CLICK - userId:', post.userId);
    
    // Check if this post is from the current user
    const currentUser = auth().currentUser;
    console.log('COMPARING - Post userId:', post.userId, 'type:', typeof post.userId);
    console.log('COMPARING - Current user uid:', currentUser?.uid, 'type:', typeof currentUser?.uid);
    console.log('COMPARING - Are they equal?', currentUser?.uid === post.userId);
    
    // Check for valid userIds (not unknown or mock users)
    const isRealUserId = post.userId && 
      !post.userId.includes('unknown') && 
      !post.userId.includes('mock');
      
    if (currentUser && isRealUserId && post.userId === currentUser.uid) {
      // If it's the current user, navigate to ProfileTab
      console.log('This is the current user, navigating to ProfileTab');
      // Navigate to profile within the same tab group
      (navigation as any).jumpTo('ProfileTab');
    } else {
      // Check if this is a mock/unknown user or a real user
      const isMockOrUnknown = post.userId && 
        (post.userId.includes('unknown') || post.userId.includes('mock'));
        
      if (isMockOrUnknown) {
        console.log('This is a demo/mock user, showing friendly message');
        Alert.alert('This is a demo profile and not available for viewing.');
      } else {
        // If it's a real user, navigate to UserDetailScreen
        console.log('This is another user, navigating to UserDetailScreen');
        (navigation as any).navigate('UserDetailScreen', { 
          userId: post.userId, 
          username: post.username
        });
      }
    }
  };

  return (
    <View style={styles.inspirationHeader}>
      {/* User info with profile picture */}
      <View style={styles.userInfoContainer}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleProfilePress}
        >
          {post.userAvatar && post.userAvatar.trim() ? (
            <Image
              source={{ uri: post.userAvatar }}
              style={[
                styles.profileImage,
                {
                  borderWidth: 1,
                  borderColor: isDarkMode
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(0,0,0,0.1)'
                }
              ]}
            />
          ) : (
            <View style={[
              styles.profileImage,
              {
                backgroundColor: '#0D8ABC',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isDarkMode
                  ? 'rgba(255,255,255,0.2)'
                  : 'rgba(0,0,0,0.1)'
              }
            ]}>
              <Text style={[
                styles.defaultProfileText,
                {
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 'bold'
                }
              ]}>
                {post.userDisplayName ? 
                  post.userDisplayName.charAt(0).toUpperCase() : 
                  post.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.userTextInfo}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={handleProfilePress}
          >
            <View style={styles.usernameContainer}>
              <Text style={[styles.username, { color: textColor }]}>
                {post.userDisplayName ? post.userDisplayName : `@${post.username}`}
              </Text>
              {post.username.includes('verified') && (
                <View style={styles.verifiedBadge}>
                  <Icon name="checkmark-circle" size={14} color="#0095F6" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text style={[styles.publishDate, { color: subTextColor }]}>
            {post.publishedDate}
          </Text>
        </View>
        <View style={styles.userActionButtons}>
          {/* Only show action buttons if it's not the current user's post */}
          {(() => {
            const currentUser = auth().currentUser;
            const showActions = currentUser && currentUser.uid !== post.userId && isRealUserId(post.userId);
            
            if (showActions) {
              return (
                <>
                  <TouchableOpacity 
                    style={[
                      styles.followButton,
                      post.isFollowing ? styles.followingButton : styles.followButton,
                      { backgroundColor: post.isFollowing ? 'transparent' : mainColor }
                    ]}
                    onPress={() => onFollowToggle(post.id, post.userId)}
                  >
                    <Text style={[
                      styles.followButtonText, 
                      { color: post.isFollowing ? mainColor : '#FFFFFF' }
                    ]}>
                      {post.isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                </>
              );
            }
            
            return null;
          })()}
        </View>
      </View>
      
      {/* Post title */}
      <View style={styles.titleContainer}>
        <Text style={[styles.inspirationTitle, { color: textColor }]}>
          {post.title}
        </Text>
      </View>
    </View>
  );
};

export default PostHeader;