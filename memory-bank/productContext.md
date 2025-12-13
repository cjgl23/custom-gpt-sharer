# Product Context

## Why This Project Exists
IT teams need to share custom GPTs with multiple team members efficiently, but ChatGPT's interface only supports sharing one email at a time. This creates a bottleneck for bulk sharing operations, especially in larger organizations.

## Problems It Solves
- Manual repetitive sharing process for multiple users
- Time-consuming individual email entry for each team member
- Risk of errors when manually copying email addresses
- Inefficient workflow for IT administrators

## How It Should Work
1. User provides a text file containing email addresses (one per line)
2. User specifies the name of the custom GPT to share
3. Utility automates browser navigation to the GPT sharing interface
4. Utility processes each email sequentially, entering it into the share box
5. Utility provides progress feedback and error reporting

## User Experience Goals
- Simple command-line interface
- Clear progress indicators during operation
- Comprehensive error messages
- Minimal user intervention required

## Target Users
- **IT Team Members**: Need to share GPTs with multiple colleagues efficiently
- **System Administrators**: Manage bulk access to organizational GPTs
- **Team Leads**: Distribute custom tools to their teams

## Key User Journeys
### Journey 1: Bulk Team Sharing
1. IT admin receives request to share GPT with entire department
2. Admin creates text file with team member emails
3. Admin runs utility with GPT name and email file
4. Utility processes all emails automatically
5. Admin receives confirmation of successful sharing
