//
//  DripOutImageCropper.swift
//  DripOutApp
//
//  Created by Claude Code on 2025-01-18.
//  Copyright © 2025 DripOut. All rights reserved.
//

import Foundation
import UIKit
import CoreGraphics

class DripOutImageCropper {
    
    // MARK: - Image Cropping Methods
    
    /**
     * Crop an image to a specific rectangle
     * @param image The original image to crop
     * @param cropRect The rectangle to crop to (in image coordinates)
     * @return The cropped image, or nil if cropping fails
     */
    static func cropImage(_ image: UIImage, to cropRect: CGRect) -> UIImage? {
        
        // Get the image's CGImage
        guard let cgImage = image.cgImage else {
            print("❌ Could not get CGImage from UIImage")
            return nil
        }
        
        // Calculate the crop rectangle in image coordinates
        let imageSize = CGSize(width: cgImage.width, height: cgImage.height)
        let cropRectInImageCoordinates = CGRect(
            x: cropRect.origin.x * imageSize.width,
            y: cropRect.origin.y * imageSize.height,
            width: cropRect.size.width * imageSize.width,
            height: cropRect.size.height * imageSize.height
        )
        
        // Crop the image
        guard let croppedCGImage = cgImage.cropping(to: cropRectInImageCoordinates) else {
            print("❌ Could not crop CGImage")
            return nil
        }
        
        // Create a new UIImage from the cropped CGImage
        let croppedImage = UIImage(cgImage: croppedCGImage, scale: image.scale, orientation: image.imageOrientation)
        
        return croppedImage
    }
    
    /**
     * Crop an image to a square aspect ratio
     * @param image The original image to crop
     * @return The cropped square image, or nil if cropping fails
     */
    static func cropImageToSquare(_ image: UIImage) -> UIImage? {
        
        guard let cgImage = image.cgImage else {
            print("❌ Could not get CGImage from UIImage")
            return nil
        }
        
        let imageSize = CGSize(width: cgImage.width, height: cgImage.height)
        
        // Calculate the square crop size (use the smaller dimension)
        let cropSize = min(imageSize.width, imageSize.height)
        
        // Calculate the crop rectangle (center the crop)
        let cropRect = CGRect(
            x: (imageSize.width - cropSize) / 2,
            y: (imageSize.height - cropSize) / 2,
            width: cropSize,
            height: cropSize
        )
        
        // Crop the image
        guard let croppedCGImage = cgImage.cropping(to: cropRect) else {
            print("❌ Could not crop CGImage to square")
            return nil
        }
        
        // Create a new UIImage from the cropped CGImage
        let croppedImage = UIImage(cgImage: croppedCGImage, scale: image.scale, orientation: image.imageOrientation)
        
        return croppedImage
    }
    
    /**
     * Crop an image to a specific aspect ratio
     * @param image The original image to crop
     * @param aspectRatio The desired aspect ratio (width/height)
     * @return The cropped image, or nil if cropping fails
     */
    static func cropImage(_ image: UIImage, toAspectRatio aspectRatio: CGFloat) -> UIImage? {
        
        guard let cgImage = image.cgImage else {
            print("❌ Could not get CGImage from UIImage")
            return nil
        }
        
        let imageSize = CGSize(width: cgImage.width, height: cgImage.height)
        let currentAspectRatio = imageSize.width / imageSize.height
        
        var cropRect: CGRect
        
        if currentAspectRatio > aspectRatio {
            // Image is wider than desired aspect ratio - crop width
            let newWidth = imageSize.height * aspectRatio
            cropRect = CGRect(
                x: (imageSize.width - newWidth) / 2,
                y: 0,
                width: newWidth,
                height: imageSize.height
            )
        } else {
            // Image is taller than desired aspect ratio - crop height
            let newHeight = imageSize.width / aspectRatio
            cropRect = CGRect(
                x: 0,
                y: (imageSize.height - newHeight) / 2,
                width: imageSize.width,
                height: newHeight
            )
        }
        
        // Crop the image
        guard let croppedCGImage = cgImage.cropping(to: cropRect) else {
            print("❌ Could not crop CGImage to aspect ratio")
            return nil
        }
        
        // Create a new UIImage from the cropped CGImage
        let croppedImage = UIImage(cgImage: croppedCGImage, scale: image.scale, orientation: image.imageOrientation)
        
        return croppedImage
    }
    
    // MARK: - Image Resizing Methods
    
    /**
     * Resize an image to fit within maximum dimensions while maintaining aspect ratio
     * @param image The original image to resize
     * @param maxWidth Maximum width
     * @param maxHeight Maximum height
     * @return The resized image, or nil if resizing fails
     */
    static func resizeImage(_ image: UIImage, maxWidth: CGFloat, maxHeight: CGFloat) -> UIImage? {
        
        let size = image.size
        
        // Calculate the aspect ratio
        let aspectRatio = size.width / size.height
        
        // Calculate the new size while maintaining aspect ratio
        var newSize: CGSize
        
        if size.width > maxWidth || size.height > maxHeight {
            if aspectRatio > 1 {
                // Landscape orientation
                newSize = CGSize(width: maxWidth, height: maxWidth / aspectRatio)
                if newSize.height > maxHeight {
                    newSize = CGSize(width: maxHeight * aspectRatio, height: maxHeight)
                }
            } else {
                // Portrait orientation
                newSize = CGSize(width: maxHeight * aspectRatio, height: maxHeight)
                if newSize.width > maxWidth {
                    newSize = CGSize(width: maxWidth, height: maxWidth / aspectRatio)
                }
            }
        } else {
            // Image is already smaller than max dimensions
            newSize = size
        }
        
        // Create a new image with the calculated size
        UIGraphicsBeginImageContextWithOptions(newSize, false, image.scale)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return resizedImage
    }
    
    /**
     * Resize an image to exact dimensions (may change aspect ratio)
     * @param image The original image to resize
     * @param width Target width
     * @param height Target height
     * @return The resized image, or nil if resizing fails
     */
    static func resizeImageToExactSize(_ image: UIImage, width: CGFloat, height: CGFloat) -> UIImage? {
        
        let newSize = CGSize(width: width, height: height)
        
        UIGraphicsBeginImageContextWithOptions(newSize, false, image.scale)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return resizedImage
    }
    
    // MARK: - Utility Methods
    
    /**
     * Calculate the optimal crop rectangle for a given aspect ratio
     * @param imageSize The size of the original image
     * @param aspectRatio The desired aspect ratio (width/height)
     * @return The optimal crop rectangle
     */
    static func calculateCropRect(for imageSize: CGSize, aspectRatio: CGFloat) -> CGRect {
        
        let currentAspectRatio = imageSize.width / imageSize.height
        
        if currentAspectRatio > aspectRatio {
            // Image is wider than desired aspect ratio - crop width
            let newWidth = imageSize.height * aspectRatio
            return CGRect(
                x: (imageSize.width - newWidth) / 2,
                y: 0,
                width: newWidth,
                height: imageSize.height
            )
        } else {
            // Image is taller than desired aspect ratio - crop height
            let newHeight = imageSize.width / aspectRatio
            return CGRect(
                x: 0,
                y: (imageSize.height - newHeight) / 2,
                width: imageSize.width,
                height: newHeight
            )
        }
    }
    
    /**
     * Normalize a crop rectangle to ensure it's within image bounds
     * @param cropRect The crop rectangle to normalize
     * @param imageSize The size of the image
     * @return The normalized crop rectangle
     */
    static func normalizeCropRect(_ cropRect: CGRect, for imageSize: CGSize) -> CGRect {
        
        let normalizedRect = CGRect(
            x: max(0, min(cropRect.origin.x, imageSize.width - cropRect.size.width)),
            y: max(0, min(cropRect.origin.y, imageSize.height - cropRect.size.height)),
            width: min(cropRect.size.width, imageSize.width),
            height: min(cropRect.size.height, imageSize.height)
        )
        
        return normalizedRect
    }
    
    // MARK: - Common Aspect Ratios
    
    static let aspectRatioSquare: CGFloat = 1.0
    static let aspectRatio4_3: CGFloat = 4.0 / 3.0
    static let aspectRatio3_4: CGFloat = 3.0 / 4.0
    static let aspectRatio16_9: CGFloat = 16.0 / 9.0
    static let aspectRatio9_16: CGFloat = 9.0 / 16.0
    static let aspectRatio3_2: CGFloat = 3.0 / 2.0
    static let aspectRatio2_3: CGFloat = 2.0 / 3.0
}