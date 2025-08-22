#!/usr/bin/env python3
"""
External Map Generator Monitor for Civilization VII
Demonstrates how to communicate with the custom map generator via console logs.
"""

import time
import json
import os
import sys
from pathlib import Path
import re
from datetime import datetime

def find_scripting_log():
    """Find the Civilization VII Scripting.log file"""
    possible_paths = [
        Path.home() / "Library/Application Support/Civilization VII/Logs/Scripting.log",
        Path.home() / "Library/Application Support/Civilization VII/Debug/Scripting.log",
        Path.home() / "AppData/Local/Civilization VII/Logs/Scripting.log",  # Windows
    ]
    
    for path in possible_paths:
        if path.exists():
            return path
    
    return None

def monitor_map_generation():
    """Monitor the map generation process through log file analysis"""
    log_path = find_scripting_log()
    
    if not log_path:
        print("❌ Could not find Civilization VII Scripting.log file")
        print("   Make sure the game is running and has generated logs")
        return
    
    print(f"📋 Monitoring: {log_path}")
    print("🎮 Waiting for Epic Diverse Map generation events...")
    print("   (Start a new game with 'Epic Diverse Huge' map type)\n")
    
    # Track last position in log file
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        f.seek(0, 2)  # Go to end of file
        
        while True:
            line = f.readline()
            if line:
                # Look for our custom map generator messages
                if "EPIC_MAP_GEN_START|" in line:
                    try:
                        data_str = line.split("EPIC_MAP_GEN_START|")[1].strip()
                        data = json.loads(data_str)
                        print(f"🚀 Map Generation Started!")
                        print(f"   📐 Map Size: {data['width']} x {data['height']}")
                        print(f"   ⏰ Started at: {datetime.fromtimestamp(data['timestamp']/1000)}")
                        print(f"   🗺️  Map Type: {data.get('mapSize', 'Unknown')}")
                    except (json.JSONDecodeError, KeyError, IndexError):
                        pass
                
                elif "EPIC_MAP_GEN_COMPLETE|" in line:
                    try:
                        data_str = line.split("EPIC_MAP_GEN_COMPLETE|")[1].strip()
                        data = json.loads(data_str)
                        print(f"✅ Map Generation Completed!")
                        print(f"   🏔️  Natural Wonders: {data['naturalWonders']}")
                        print(f"   🏞️  Lake Density: {data['lakeDensity']}")
                        print(f"   🌍 Biome Variety: {data['biomeVariety']}")
                        print(f"   ⏰ Completed at: {datetime.fromtimestamp(data['timestamp']/1000)}")
                        print()
                    except (json.JSONDecodeError, KeyError, IndexError):
                        pass
                
                # Look for specific generation phase messages
                elif "Adding extensive cliff systems..." in line:
                    print("⛰️  Adding cliff systems...")
                elif "Generating enhanced mountain systems..." in line:
                    print("🏔️  Generating enhanced mountains...")
                elif "Creating extensive inland lake systems..." in line:
                    print("🏞️  Creating inland lakes...")
                elif "Building enhanced rainfall patterns..." in line:
                    print("🌧️  Building rainfall patterns...")
                elif "Creating enhanced biome diversity..." in line:
                    print("🌍 Creating biome diversity...")
                elif "Adding diverse terrain features..." in line:
                    print("🌲 Adding terrain features...")
                
                # Look for any other Epic Diverse messages
                elif "Epic Diverse" in line and ("Loading" in line or "loaded" in line):
                    print("📦 Epic Diverse Map Generator loaded successfully!")
            
            else:
                time.sleep(0.1)  # Wait before checking again

def analyze_existing_log():
    """Analyze existing log file for map generation data"""
    log_path = find_scripting_log()
    
    if not log_path:
        print("❌ Could not find Scripting.log file")
        return
    
    print(f"📋 Analyzing: {log_path}")
    
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        
        # Find all Epic Map generation events
        start_events = re.findall(r'EPIC_MAP_GEN_START\|(.+)', content)
        complete_events = re.findall(r'EPIC_MAP_GEN_COMPLETE\|(.+)', content)
        
        if not start_events and not complete_events:
            print("🔍 No Epic Diverse Map generation events found in log")
            print("   Generate a map with 'Epic Diverse Huge' to see events")
            return
        
        print(f"📊 Found {len(start_events)} start events and {len(complete_events)} completion events\n")
        
        for i, event_str in enumerate(start_events):
            try:
                data = json.loads(event_str)
                print(f"Event #{i+1}:")
                print(f"   📐 Map Size: {data['width']} x {data['height']}")
                print(f"   ⏰ Started: {datetime.fromtimestamp(data['timestamp']/1000)}")
            except json.JSONDecodeError:
                print(f"Event #{i+1}: Could not parse data")
        
        print()
        for i, event_str in enumerate(complete_events):
            try:
                data = json.loads(event_str)
                print(f"Completion #{i+1}:")
                print(f"   🏔️  Natural Wonders: {data['naturalWonders']}")
                print(f"   🏞️  Lake Density: {data['lakeDensity']}")
                print(f"   ⏰ Completed: {datetime.fromtimestamp(data['timestamp']/1000)}")
            except json.JSONDecodeError:
                print(f"Completion #{i+1}: Could not parse data")

def main():
    """Main function"""
    print("🎮 Civilization VII - Epic Diverse Map Monitor")
    print("=" * 50)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--analyze":
        analyze_existing_log()
    else:
        print("Options:")
        print("  --analyze    Analyze existing log file")
        print("  [no args]    Live monitoring mode")
        print()
        
        try:
            monitor_map_generation()
        except KeyboardInterrupt:
            print("\n👋 Monitoring stopped by user")

if __name__ == "__main__":
    main()
