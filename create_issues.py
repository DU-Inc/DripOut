#!/usr/bin/env python3
import os
import sys
from github import Github
from github.GithubException import GithubException

# List of issues to create
ISSUES = [
    # Previously Identified Technical Issues
    {
        "title": "Optimize image loading in ProductCard component",
        "body": "The ProductCard component has inefficient image loading with multiple re-renders and complex animation logic. Implement image caching, lazy loading, and optimize animation methods to improve performance and reduce battery consumption.",
        "labels": ["enhancement", "performance"]
    },
    {
        "title": "Standardize error handling across service files",
        "body": "Error handling varies across services with inconsistent error reporting. Implement a standardized error handling pattern across all services to improve debugging and user experience.",
        "labels": ["enhancement", "technical debt"]
    },
    {
        "title": "Implement proper logging system instead of console.log statements",
        "body": "Many console.log statements remain active in production code. Use the logger utility consistently instead of direct console.log calls to improve debugging capabilities and security.",
        "labels": ["enhancement", "technical debt"]
    },
    {
        "title": "Fix accessibility issues in interactive UI elements",
        "body": "Missing accessibility labels on some interactive elements, particularly in OutfitGroupComponent. Add proper accessibility props (accessibilityLabel, accessibilityHint) to all buttons to improve app usability for all users.",
        "labels": ["enhancement", "accessibility"]
    },
    {
        "title": "Move hardcoded API URLs to environment configuration",
        "body": "API URLs are hardcoded with IP addresses and no environment-based configuration. Move API URLs to environment configuration to improve maintainability and security.",
        "labels": ["enhancement", "technical debt"]
    },
    {
        "title": "Improve animation performance in OutfitGroupComponent",
        "body": "Complex animations using heavy operations in OutfitGroupComponent that could cause jank on lower-end devices. Optimize animations for performance, especially for scrolling interactions.",
        "labels": ["enhancement", "performance"]
    },
    {
        "title": "Fix potential memory leaks in component unmounting",
        "body": "Several animation references and timeouts that might not be properly cleaned up. Ensure all animations and timeouts are cleared in useEffect cleanup functions to prevent memory leaks.",
        "labels": ["bug", "performance"]
    },
    {
        "title": "Create consistent styling system across components",
        "body": "Mixed usage of inline styles and StyleSheet objects with duplicate definitions. Create a consistent styling system with reusable components to improve maintainability and consistency.",
        "labels": ["enhancement", "design"]
    },
    {
        "title": "Add image error fallbacks for all product displays",
        "body": "Inconsistent handling of image loading errors across components. Create a standard ImageWithFallback component to handle errors consistently and improve user experience.",
        "labels": ["enhancement", "user experience"]
    },
    {
        "title": "Strengthen TypeScript typing across the codebase",
        "body": "Any types used in several places, incomplete interfaces, and inconsistent type definitions. Enforce stricter typing and create shared type definitions to improve code quality and reduce bugs.",
        "labels": ["enhancement", "technical debt"]
    },
    {
        "title": "Refactor large components into smaller, focused ones",
        "body": "Components with 800+ lines of code that handle too many responsibilities. Break down large components into smaller, focused components to improve maintainability and performance.",
        "labels": ["enhancement", "refactor"]
    },
    {
        "title": "Add comprehensive documentation to components and services",
        "body": "Limited or no documentation for component props, methods, and expected behavior. Add JSDoc comments for all exported functions, components, and complex logic to improve code maintainability.",
        "labels": ["enhancement", "documentation"]
    },
    {
        "title": "Implement request caching for product service API calls",
        "body": "No caching mechanism for API responses leading to duplicate network requests. Implement request caching strategy to improve performance and reduce data usage.",
        "labels": ["enhancement", "performance"]
    },
    {
        "title": "Complete dark mode support for all components",
        "body": "Some components have inconsistent dark mode implementation. Create a consistent theming system that applies to all components to improve user experience.",
        "labels": ["enhancement", "user experience"]
    },
    {
        "title": "Optimize component rendering with useMemo and useCallback",
        "body": "Values being calculated on each render that could be memoized. Use useMemo and useCallback to optimize render performance and reduce unnecessary rerenders.",
        "labels": ["enhancement", "performance"]
    },
    
    # Missing Features from Design Document
    
    # User Interface (UI)
    {
        "title": "Implement comprehensive user profile management",
        "body": "Current implementation is missing advanced profile customization options. Implement comprehensive user profile management with extensive customization options as specified in the design document.",
        "labels": ["feature", "user interface"]
    },
    {
        "title": "Enhance 3D visualization with 360-degree view",
        "body": "Current 3D implementation is basic and lacks advanced features. Add 360-degree view and interactive model manipulation features to the 3D visualization system as specified in the design document.",
        "labels": ["feature", "3D"]
    },
    {
        "title": "Develop advanced fashion suggestion system",
        "body": "Current fashion suggestion system is basic and lacks trend analysis integration. Develop an advanced fashion suggestion system with trend analysis integration as specified in the design document.",
        "labels": ["feature", "AI", "fashion"]
    },
    {
        "title": "Create complete shopping interface with cart and checkout",
        "body": "Shopping interface is severely limited with no cart or checkout functionality. Implement a complete shopping interface with cart management and checkout functionality as specified in the design document.",
        "labels": ["feature", "shopping"]
    },
    
    # 3D Scanning and Modeling
    {
        "title": "Implement true 3D scanning capability",
        "body": "Current implementation lacks true 3D scanning capabilities. Implement 3D scanning using device cameras to create more accurate models as specified in the design document.",
        "labels": ["feature", "3D"]
    },
    {
        "title": "Add advanced avatar customization",
        "body": "Avatar customization options are limited. Add advanced avatar customization with facial recognition and body measurements to create more realistic avatars as specified in the design document.",
        "labels": ["feature", "3D", "avatar"]
    },
    {
        "title": "Develop physics-based cloth simulation",
        "body": "Current outfit rendering lacks realism. Implement physics-based cloth simulation for realistic outfit rendering as specified in the design document.",
        "labels": ["feature", "3D", "rendering"]
    },
    {
        "title": "Implement lighting and material rendering",
        "body": "Current visualization lacks realism in lighting and materials. Implement advanced lighting and material rendering for realistic visualization as specified in the design document.",
        "labels": ["feature", "3D", "rendering"]
    },
    
    # AI Fashion Suggestion Engine
    {
        "title": "Create real-time trend monitoring system",
        "body": "Current implementation lacks real-time trend monitoring. Create a system for real-time trend monitoring and analysis as specified in the design document.",
        "labels": ["feature", "AI", "trend analysis"]
    },
    {
        "title": "Implement machine learning for style evolution",
        "body": "Current personalization system is basic. Implement machine learning for style evolution and improved personalization as specified in the design document.",
        "labels": ["feature", "AI", "machine learning"]
    },
    {
        "title": "Develop collaborative filtering recommendation models",
        "body": "Current recommendation system uses basic filtering. Develop collaborative filtering and user-similarity recommendation models for better suggestions as specified in the design document.",
        "labels": ["feature", "AI", "recommendations"]
    },
    {
        "title": "Integrate fashion calendar events into recommendations",
        "body": "Current recommendations don't consider seasonal trends. Integrate fashion calendar events and seasonal trends into recommendations as specified in the design document.",
        "labels": ["feature", "AI", "recommendations"]
    },
    
    # Web Scraping Module
    {
        "title": "Build comprehensive product catalog with update scheduling",
        "body": "Current product data collection is limited. Build a comprehensive product catalog with regular update scheduling as specified in the design document.",
        "labels": ["feature", "data", "scraping"]
    },
    {
        "title": "Implement real-time price monitoring",
        "body": "Current system lacks price and stock tracking. Implement real-time price monitoring and stock availability tracking as specified in the design document.",
        "labels": ["feature", "data", "scraping"]
    },
    {
        "title": "Develop advanced product similarity detection",
        "body": "Current product matching is limited. Develop advanced product similarity detection and matching capabilities as specified in the design document.",
        "labels": ["feature", "data", "product matching"]
    },
    {
        "title": "Create visual recognition system for product matching",
        "body": "Current system can't match similar products visually. Create a visual recognition system to match similar products across retailers as specified in the design document.",
        "labels": ["feature", "data", "AI", "computer vision"]
    },
    
    # Social Media Module
    {
        "title": "Add advanced social engagement features",
        "body": "Current social features are basic. Add advanced engagement features like polls, stories, and live events to the social media module as specified in the design document.",
        "labels": ["feature", "social"]
    },
    {
        "title": "Implement automated content moderation",
        "body": "No content moderation system exists. Implement automated content moderation and reporting system as specified in the design document.",
        "labels": ["feature", "social", "moderation"]
    },
    {
        "title": "Create granular privacy settings for content sharing",
        "body": "Current privacy controls are limited. Create granular privacy settings for content sharing as specified in the design document.",
        "labels": ["feature", "social", "privacy"]
    },
    {
        "title": "Develop monetization features for creators",
        "body": "No monetization features exist. Develop monetization features for creators and implement affiliate program integration as specified in the design document.",
        "labels": ["feature", "social", "monetization"]
    },
    
    # Shopping Cart and Checkout Automation
    {
        "title": "Implement complete cart management with persistence",
        "body": "Cart functionality is missing. Implement complete cart management with multi-session persistence as specified in the design document.",
        "labels": ["feature", "shopping", "cart"]
    },
    {
        "title": "Create multi-store cart aggregation",
        "body": "No unified shopping experience exists. Create multi-store cart aggregation for a unified shopping experience as specified in the design document.",
        "labels": ["feature", "shopping", "cart"]
    },
    {
        "title": "Develop automated checkout process with payment integration",
        "body": "Checkout functionality is missing. Develop an automated checkout process with payment integration as specified in the design document.",
        "labels": ["feature", "shopping", "checkout"]
    },
    {
        "title": "Implement order tracking and history functionality",
        "body": "Order management is missing. Implement order tracking and history functionality as specified in the design document.",
        "labels": ["feature", "shopping", "orders"]
    }
]

def main():
    # Get GitHub token from environment variable or command line
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        if len(sys.argv) > 1:
            token = sys.argv[1]
        else:
            token = input("Enter your GitHub Personal Access Token: ")
    
    if not token:
        print("Error: GitHub token is required")
        sys.exit(1)
    
    try:
        # Connect to GitHub
        g = Github(token)
        
        # Get repository
        repo_name = "DU-Inc/DripOut"
        repo = g.get_repo(repo_name)
        print(f"Successfully connected to repository: {repo_name}")
        
        # Get project ID (you'll need to provide this)
        project_id = input("Enter the GitHub Project ID (number): ")
        
        # Create issues and add to project
        for issue_data in ISSUES:
            try:
                # Create issue
                title = issue_data["title"]
                body = issue_data["body"]
                labels = issue_data.get("labels", [])
                
                # Create labels if they don't exist
                existing_labels = [label.name for label in repo.get_labels()]
                for label_name in labels:
                    if label_name not in existing_labels:
                        try:
                            if label_name == "enhancement":
                                repo.create_label(label_name, "84b6eb")
                            elif label_name == "bug":
                                repo.create_label(label_name, "d73a4a")
                            elif label_name == "feature":
                                repo.create_label(label_name, "0e8a16")
                            elif label_name == "technical debt":
                                repo.create_label(label_name, "fbca04")
                            elif label_name == "performance":
                                repo.create_label(label_name, "006b75")
                            elif label_name == "documentation":
                                repo.create_label(label_name, "0075ca")
                            elif label_name == "accessibility":
                                repo.create_label(label_name, "e99695")
                            elif label_name == "user experience":
                                repo.create_label(label_name, "bfdadc")
                            elif label_name == "design":
                                repo.create_label(label_name, "c2e0c6")
                            elif label_name == "refactor":
                                repo.create_label(label_name, "f9d0c4")
                            else:
                                repo.create_label(label_name, "ededed")  # Default gray color
                            print(f"Created label: {label_name}")
                        except GithubException as e:
                            print(f"Error creating label {label_name}: {str(e)}")
                
                print(f"Creating issue: {title}")
                issue = repo.create_issue(title=title, body=body, labels=labels)
                print(f"Created issue #{issue.number}: {title}")
                
                # Add to project (this requires a GraphQL API call)
                # Note: This part is more complex and requires PyGithub v2.0+ with GraphQL support
                # For now, we'll just output a command to run manually
                print(f"Run this to add issue #{issue.number} to project {project_id}:")
                print(f"gh api graphql -f query='mutation {{ addProjectV2ItemById(input: {{ projectId: \"{project_id}\" contentId: \"{issue.node_id}\" }}) {{ item {{ id }} }} }}'")
                
            except GithubException as e:
                print(f"Error creating issue '{title}': {str(e)}")
    
    except GithubException as e:
        print(f"GitHub Error: {str(e)}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()