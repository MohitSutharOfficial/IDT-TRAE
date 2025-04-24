// Initialize the map centered on a default location
let map = L.map('map').setView([51.505, -0.09], 13);

// Define different map tile layers (similar to Google Maps layers)
const mapLayers = {
    standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    }),
    terrain: L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }),
    transit: L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38', {
        attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    })
};

// Add the default layer to the map
mapLayers.standard.addTo(map);

// Create map layer control buttons
function createMapLayerControls() {
    const controlDiv = document.createElement('div');
    controlDiv.className = 'map-layers-control';
    
    const layers = [
        { id: 'standard', name: 'Map', layer: mapLayers.standard },
        { id: 'satellite', name: 'Satellite', layer: mapLayers.satellite },
        { id: 'terrain', name: 'Terrain', layer: mapLayers.terrain },
        { id: 'transit', name: 'Transit', layer: mapLayers.transit }
    ];
    
    layers.forEach(item => {
        const button = document.createElement('button');
        button.className = 'map-layer-btn';
        button.id = `layer-${item.id}`;
        button.textContent = item.name;
        button.onclick = () => switchMapLayer(item.id);
        
        // Set active class for the default layer
        if (item.id === 'standard') {
            button.classList.add('active');
        }
        
        controlDiv.appendChild(button);
    });
    
    document.body.appendChild(controlDiv);
}

// Function to switch between map layers
function switchMapLayer(layerId) {
    // Remove all layers
    Object.values(mapLayers).forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    
    // Add the selected layer
    mapLayers[layerId].addTo(map);
    
    // Update active button
    document.querySelectorAll('.map-layer-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`layer-${layerId}`).classList.add('active');
}

// Initialize map layer controls
createMapLayerControls();

// Variable to store the user's location marker
let userMarker = null;

// Variable to store search result marker
let searchMarker = null;

// Variables to store custom point markers
let pointAMarker = null;
let pointBMarker = null;

// Variables to store the coordinates of the selected points
let pointA = null;
let pointB = null;

// Function to handle geolocation
function locateUser() {
    map.locate({setView: true, maxZoom: 16});
    
    // Event handler for when location is found
    map.on('locationfound', function(e) {
        // Remove previous marker if it exists
        if (userMarker) {
            map.removeLayer(userMarker);
        }
        
        // Create a marker at the user's location
        userMarker = L.marker(e.latlng).addTo(map);
        userMarker.bindPopup("You are here").openPopup();
        
        // Create a circle to show accuracy radius
        L.circle(e.latlng, e.accuracy / 2).addTo(map);
    });
    
    // Event handler for when location is not found
    map.on('locationerror', function(e) {
        alert("Could not find your location: " + e.message);
    });
}

// Function to search for a location using Nominatim API
function searchLocation() {
    const searchInput = document.getElementById('search-input').value;
    const distanceResult = document.getElementById('distance-result');
    
    if (!searchInput) {
        // Show error in the search box
        const searchBox = document.querySelector('.search-box');
        searchBox.classList.add('error');
        setTimeout(() => searchBox.classList.remove('error'), 1500);
        return;
    }
    
    // Show loading indicator in search box
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
    }
    
    // Use Nominatim API for geocoding
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&limit=1&addressdetails=1`)
        .then(response => response.json())
        .then(data => {
            // Reset search icon
            if (searchIcon) {
                searchIcon.innerHTML = '<i class="fas fa-search"></i>';
            }
            
            if (data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                
                // Remove previous search marker if it exists
                if (searchMarker) {
                    map.removeLayer(searchMarker);
                }
                
                // Create a more Google Maps-like marker
                const markerHtml = `
                    <div style="background-color: #DB4437; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                `;
                
                // Add marker at the search result location
                searchMarker = L.marker([lat, lon], {
                    icon: L.divIcon({
                        className: 'custom-div-icon',
                        html: markerHtml,
                        iconSize: [32, 32],
                        iconAnchor: [16, 32]
                    })
                }).addTo(map);
                
                // Format the popup content nicely
                const popupContent = `
                    <div style="font-family: 'Roboto', Arial, sans-serif; padding: 5px;">
                        <div style="font-weight: 500; font-size: 14px; margin-bottom: 5px;">${result.display_name}</div>
                        <div style="display: flex; gap: 8px; margin-top: 8px;">
                            <button id="directions-btn" class="btn btn-sm btn-primary" style="font-size: 12px;">
                                <i class="fas fa-directions"></i> Directions
                            </button>
                            <button id="save-location-btn" class="btn btn-sm btn-outline-secondary" style="font-size: 12px;">
                                <i class="fas fa-star"></i> Save
                            </button>
                        </div>
                    </div>
                `;
                
                const popup = L.popup({
                    closeButton: true,
                    className: 'custom-popup',
                    maxWidth: 300
                }).setContent(popupContent);
                
                searchMarker.bindPopup(popup).openPopup();
                
                // Add event listener to the directions button in the popup
                searchMarker.on('popupopen', function() {
                    const directionsBtn = document.getElementById('directions-btn');
                    if (directionsBtn) {
                        directionsBtn.addEventListener('click', function() {
                            // Set the search result as destination (Point B)
                            const pointBSelect = document.getElementById('point-b-select');
                            if (pointBSelect) {
                                pointBSelect.value = 'search';
                                // If user location is available, set it as starting point
                                if (userMarker) {
                                    document.getElementById('point-a-select').value = 'user';
                                }
                                // Calculate the route
                                calculateAndDisplayDistance();
                                
                                // Show the bottom sheet with route information on mobile
                                const bottomSheet = document.getElementById('mobile-bottom-sheet');
                                if (bottomSheet && window.innerWidth <= 768) {
                                    const peekHeight = 200;
                                    bottomSheet.style.height = `${peekHeight}px`;
                                    bottomSheet.classList.remove('collapsed');
                                    bottomSheet.classList.add('peek');
                                    bottomSheet.classList.remove('expanded');
                                    
                                    // Update bottom sheet content with route information
                                    const bottomSheetBody = document.getElementById('bottom-sheet-body');
                                    if (bottomSheetBody) {
                                        bottomSheetBody.innerHTML = `
                                            <div class="route-info-container">
                                                <div id="mobile-route-info">Loading route information...</div>
                                                <button id="mobile-start-navigation" class="btn btn-primary w-100 mt-3">
                                                    <i class="fas fa-play-circle"></i> Start Navigation
                                                </button>
                                            </div>
                                        `;
                                        
                                        // Add event listener to the start navigation button
                                        const mobileStartNavBtn = document.getElementById('mobile-start-navigation');
                                        if (mobileStartNavBtn) {
                                            mobileStartNavBtn.addEventListener('click', startNavigationFromRoute);
                                        }
                                    }
                                }
                            }
                        });
                    }
                    
                    const saveLocationBtn = document.getElementById('save-location-btn');
                    if (saveLocationBtn) {
                        saveLocationBtn.addEventListener('click', function() {
                            // Implement save location functionality (could be expanded in future)
                            alert('Location saved! (Feature coming soon)');
                        });
                    }
                });
                
                // Center the map on the search result with smooth animation
                map.flyTo([lat, lon], 15, {
                    animate: true,
                    duration: 1.5
                });
                
                // Show a toast notification for successful search
                showToast('Location found!', 'success');
            } else {
                // Show error message for no results
                showToast('Location not found. Please try a different search term.', 'error');
            }
        })
        .catch(error => {
            console.error("Error searching for location:", error);
            
            // Reset search icon
            if (searchIcon) {
                searchIcon.innerHTML = '<i class="fas fa-search"></i>';
            }
            
            showToast('Error searching for location. Please try again.', 'error');
        });
}

// Function to show toast notifications
function showToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        document.body.removeChild(existingToast);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type} slide-in`;
    
    // Set icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-${icon}"></i></div>
        <div class="toast-message">${message}</div>
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('slide-out');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}


// Function to reset the map
function resetMap() {
    // Remove markers
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }
    
    // Clear the search input
    document.getElementById('search-input').value = '';
    
    // Reset the map view to default
    map.setView([51.505, -0.09], 13);
}

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Earth's radius in kilometers
    const R = 6371;
    
    // Convert latitude and longitude from degrees to radians
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    // Haversine formula
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
}

// Function to handle custom point selection on map
function setupCustomPointSelection() {
    // Add click event to map for custom point selection
    map.on('click', function(e) {
        // Check if we're in custom point selection mode
        const pointASelect = document.getElementById('point-a-select');
        const pointBSelect = document.getElementById('point-b-select');
        
        if (pointASelect.value === 'custom' && !pointA) {
            // Set point A
            pointA = e.latlng;
            
            // Remove previous marker if exists
            if (pointAMarker) {
                map.removeLayer(pointAMarker);
            }
            
            // Add marker for point A
            pointAMarker = L.marker(pointA, {icon: L.divIcon({className: 'custom-div-icon', html: "<div style='background-color:#4285F4;' class='marker-pin'></div><span class='text-center'>A</span>", iconSize: [30, 42], iconAnchor: [15, 42]})}).addTo(map);
            pointAMarker.bindPopup("Point A").openPopup();
            
            // Reset selection
            pointASelect.value = '';
            
            // Show success message
            alert("Point A has been set!");
        } else if (pointBSelect.value === 'custom' && !pointB) {
            // Set point B
            pointB = e.latlng;
            
            // Remove previous marker if exists
            if (pointBMarker) {
                map.removeLayer(pointBMarker);
            }
            
            // Add marker for point B
            pointBMarker = L.marker(pointB, {icon: L.divIcon({className: 'custom-div-icon', html: "<div style='background-color:#DB4437;' class='marker-pin'></div><span class='text-center'>B</span>", iconSize: [30, 42], iconAnchor: [15, 42]})}).addTo(map);
            pointBMarker.bindPopup("Point B").openPopup();
            
            // Reset selection
            pointBSelect.value = '';
            
            // Show success message
            alert("Point B has been set!");
        }
    });
}

// Function to get coordinates based on selection
function getPointCoordinates(pointType) {
    const selectElement = document.getElementById(`point-${pointType}-select`);
    const selectedValue = selectElement.value;
    
    if (selectedValue === 'user' && userMarker) {
        return userMarker.getLatLng();
    } else if (selectedValue === 'search' && searchMarker) {
        return searchMarker.getLatLng();
    } else if (selectedValue === 'custom') {
        // Set flag for custom point selection
        if (pointType === 'a') {
            pointA = null;
            alert("Click on the map to set Point A");
        } else {
            pointB = null;
            alert("Click on the map to set Point B");
        }
        return null;
    } else {
        return null;
    }
}

// Function to calculate and display distance
function calculateAndDisplayDistance() {
    // Get coordinates for point A
    let coordsA = null;
    if (document.getElementById('point-a-select').value === 'custom' && pointA) {
        coordsA = pointA;
    } else {
        coordsA = getPointCoordinates('a');
    }
    
    // Get coordinates for point B
    let coordsB = null;
    if (document.getElementById('point-b-select').value === 'custom' && pointB) {
        coordsB = pointB;
    } else {
        coordsB = getPointCoordinates('b');
    }
    
    // Check if both points are available
    if (!coordsA || !coordsB) {
        alert("Please select both points to calculate distance");
        return;
    }
    
    // Calculate straight-line distance
    const straightDistance = calculateDistance(
        coordsA.lat, coordsA.lng,
        coordsB.lat, coordsB.lng
    );
    
    // Display loading message
    const resultElement = document.getElementById('distance-result');
    resultElement.style.display = 'block';
    resultElement.innerHTML = `<div class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div> Calculating road distance...`;
    
    // Draw a straight line between the two points
    if (window.distanceLine) {
        map.removeLayer(window.distanceLine);
        window.distanceLine = null;
    }
    
    if (window.routeLine) {
        map.removeLayer(window.routeLine);
        window.routeLine = null;
    }
    
    window.distanceLine = L.polyline([coordsA, coordsB], {color: 'blue', weight: 2, opacity: 0.5, dashArray: '5, 10'}).addTo(map);
    
    // Calculate road distance using OSRM API
    calculateRoadDistance(coordsA, coordsB)
        .then(routeData => {
            // Display both distances
            resultElement.innerHTML = `
                <div><strong>Straight-line distance:</strong> ${straightDistance.toFixed(2)} km (${(straightDistance * 0.621371).toFixed(2)} miles)</div>
                <div><strong>Road distance:</strong> ${routeData.distance.toFixed(2)} km (${(routeData.distance * 0.621371).toFixed(2)} miles)</div>
                <div><strong>Estimated driving time:</strong> ${routeData.duration} minutes</div>
            `;
            
            // Draw the actual route on the map
            if (routeData.geometry) {
                const decodedPath = decodePolyline(routeData.geometry);
                const latLngs = decodedPath.map(point => L.latLng(point[0], point[1]));
                
                window.routeLine = L.polyline(latLngs, {color: 'green', weight: 4, opacity: 0.7}).addTo(map);
                
                // Fit map to show the route
                const bounds = L.latLngBounds(latLngs);
                map.fitBounds(bounds, {padding: [50, 50]});
            } else {
                // If no route geometry, fit map to show both points
                const bounds = L.latLngBounds(coordsA, coordsB);
                map.fitBounds(bounds, {padding: [50, 50]});
            }
        })
        .catch(error => {
            console.error("Error calculating road distance:", error);
            resultElement.innerHTML = `
                <div><strong>Straight-line distance:</strong> ${straightDistance.toFixed(2)} km (${(straightDistance * 0.621371).toFixed(2)} miles)</div>
                <div class="text-danger"><strong>Road distance:</strong> Could not calculate. Using roads may be significantly longer.</div>
            `;
            
            // Fit map to show both points
            const bounds = L.latLngBounds(coordsA, coordsB);
            map.fitBounds(bounds, {padding: [50, 50]});
        });
}

// Function to reset the distance calculation
function resetDistance() {
    // Clear point markers
    if (pointAMarker) {
        map.removeLayer(pointAMarker);
        pointAMarker = null;
    }
    
    if (pointBMarker) {
        map.removeLayer(pointBMarker);
        pointBMarker = null;
    }
    
    // Clear straight line
    if (window.distanceLine) {
        map.removeLayer(window.distanceLine);
        window.distanceLine = null;
    }
    
    // Clear route line
    if (window.routeLine) {
        map.removeLayer(window.routeLine);
        window.routeLine = null;
    }
    
    // Reset variables
    pointA = null;
    pointB = null;
    
    // Reset selects
    document.getElementById('point-a-select').value = '';
    document.getElementById('point-b-select').value = '';
    
    // Hide result
    document.getElementById('distance-result').style.display = 'none';
}

// Set up event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mobile toggle functionality
    const mobileToggle = document.getElementById('mobile-toggle');
    const controlsSidebar = document.getElementById('controls-sidebar');
    const closeSidebar = document.getElementById('close-sidebar');
    
    if (mobileToggle && controlsSidebar) {
        mobileToggle.addEventListener('click', function() {
            controlsSidebar.classList.toggle('active');
        });
    }
    
    if (closeSidebar && controlsSidebar) {
        closeSidebar.addEventListener('click', function() {
            controlsSidebar.classList.remove('active');
        });
    }
    
    // Improved search functionality
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    
    // Search input events
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLocation();
            // Close mobile sidebar if open
            if (controlsSidebar) {
                controlsSidebar.classList.remove('active');
            }
        }
    });
    
    // Clear search button
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            searchInput.focus();
            // Remove search marker if exists
            if (searchMarker) {
                map.removeLayer(searchMarker);
                searchMarker = null;
            }
        });
    }
    
    // Locate button
    document.getElementById('locate-btn').addEventListener('click', function() {
        locateUser();
        // Close mobile sidebar if open
        if (controlsSidebar) {
            controlsSidebar.classList.remove('active');
        }
    });
    
    // Reset button
    document.getElementById('reset-btn').addEventListener('click', resetMap);
    
    // Setup custom point selection
    setupCustomPointSelection();
    
    // Point selection change events
    document.getElementById('point-a-select').addEventListener('change', function() {
        getPointCoordinates('a');
    });
    
    document.getElementById('point-b-select').addEventListener('change', function() {
        getPointCoordinates('b');
    });
    
    // Calculate distance button
    document.getElementById('calculate-distance-btn').addEventListener('click', function() {
        calculateAndDisplayDistance();
        // Close mobile sidebar if open
        if (controlsSidebar) {
            controlsSidebar.classList.remove('active');
        }
    });
    
    // Start navigation button
    document.getElementById('start-navigation-btn').addEventListener('click', function() {
        startNavigationFromRoute();
        // Close mobile sidebar if open
        if (controlsSidebar) {
            controlsSidebar.classList.remove('active');
        }
    });
    
    // Stop navigation button
    document.getElementById('stop-navigation-btn').addEventListener('click', stopNavigation);
    
    // Voice guidance toggle button
    document.getElementById('voice-guidance-btn').addEventListener('click', toggleVoiceGuidance);
    
    // Add distance reset to the reset map function
    const originalResetMap = resetMap;
    resetMap = function() {
        originalResetMap();
        resetDistance();
        
        // Also stop navigation if active
        if (navigationState && navigationState.isNavigating) {
            stopNavigation();
        }
        
        // Clear search input
        if (searchInput) {
            searchInput.value = '';
        }
    };
    
    // Add responsive behavior for map on window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            // Mobile view adjustments
            if (navigationState && navigationState.directionsPanel) {
                navigationState.directionsPanel.style.maxWidth = 'calc(100% - 20px)';
            }
        } else {
            // Desktop view adjustments
            if (navigationState && navigationState.directionsPanel) {
                navigationState.directionsPanel.style.maxWidth = '400px';
            }
        }
    });
});

// Function to start navigation using the currently calculated route
function startNavigationFromRoute() {
    // Get coordinates for point A and B
    let startPoint = null;
    let endPoint = null;
    
    // Get point A (start point)
    const pointASelect = document.getElementById('point-a-select');
    if (pointASelect.value === 'user' && userMarker) {
        startPoint = userMarker.getLatLng();
    } else if (pointASelect.value === 'search' && searchMarker) {
        startPoint = searchMarker.getLatLng();
    } else if (pointASelect.value === 'custom' && pointA) {
        startPoint = pointA;
    } else if (pointA) {
        startPoint = pointA;
    } else if (userMarker) {
        // Default to user location if available
        startPoint = userMarker.getLatLng();
    }
    
    // Get point B (end point)
    const pointBSelect = document.getElementById('point-b-select');
    if (pointBSelect.value === 'user' && userMarker) {
        endPoint = userMarker.getLatLng();
    } else if (pointBSelect.value === 'search' && searchMarker) {
        endPoint = searchMarker.getLatLng();
    } else if (pointBSelect.value === 'custom' && pointB) {
        endPoint = pointB;
    } else if (pointB) {
        endPoint = pointB;
    }
    
    // Check if we have both points
    if (!startPoint) {
        alert("Please select a starting point or use your current location");
        return;
    }
    
    if (!endPoint) {
        alert("Please select a destination point");
        return;
    }
    
    // Check if start and end points are the same
    if (startPoint.lat === endPoint.lat && startPoint.lng === endPoint.lng) {
        alert("Start and destination points cannot be the same");
        return;
    }
    
    // Show loading indicator
    const distanceResult = document.getElementById('distance-result');
    distanceResult.style.display = 'block';
    distanceResult.innerHTML = `<div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div> Starting navigation...`;
    
    // Start navigation with the selected points
    getDetailedRoute(startPoint, endPoint)
        .then(routeData => {
            // Hide the loading indicator
            distanceResult.style.display = 'none';
            
            // Set up navigation state
            navigationState.isNavigating = true;
            navigationState.currentRoute = routeData;
            navigationState.currentStep = 0;
            navigationState.remainingDistance = routeData.distance;
            navigationState.remainingTime = routeData.duration;
            navigationState.startTime = new Date();
            navigationState.destinationReached = false;
            navigationState.lastPosition = startPoint;
            
            // Draw the route on the map
            drawNavigationRoute(routeData);
            
            // Show the directions panel
            showDirectionsPanel(routeData);
            
            // Start tracking user's position
            startPositionTracking();
            
            // Announce first instruction
            if (navigationState.voiceEnabled) {
                announceInstruction(routeData.steps[0]);
            }
            
            // Update UI to show navigation mode
            updateNavigationUI(true);
        })
        .catch(error => {
            console.error('Error starting navigation:', error);
            distanceResult.style.display = 'none';
            alert('Could not start navigation. Please try again.');
        });
}