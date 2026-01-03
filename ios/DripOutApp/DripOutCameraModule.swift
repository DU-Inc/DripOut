//
//  DripOutCameraModule.swift
//  DripOutApp
//
//  Created by Claude Code on 2025-01-18.
//  Copyright © 2025 DripOut. All rights reserved.
//

import Foundation
import React
import UIKit
import PhotosUI
import AVFoundation

@objc(DripOutCameraModule)
class DripOutCameraModule: NSObject {
    
    @objc static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc static func moduleName() -> String {
        return "DripOutCameraModule"
    }
    
    // MARK: - Camera Permission Methods
    
    @objc func requestCameraPermission(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                resolve(granted)
            }
        }
    }
    
    @objc func requestPhotoLibraryPermission(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        PHPhotoLibrary.requestAuthorization { status in
            DispatchQueue.main.async {
                let granted = status == .authorized || status == .limited
                resolve(granted)
            }
        }
    }
    
    // MARK: - Camera Capture Methods
    
    @objc func takePhotoWithCrop(_ options: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Check camera availability
            guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
                reject("camera_unavailable", "Camera is not available on this device", nil)
                return
            }
            
            // Check camera permission
            let cameraAuthStatus = AVCaptureDevice.authorizationStatus(for: .video)
            if cameraAuthStatus != .authorized {
                reject("camera_permission_denied", "Camera permission is required", nil)
                return
            }
            
            let imagePickerController = UIImagePickerController()
            imagePickerController.sourceType = .camera
            imagePickerController.mediaTypes = ["public.image"]
            imagePickerController.allowsEditing = true // Enable built-in cropping
            imagePickerController.delegate = self
            
            // Store the resolve/reject blocks for later use
            self.currentResolve = resolve
            self.currentReject = reject
            
            // Present the camera
            if let viewController = UIApplication.shared.keyWindow?.rootViewController {
                viewController.present(imagePickerController, animated: true, completion: nil)
            } else {
                reject("no_view_controller", "Could not find root view controller", nil)
            }
        }
    }
    
    @objc func selectFromLibraryWithCrop(_ options: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Check photo library permission
            let photoAuthStatus = PHPhotoLibrary.authorizationStatus()
            if photoAuthStatus != .authorized && photoAuthStatus != .limited {
                reject("photo_permission_denied", "Photo library permission is required", nil)
                return
            }
            
            // Use PHPickerViewController for iOS 14+ or UIImagePickerController for older versions
            if #available(iOS 14.0, *) {
                self.presentPHPicker(options: options, resolve: resolve, reject: reject)
            } else {
                self.presentUIImagePicker(options: options, resolve: resolve, reject: reject)
            }
        }
    }
    
    // MARK: - iOS 14+ PHPicker Implementation
    
    @available(iOS 14.0, *)
    private func presentPHPicker(options: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        var configuration = PHPickerConfiguration()
        configuration.selectionLimit = 1
        configuration.filter = .images
        
        let picker = PHPickerViewController(configuration: configuration)
        picker.delegate = self
        
        // Store the resolve/reject blocks for later use
        self.currentResolve = resolve
        self.currentReject = reject
        
        if let viewController = UIApplication.shared.keyWindow?.rootViewController {
            viewController.present(picker, animated: true, completion: nil)
        } else {
            reject("no_view_controller", "Could not find root view controller", nil)
        }
    }
    
    // MARK: - iOS 13 and below UIImagePicker Implementation
    
    private func presentUIImagePicker(options: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        let imagePickerController = UIImagePickerController()
        imagePickerController.sourceType = .photoLibrary
        imagePickerController.mediaTypes = ["public.image"]
        imagePickerController.allowsEditing = true // Enable built-in cropping
        imagePickerController.delegate = self
        
        // Store the resolve/reject blocks for later use
        self.currentResolve = resolve
        self.currentReject = reject
        
        if let viewController = UIApplication.shared.keyWindow?.rootViewController {
            viewController.present(imagePickerController, animated: true, completion: nil)
        } else {
            reject("no_view_controller", "Could not find root view controller", nil)
        }
    }
    
    // MARK: - Image Processing Methods
    
    @objc func cropImage(_ imageUri: String, cropOptions: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        DispatchQueue.global(qos: .userInitiated).async {
            
            // Load image from URI
            guard let url = URL(string: imageUri),
                  let imageData = try? Data(contentsOf: url),
                  let image = UIImage(data: imageData) else {
                reject("invalid_image", "Could not load image from URI", nil)
                return
            }
            
            // For now, just return the original image
            // TODO: Implement custom cropping logic
            let result = self.formatImageResponse(image: image, originalUri: imageUri)
            
            DispatchQueue.main.async {
                resolve(result)
            }
        }
    }
    
    // MARK: - Helper Methods
    
    private func formatImageResponse(image: UIImage, originalUri: String? = nil) -> NSDictionary {
        
        // Save image to temporary directory
        let tempDir = NSTemporaryDirectory()
        let fileName = "image_\(Date().timeIntervalSince1970).jpg"
        let filePath = (tempDir as NSString).appendingPathComponent(fileName)
        
        // Compress and save image
        guard let imageData = image.jpegData(compressionQuality: 0.95) else {
            return ["error": "Failed to compress image"]
        }
        
        do {
            try imageData.write(to: URL(fileURLWithPath: filePath))
            
            return [
                "uri": "file://\(filePath)",
                "type": "image/jpeg",
                "name": fileName,
                "width": image.size.width,
                "height": image.size.height,
                "fileSize": imageData.count
            ]
        } catch {
            return ["error": "Failed to save image: \(error.localizedDescription)"]
        }
    }
    
    // MARK: - Properties for storing callbacks
    
    private var currentResolve: RCTPromiseResolveBlock?
    private var currentReject: RCTPromiseRejectBlock?
}

// MARK: - UIImagePickerControllerDelegate

extension DripOutCameraModule: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        
        picker.dismiss(animated: true) { [weak self] in
            guard let self = self else { return }
            
            // Get the edited image first, then original if edited is not available
            var selectedImage: UIImage?
            if let editedImage = info[.editedImage] as? UIImage {
                selectedImage = editedImage
            } else if let originalImage = info[.originalImage] as? UIImage {
                selectedImage = originalImage
            }
            
            guard let image = selectedImage else {
                self.currentReject?("no_image", "No image was selected", nil)
                self.cleanup()
                return
            }
            
            // Format the response
            let result = self.formatImageResponse(image: image)
            
            // Check for errors in the response
            if let error = result["error"] as? String {
                self.currentReject?("image_processing_error", error, nil)
            } else {
                self.currentResolve?(result)
            }
            
            self.cleanup()
        }
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true) { [weak self] in
            guard let self = self else { return }
            self.currentReject?("user_cancelled", "User cancelled image selection", nil)
            self.cleanup()
        }
    }
    
    private func cleanup() {
        self.currentResolve = nil
        self.currentReject = nil
    }
}

// MARK: - PHPickerViewControllerDelegate

@available(iOS 14.0, *)
extension DripOutCameraModule: PHPickerViewControllerDelegate {
    
    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        
        picker.dismiss(animated: true) { [weak self] in
            guard let self = self else { return }
            
            // Handle user cancellation
            if results.isEmpty {
                self.currentReject?("user_cancelled", "User cancelled image selection", nil)
                self.cleanup()
                return
            }
            
            // Get the first selected item
            let result = results.first!
            
            // Load the image
            if result.itemProvider.canLoadObject(ofClass: UIImage.self) {
                result.itemProvider.loadObject(ofClass: UIImage.self) { [weak self] object, error in
                    guard let self = self else { return }
                    
                    if let error = error {
                        DispatchQueue.main.async {
                            self.currentReject?("image_load_error", "Failed to load image: \(error.localizedDescription)", nil)
                            self.cleanup()
                        }
                        return
                    }
                    
                    guard let image = object as? UIImage else {
                        DispatchQueue.main.async {
                            self.currentReject?("invalid_image", "Selected item is not a valid image", nil)
                            self.cleanup()
                        }
                        return
                    }
                    
                    // Format the response
                    let response = self.formatImageResponse(image: image)
                    
                    DispatchQueue.main.async {
                        // Check for errors in the response
                        if let error = response["error"] as? String {
                            self.currentReject?("image_processing_error", error, nil)
                        } else {
                            self.currentResolve?(response)
                        }
                        self.cleanup()
                    }
                }
            } else {
                self.currentReject?("unsupported_media", "Selected item is not a supported image format", nil)
                self.cleanup()
            }
        }
    }
}