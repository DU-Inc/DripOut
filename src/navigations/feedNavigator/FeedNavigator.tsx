import React from 'react';
import { Easing, Dimensions } from 'react-native';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import OverviewScreen from '../../screens/OverviewScreen';
import ExpandedProductScreen2 from '../../screens/ExpandedFeeds/ExpandedProductScreen2';
import ExpandedNewsScreen from '../../screens/ExpandedFeeds/ExpandedNewsScreen';
import ExpandedOutfitScreen from '../../screens/ExpandedFeeds/ExpandedOutfitScreen';

// Define the feed stack param list
export type FeedStackParamList = {
  Overview: undefined;
  ExpandedProductScreen2: { 
    productId: string;
    sourcePosition?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    product?: any;
    initialImageIndex?: number;
  };
  ExpandedNewsScreen: {
    articleId: string;
    sourcePosition?: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  };
  ExpandedOutfitScreen: {
    products: Array<{
      id: string;
      type: 'full' | 'partial';
      productName?: string;
      brand?: string;
      price?: number;
      currency?: string;
      productImage?: string;
      additionalImages?: string[];
      productUrl?: string;
      description?: string;
      sourcePosition?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    initialIndex?: number;
    outfitId?: string;
    outfitName?: string;
  };
};

const Stack = createSharedElementStackNavigator<FeedStackParamList>();
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Shared element transition options
const sharedTransitionOptions = {
  animation: 'spring',
  config: {
    mass: 1.2,
    damping: 25,
    stiffness: 200,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  }
};

// Define shared elements transition configuration
const sharedElementScreenOptions = {
  gestureEnabled: true,
  transitionSpec: {
    open: {
      animation: 'spring' as const,
      config: {
        mass: 1.5,
        damping: 25,
        stiffness: 200,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      },
    },
    close: {
      animation: 'spring' as const,
      config: {
        mass: 1.5,
        damping: 35,
        stiffness: 300,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      },
    },
  },
  headerShown: false,
};

// Custom horizontal slide transition for outfit screen
const outfitScreenOptions = {
  ...sharedElementScreenOptions,
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      },
    },
  },
  cardStyleInterpolator: ({ current, next, layouts }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
        opacity: current.progress,
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    };
  },
};

const FeedNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Overview"
      screenOptions={sharedElementScreenOptions}
    >
      <Stack.Screen name="Overview" component={OverviewScreen} />
      
      <Stack.Screen 
        name="ExpandedProductScreen2" 
        component={ExpandedProductScreen2}
        sharedElements={(route, otherRoute, showing) => {
          const params = route.params;
          const productId = params?.productId;
          
          if (!productId) return [];

          return [
            {
              id: `item.${productId}.image`,
              animation: 'move',
              resize: 'clip',
              align: 'auto',
              style: {
                borderRadius: 12,
                overflow: 'hidden',
              }
            },
            {
              id: `item.${productId}.title`,
              animation: 'fade',
              resize: 'clip',
            }
          ];
        }}
      />

      <Stack.Screen 
        name="ExpandedNewsScreen" 
        component={ExpandedNewsScreen}
        sharedElements={(route, otherRoute, showing) => {
          const { articleId } = route.params;
          return [
            {
              id: `article.${articleId}.image`,
              animation: 'move',
              resize: 'clip',
              align: 'center-top',
              style: {
                borderRadius: 12,
                overflow: 'hidden',
              }
            },
            {
              id: `article.${articleId}.title`,
              animation: 'fade-in',
              resize: 'clip',
              align: 'left-center',
            }
          ];
        }}
      />

      <Stack.Screen 
        name="ExpandedOutfitScreen" 
        component={ExpandedOutfitScreen}
        options={outfitScreenOptions}
        sharedElements={(route, otherRoute, showing) => {
          const { products, initialIndex = 0 } = route.params;
          
          // Get current product from params
          const currentProduct = products[initialIndex];
          if (!currentProduct) return [];
          
          // For outfits, we want to transition from the outfit group to the individual product
          return [
            {
              id: `outfit.${currentProduct.id}.image`,
              animation: 'move',
              resize: 'clip',
              align: 'auto',
              style: {
                borderRadius: 12,
                overflow: 'hidden',
              }
            }
          ];
        }}
      />
    </Stack.Navigator>
  );
};

export default FeedNavigator; 