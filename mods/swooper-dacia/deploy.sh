#!/bin/bash

# Variables
SOURCE_DIR="/Users/mateicanavra/Documents/.nosync/DEV/civ-mod-dacia/dist"
DEST_DIR="/Users/mateicanavra/Library/Application Support/Civilization VII/Mods/macnsqueeze-civilization-dacia"

# Function to print status messages
print_status() {
    echo ""
    echo "=== $1 ==="
    echo ""
}

# Function to handle errors
handle_error() {
    print_status "Error: $1"
    exit 1
}

# Step 1: Build the mod
print_status "Building the mod with civ7-modding-tools"
npx tsx build.ts || handle_error "Failed to build the mod"

# Step 2: Set up destination directory
print_status "Setting up destination directory"
mkdir -p "$DEST_DIR" || handle_error "Failed to create destination directory"

# Step 3: Clean up destination directory
print_status "Cleaning up destination directory"
rm -rf "$DEST_DIR"/* || handle_error "Failed to clean destination directory"

# Step 4: Copy built files to destination
print_status "Copying built files to destination"
cp -r "$SOURCE_DIR"/* "$DEST_DIR"/ || handle_error "Failed to copy files"

# Step 5: Verify deployment
print_status "Verifying deployment"
ls -la "$DEST_DIR" || handle_error "Failed to verify deployment"

print_status "Deployment completed successfully!"
echo "The mod has been deployed to: $DEST_DIR"
echo "You can now start Civilization VII and enable the mod in the Additional Content menu." 