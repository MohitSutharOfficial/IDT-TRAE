# Professional Map Application

## Overview
This is a professional web-based mapping application that allows users to visualize locations, find their current position, search for places, and calculate distances between points. The application provides both straight-line distance calculations and actual road distance routing with estimated travel times.

## Features


### Interactive Map
- Powered by Leaflet.js and OpenStreetMap
- Responsive, full-screen map display
- Custom markers with informative popups

### Location Services
- "Locate Me" functionality to find and display the user's current location
- Accuracy radius visualization
- Error handling for location services

### Search Functionality
- Search for any location worldwide using the Nominatim geocoding API
- Display search results with markers and descriptive popups
- Center map on search results

### Distance Calculation
- Calculate distances between two points:
  - User's current location
  - Search result location
  - Custom points selected on the map
- Dual distance measurement:
  - Straight-line (as-the-crow-flies) distance
  - Actual road distance using OSRM routing API
- Visual representation of both straight-line path and actual road route
- Estimated driving time calculation
- Distance displayed in both kilometers and miles

### Live Navigation
- Turn-by-turn directions with real-time position tracking
- Visual route guidance with highlighted paths
- Voice guidance for navigation instructions
- Real-time ETA updates based on current speed
- Directions panel showing current and next instructions
- Option to toggle voice guidance on/off

### User Interface
- Clean, intuitive Bootstrap-based interface
- Mobile-responsive design
- Clear visual feedback for all operations

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript
- **Map Library**: Leaflet.js
- **UI Framework**: Bootstrap 5
- **APIs**:
  - OpenStreetMap for base map tiles
  - Nominatim for geocoding (location search)
  - OSRM (Open Source Routing Machine) for road distance calculations

## Installation

### Prerequisites
- Git installed on your computer (download from [git-scm.com](https://github.com/MohitSutharOfficial/findyourmap.git))
- A modern web browser (Chrome, Firefox, Edge, Safari)
- Optional: A local web server (like http-server, Live Server, or similar)

### Cloning the Repository
1. Open your terminal or command prompt
2. Navigate to the directory where you want to store the project
3. Run the following command to clone the repository:
   ```
   git clone https://github.com/MohitSutharOfficial/findyourmap.git
   ```
  
4. Navigate into the project directory:
   ```
   cd findyourmap
   ```

### Running the Application

#### Method 1: Direct Browser Opening
1. Simply open the `index.html` file in your web browser
2. Note: Some features may not work properly due to browser security restrictions when opening files directly

#### Method 2: Using a Local Web Server (Recommended)
1. Install a simple HTTP server if you don't have one:
   - Using Node.js: `npm install -g http-server`
   - Using Python: Python comes with a built-in HTTP server
   - Using VS Code: Install the "Live Server" extension

2. Start the server:
   - Node.js: Run `http-server` in the project directory
   - Python 3.x: Run `python -m http.server 8000` in the project directory
   - VS Code: Right-click on `index.html` and select "Open with Live Server"

3. Open your browser and navigate to:
   - http-server: `http://localhost:8080`
   - Python server: `http://localhost:8000`
   - VS Code Live Server: It will open automatically in your default browser

## Usage

### Basic Map Navigation
- Pan the map by clicking and dragging
- Zoom in/out using the mouse wheel or the zoom controls

### Finding Your Location
- Click the "Locate Me" button to center the map on your current location
- Your position will be marked with a blue marker and accuracy circle

### Searching for Locations
- Enter a place name, address, or coordinates in the search box
- Press Enter or click the "Search" button
- The map will center on the found location with a marker

### Calculating Distances
1. Select Point A from the dropdown (My Location, Search Result, or Custom Point)
   - If "Custom Point" is selected, click anywhere on the map to set the point
2. Select Point B using the same method
3. Click "Calculate Distance" to see:
   - Straight-line distance (shown as a dotted blue line)
   - Road distance (shown as a solid green line)
   - Estimated driving time

### Using Live Navigation
1. First, click the "Locate Me" button to find your current position
2. Select a destination using one of these methods:
   - Search for a location and use the search result
   - Select a custom point on the map
3. Click the "Start Navigation" button to begin turn-by-turn navigation
4. During navigation:
   - Follow the highlighted route on the map
   - View current and next instructions in the directions panel
   - Listen to voice guidance for upcoming turns
   - Monitor your ETA and remaining distance
5. Use the "Mute Voice" button to toggle voice guidance on/off
6. Click "Stop Navigation" when you've reached your destination or want to end navigation

### Resetting the Map
- Click the "Reset Map" button to clear all markers and return to the default view

## Dependencies

- Leaflet.js 1.9.4
- Bootstrap 5.3.0

## Notes

- The application uses free, public APIs which may have usage limitations
- Internet connection is required for map tiles, geocoding, and routing functionality
- Location services require user permission in the browser