#!/usr/bin/env python3
import os
import sys
import subprocess
import json
import time
import webbrowser

def run_gh_command(cmd):
    """Run a GitHub CLI command and return the output"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {' '.join(cmd)}")
        print(f"Error output: {e.stderr}")
        return None

def get_project_info():
    """Get project information using GitHub CLI - fallback to manual entry"""
    print("Since project data can't be easily retrieved with your GitHub CLI version,")
    print("we'll use manual entry for the project information.")
    
    # Try opening in browser directly
    org_name = "DU-Inc"
    print("\nOpening projects list in browser...")
    try:
        webbrowser.open(f"https://github.com/orgs/{org_name}/projects")
    except:
        # Fallback to gh CLI if webbrowser module fails
        subprocess.run(["gh", "project", "list", "--owner", org_name, "--web"], check=False)
    
    print("\nPlease look at the projects in your browser.")
    project_number = input("Enter the project number (#): ")
    if not project_number:
        return None, None, None
    
    print("\nNOTE: Due to CLI limitations, we'll use a direct API call to add issues.")
    print("You'll need to manually move them to the Backlog column after adding.")
    
    return project_number, None, None

def get_issues(repo_name):
    """Get all open issues from the repo"""
    cmd = ["gh", "issue", "list", "--repo", repo_name, "--state", "open"]
    issues_output = run_gh_command(cmd)
    
    if not issues_output:
        print("No open issues found or error fetching issues.")
        return []
    
    # Parse issue numbers from output
    issues = []
    for line in issues_output.splitlines():
        parts = line.strip().split("\t")
        if len(parts) >= 1:
            try:
                issue_number = parts[0].strip()
                issue_title = parts[1].strip() if len(parts) > 1 else f"Issue #{issue_number}"
                issues.append({"number": issue_number, "title": issue_title})
            except:
                # Skip issues we can't parse
                continue
    
    return issues

def add_issue_to_project_manually(issue_number, repo_name, project_number):
    """Opens the issue page in browser so you can manually add it to the project"""
    issue_url = f"https://github.com/{repo_name}/issues/{issue_number}"
    
    print(f"Opening issue #{issue_number} in browser. Please:")
    print("1. Click on 'Projects' in the sidebar")
    print("2. Add the issue to your project")
    print("3. Return to this terminal when done")
    
    try:
        webbrowser.open(issue_url)
        # Wait for user to manually add the issue
        input("Press Enter when you've added this issue to the project...")
        return True
    except:
        print(f"Could not open browser for issue #{issue_number}")
        return False

def add_issues_to_project(repo_name, project_number):
    """Add issues to the project by opening them in browser"""
    try:
        # Get all issues
        issues = get_issues(repo_name)
        
        if not issues:
            print("No issues found.")
            return
        
        print(f"Found {len(issues)} open issues in the repository.")
        
        # Ask if user wants to continue with manual method
        print("\nThis will open each issue in your browser for you to manually add to the project.")
        proceed = input("Do you want to proceed? [y/N]: ").lower()
        
        if proceed != 'y':
            print("Operation cancelled.")
            return
        
        # Count for statistics
        added_count = 0
        skipped_count = 0
        
        # Add each issue to the project
        for i, issue in enumerate(issues):
            issue_number = issue["number"]
            issue_title = issue["title"]
            
            print(f"\nIssue {i+1} of {len(issues)}")
            print(f"Adding issue #{issue_number}: {issue_title} to project...")
            
            # Ask if user wants to add this issue
            add_this = input(f"Add this issue to the project? [Y/n/skip all remaining]: ").lower()
            
            if add_this == 'skip all remaining':
                print("Skipping all remaining issues.")
                break
                
            if add_this == 'n':
                print(f"Skipping issue #{issue_number}")
                skipped_count += 1
                continue
            
            if add_issue_to_project_manually(issue_number, repo_name, project_number):
                print(f"Successfully added issue #{issue_number} to project.")
                added_count += 1
            else:
                print(f"Error adding issue #{issue_number} to project.")
                skipped_count += 1
        
        print(f"\nSummary: Added {added_count} issues, skipped {skipped_count} issues.")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    # Repository name
    repo_name = "DU-Inc/DripOut"
    
    # Get project information - manually
    project_number, _, _ = get_project_info()
    
    if not project_number:
        print("Could not get necessary project information.")
        return
    
    # Add issues to project
    add_issues_to_project(repo_name, project_number)

if __name__ == "__main__":
    main()