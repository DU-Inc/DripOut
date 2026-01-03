//
//  DripOutCameraModule.m
//  DripOutApp
//
//  Created by Claude Code on 2025-01-18.
//  Copyright © 2025 DripOut. All rights reserved.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(DripOutCameraModule, NSObject)

// MARK: - Permission Methods

RCT_EXTERN_METHOD(requestCameraPermission:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(requestPhotoLibraryPermission:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)

// MARK: - Camera Capture Methods

RCT_EXTERN_METHOD(takePhotoWithCrop:(NSDictionary *)options
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(selectFromLibraryWithCrop:(NSDictionary *)options
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)

// MARK: - Image Processing Methods

RCT_EXTERN_METHOD(cropImage:(NSString *)imageUri
                 cropOptions:(NSDictionary *)cropOptions
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)

// MARK: - Module Configuration

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

@end