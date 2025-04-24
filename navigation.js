// Navigation functionality for live directions and movement tracking

/**
 * Navigation state object to track current navigation session
 */
let navigationState = {
    isNavigating: false,
    currentRoute: null,
    currentStep: 0,
    remainingDistance: 0,
    remainingTime: 0,
    startTime: null,
    destinationReached: false,
    watchId: null,
    lastPosition: null,
    voiceEnabled: true,
    routePolyline: null,
    directionsPanel: null
};

/**
 * Start navigation from current location to destination
 * @param {Object} destination - The destination point with lat and lng properties
 */
async function startNavigation(destination) {
    try {
        // Get current position
        const position = await getCurrentPosition();
        const startPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        
        // Calculate route
        const routeData = await getDetailedRoute(startPoint, destination);
        
        // Validate route data
        if (!routeData || !routeData.steps || routeData.steps.length === 0) {
            throw new Error('No valid route found to destination');
        }
        
        // Ensure each step has valid instructions
        routeData.steps = routeData.steps.map((step, index) => {
            if (!step.instruction || step.instruction === 'undefined') {
                // Generate a detailed instruction based on the maneuver type and distance
                const distanceText = step.distance ? formatDistance(step.distance) : '';
                
                if (index === 0) {
                    step.instruction = `Start navigation heading ${getCardinalDirection(step.heading)}`;
                } else if (index === routeData.steps.length - 1) {
                    step.instruction = 'You have arrived at your destination';
                } else if (step.maneuver === 'turn-right') {
                    step.instruction = `Turn right${step.road ? ' onto ' + step.road : ''}${distanceText ? ' and continue for ' + distanceText : ''}`;
                } else if (step.maneuver === 'turn-left') {
                    step.instruction = `Turn left${step.road ? ' onto ' + step.road : ''}${distanceText ? ' and continue for ' + distanceText : ''}`;
                } else if (step.maneuver === 'straight') {
                    step.instruction = `Continue straight${step.road ? ' on ' + step.road : ''}${distanceText ? ' for ' + distanceText : ''}`;
                } else if (step.maneuver === 'roundabout') {
                    step.instruction = `At the roundabout, take exit ${step.exit || 1}${step.road ? ' onto ' + step.road : ''}${distanceText ? ' and continue for ' + distanceText : ''}`;
                } else if (step.maneuver === 'merge') {
                    step.instruction = `Merge${step.road ? ' onto ' + step.road : ''}${distanceText ? ' and continue for ' + distanceText : ''}`;
                } else if (step.maneuver === 'ramp') {
                    step.instruction = `Take the ramp${step.road ? ' onto ' + step.road : ''}${distanceText ? ' and continue for ' + distanceText : ''}`;
                } else if (step.maneuver === 'fork') {
                    step.instruction = `Keep ${step.modifier || 'straight'} at the fork${distanceText ? ' and continue for ' + distanceText : ''}`;
                } else if (step.maneuver === 'end-of-road') {
                    step.instruction = `At the end of the road, turn ${step.modifier || 'right'}${step.road ? ' onto ' + step.road : ''}${distanceText ? ' and continue for ' + distanceText : ''}`;
                } else {
                    step.instruction = `Continue ${distanceText ? 'for ' + distanceText : 'to the next point'}`;
                }
            }
            return step;
        });
        
        /**
         * Format distance in a human-readable way
         * @param {number} distance - Distance in meters
         * @returns {string} - Formatted distance string
         */
        function formatDistance(distance) {
            if (distance < 1000) {
                return `${Math.round(distance)} meters`;
            } else {
                return `${(distance / 1000).toFixed(1)} km`;
            }
        }
        
        /**
         * Get cardinal direction from heading
         * @param {number} heading - Heading in degrees
         * @returns {string} - Cardinal direction
         */
        function getCardinalDirection(heading) {
            if (!heading && heading !== 0) return 'forward';
            
            const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
            const index = Math.round(heading / 45) % 8;
            return directions[index];
        }
        
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
        
        return true;
    } catch (error) {
        console.error('Error starting navigation:', error);
        alert('Could not start navigation. Please try again.');
        return false;
    }
}

/**
 * Stop the current navigation session
 */
function stopNavigation() {
    if (!navigationState.isNavigating) return;
    
    // Stop position tracking
    if (navigationState.watchId) {
        navigator.geolocation.clearWatch(navigationState.watchId);
        navigationState.watchId = null;
    }
    
    // Remove route from map
    if (navigationState.routePolyline) {
        if (Array.isArray(navigationState.routePolyline)) {
            navigationState.routePolyline.forEach(line => map.removeLayer(line));
        } else {
            map.removeLayer(navigationState.routePolyline);
        }
        navigationState.routePolyline = null;
    }
    
    // Remove start and end markers
    if (navigationState.startMarker) {
        map.removeLayer(navigationState.startMarker);
        navigationState.startMarker = null;
    }
    
    if (navigationState.endMarker) {
        map.removeLayer(navigationState.endMarker);
        navigationState.endMarker = null;
    }
    
    // Reset any map transformations
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.style.transform = '';
        mapContainer.style.transformOrigin = '';
    }
    
    // Hide directions panel
    hideDirectionsPanel();
    
    // Reset navigation state
    navigationState.isNavigating = false;
    navigationState.currentRoute = null;
    navigationState.currentStep = 0;
    navigationState.remainingDistance = 0;
    navigationState.remainingTime = 0;
    navigationState.startTime = null;
    navigationState.destinationReached = false;
    navigationState.lastPosition = null;
    
    // Update UI to hide navigation mode
    updateNavigationUI(false);
    
    // Show a message to the user
    alert('Navigation stopped');
}

/**
 * Get detailed route with turn-by-turn directions
 * @param {Object} start - The starting point with lat and lng properties
 * @param {Object} end - The ending point with lat and lng properties
 * @returns {Promise} - A promise that resolves with the detailed route information
 */
async function getDetailedRoute(start, end) {
    try {
        // Format coordinates for OSRM API (OSRM expects [lng,lat] format)
        const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
        
        // Call the OSRM API with steps=true to get turn-by-turn directions
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&steps=true&annotations=true`);
        const data = await response.json();
        
        // Check if the API returned a valid route
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            throw new Error('Could not calculate route');
        }
        
        // Extract route information
        const route = data.routes[0];
        const legs = route.legs[0];
        
        // Process steps to make them more user-friendly
        const steps = legs.steps.map(step => {
            return {
                instruction: step.maneuver.type === 'arrive' ? 'Arrive at destination' : step.maneuver.instruction,
                distance: step.distance,
                duration: step.duration,
                name: step.name,
                coordinates: decodePolyline(step.geometry),
                type: step.maneuver.type,
                modifier: step.maneuver.modifier
            };
        });
        
        return {
            distance: route.distance / 1000, // Convert to kilometers
            duration: Math.round(route.duration / 60), // Convert to minutes
            geometry: route.geometry, // This contains the encoded polyline
            steps: steps
        };
    } catch (error) {
        console.error('Error calculating detailed route:', error);
        throw error;
    }
}

/**
 * Draw the navigation route on the map
 * @param {Object} routeData - The route data from getDetailedRoute
 */
function drawNavigationRoute(routeData) {
    // Remove existing route if any
    if (navigationState.routePolyline) {
        if (Array.isArray(navigationState.routePolyline)) {
            navigationState.routePolyline.forEach(line => map.removeLayer(line));
        } else {
            map.removeLayer(navigationState.routePolyline);
        }
    }
    
    // Decode the polyline
    const coordinates = decodePolyline(routeData.geometry);
    
    // Convert to Leaflet format [lat, lng]
    const latLngs = coordinates.map(coord => L.latLng(coord[0], coord[1]));
    
    // Create a Google Maps style route with multiple layers
    navigationState.routePolyline = [];
    
    // Add outer glow (white border)
    const outerLine = L.polyline(latLngs, {
        color: '#FFFFFF',
        weight: 9,
        opacity: 0.7
    }).addTo(map);
    
    // Add main blue route
    const mainLine = L.polyline(latLngs, {
        color: '#4285F4',
        weight: 5,
        opacity: 0.9
    }).addTo(map);
    
    // Store both lines
    navigationState.routePolyline = [outerLine, mainLine];
    
    // Add start and end markers with custom icons
    if (navigationState.startMarker) map.removeLayer(navigationState.startMarker);
    if (navigationState.endMarker) map.removeLayer(navigationState.endMarker);
    
    // Start marker (green)
    navigationState.startMarker = L.marker(latLngs[0], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#0F9D58;' class='marker-pin'></div><span class='text-center'>A</span>",
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        })
    }).addTo(map);
    
    // End marker (red)
    navigationState.endMarker = L.marker(latLngs[latLngs.length - 1], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#DB4437;' class='marker-pin'></div><span class='text-center'>B</span>",
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        })
    }).addTo(map);
    
    // Fit the map to the route
    map.fitBounds(L.latLngBounds(latLngs), {
        padding: [50, 50]
    });
}

/**
 * Start tracking the user's position for navigation
 */
function startPositionTracking() {
    // Check if geolocation is available
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    // Options for the geolocation watch
    const options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
    };
    
    // Start watching position
    navigationState.watchId = navigator.geolocation.watchPosition(
        positionUpdate,
        positionError,
        options
    );
}

/**
 * Handle position updates during navigation
 * @param {GeolocationPosition} position - The current position
 */
function positionUpdate(position) {
    const currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    
    // Update user marker position
    updateUserMarkerPosition(currentPosition);
    
    // If not navigating, just update the marker
    if (!navigationState.isNavigating || !navigationState.currentRoute) return;
    
    // Calculate distance to next step
    const currentStep = navigationState.currentRoute.steps[navigationState.currentStep];
    const nextStepCoords = currentStep.coordinates[currentStep.coordinates.length - 1];
    const distanceToNextStep = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        nextStepCoords[0],
        nextStepCoords[1]
    );
    
    // Calculate distance to final destination
    const finalStep = navigationState.currentRoute.steps[navigationState.currentRoute.steps.length - 1];
    const finalCoords = finalStep.coordinates[finalStep.coordinates.length - 1];
    const distanceToDestination = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        finalCoords[0],
        finalCoords[1]
    );
    
    // Check if we've reached the destination directly
    if (distanceToDestination < 0.02) { // 20 meters threshold
        destinationReached();
        return;
    }
    
    // Check if we've reached the next step
    if (distanceToNextStep < 0.02) { // 20 meters threshold
        navigationState.currentStep++;
        
        // Check if we've reached the destination
        if (navigationState.currentStep >= navigationState.currentRoute.steps.length) {
            destinationReached();
            return;
        }
        
        // Announce the next instruction
        if (navigationState.voiceEnabled) {
            announceInstruction(navigationState.currentRoute.steps[navigationState.currentStep]);
        }
        
        // Update the directions panel
        updateDirectionsPanel();
    }
    
    // Update remaining distance and time
    updateRemainingInfo(currentPosition);
    
    // Store the last position
    navigationState.lastPosition = currentPosition;
    
    // If in follow mode, keep the map centered on the user
    const followButton = document.getElementById('view-mode-follow');
    if (followButton && followButton.classList.contains('btn-primary')) {
        map.setView([currentPosition.lat, currentPosition.lng], map.getZoom());
    }
}

/**
 * Handle position errors during navigation
 * @param {GeolocationPositionError} error - The error
 */
function positionError(error) {
    console.error('Error getting location:', error);
    
    // Show error message based on the error code
    let message = 'Unknown error occurred while tracking your position.';
    
    switch (error.code) {
        case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location services.';
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable. Please try again later.';
            break;
        case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
    }
    
    alert(message);
}

/**
 * Update the user marker position during navigation
 * @param {Object} position - The current position with lat and lng properties
 */
function updateUserMarkerPosition(position) {
    // Remove previous marker if it exists
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    // Calculate direction if we have a previous position
    let directionAngle = 0;
    let isMoving = false;
    if (navigationState.lastPosition && navigationState.isNavigating) {
        const dx = position.lng - navigationState.lastPosition.lng;
        const dy = position.lat - navigationState.lastPosition.lat;
        directionAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Check if user is actually moving (to avoid direction changes when stationary)
        const distance = calculateDistance(
            position.lat, position.lng,
            navigationState.lastPosition.lat, navigationState.lastPosition.lng
        );
        isMoving = distance > 0.001; // More than 1 meter movement
    }
    
    // Only use the calculated angle if we're moving, otherwise keep the previous angle
    if (!isMoving && userMarker && userMarker._directionAngle !== undefined) {
        directionAngle = userMarker._directionAngle;
    }
    
    // Create a Google Maps-like marker with accuracy circle
    let markerHtml;
    
    if (navigationState.isNavigating) {
        // Navigation mode marker (blue dot with direction arrow)
        markerHtml = `
            <div class="user-marker-container">
                <div class="user-marker-dot" style="background-color:#4285F4; border-radius: 50%; width: 24px; height: 24px; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                <div class="user-marker-arrow" style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%) rotate(${directionAngle}deg);">
                    <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 16px solid #4285F4;"></div>
                </div>
                <div class="user-marker-accuracy" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; border-radius: 50%; background-color: rgba(66, 133, 244, 0.2); border: 1px solid rgba(66, 133, 244, 0.4);"></div>
            </div>
        `;
    } else {
        // Standard mode marker (blue dot only)
        markerHtml = `
            <div class="user-marker-container">
                <div class="user-marker-dot" style="background-color:#4285F4; border-radius: 50%; width: 24px; height: 24px; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                <div class="user-marker-accuracy" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; border-radius: 50%; background-color: rgba(66, 133, 244, 0.2); border: 1px solid rgba(66, 133, 244, 0.4);"></div>
            </div>
        `;
    }
    
    userMarker = L.marker([position.lat, position.lng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: markerHtml,
            iconSize: [60, 60],  // Larger size to accommodate the accuracy circle
            iconAnchor: [30, 30]
        })
    }).addTo(map);
    
    // Store the direction angle for future reference
    userMarker._directionAngle = directionAngle;
    
    // If in navigation mode, keep the map centered on the user with smooth animation
    if (navigationState.isNavigating) {
        // Check if we should use smooth panning or instant view change
        const viewModeFollow = document.getElementById('view-mode-follow');
        if (viewModeFollow && viewModeFollow.classList.contains('active')) {
            // Use smooth panning for better UX
            map.panTo([position.lat, position.lng], {
                animate: true,
                duration: 0.5
            });
        }
        
        // Add a pulsing effect to indicate GPS activity
        const userMarkerElement = userMarker.getElement();
        if (userMarkerElement) {
            // Add pulsing animation
            userMarkerElement.style.animation = 'pulse 1.5s infinite';
            
            // Add a ripple effect for better visual feedback
            const ripple = document.createElement('div');
            ripple.className = 'user-marker-ripple';
            ripple.style.position = 'absolute';
            ripple.style.top = '50%';
            ripple.style.left = '50%';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.width = '40px';
            ripple.style.height = '40px';
            ripple.style.borderRadius = '50%';
            ripple.style.backgroundColor = 'transparent';
            ripple.style.border = '2px solid rgba(66, 133, 244, 0.6)';
            ripple.style.animation = 'ripple 2s infinite';
            
            userMarkerElement.appendChild(ripple);
            
            // Add keyframe animation for ripple if it doesn't exist
            if (!document.getElementById('ripple-animation')) {
                const style = document.createElement('style');
                style.id = 'ripple-animation';
                style.innerHTML = `
                    @keyframes ripple {
                        0% { width: 0; height: 0; opacity: 1; }
                        100% { width: 80px; height: 80px; opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }
    
    // Bind a popup with current speed and accuracy info if in navigation mode
    if (navigationState.isNavigating) {
        const speed = calculateCurrentSpeed();
        userMarker.bindPopup(`
            <div style="font-family: 'Roboto', Arial, sans-serif; padding: 5px;">
                <div style="font-weight: 500; margin-bottom: 5px;">Current Location</div>
                <div>Speed: ${speed} km/h</div>
                <div>Lat: ${position.lat.toFixed(6)}</div>
                <div>Lng: ${position.lng.toFixed(6)}</div>
            </div>
        `);
    }
}

/**
 * Update the remaining distance and time information
 * @param {Object} currentPosition - The current position with lat and lng properties
 */
function updateRemainingInfo(currentPosition) {
    if (!navigationState.currentRoute || !navigationState.isNavigating) return;
    
    // Get the remaining steps
    const remainingSteps = navigationState.currentRoute.steps.slice(navigationState.currentStep);
    
    // Calculate remaining distance
    let remainingDistance = 0;
    for (const step of remainingSteps) {
        remainingDistance += step.distance;
    }
    
    // Convert to kilometers
    remainingDistance = remainingDistance / 1000;
    
    // Calculate remaining time based on current speed
    const elapsedTime = (new Date() - navigationState.startTime) / 1000 / 60; // in minutes
    const distanceTraveled = navigationState.currentRoute.distance - remainingDistance;
    
    let remainingTime = navigationState.currentRoute.duration;
    
    // If we've traveled some distance, recalculate the ETA
    if (distanceTraveled > 0.1 && elapsedTime > 1) {
        const speed = distanceTraveled / elapsedTime; // km per minute
        remainingTime = remainingDistance / speed;
    }
    
    // Update the navigation state
    navigationState.remainingDistance = remainingDistance;
    navigationState.remainingTime = Math.round(remainingTime);
    
    // Update the UI
    updateNavigationInfo();
}

/**
 * Handle reaching the destination
 */
function destinationReached() {
    navigationState.destinationReached = true;
    
    // Announce arrival
    if (navigationState.voiceEnabled) {
        announceInstruction({ instruction: 'You have reached your destination' });
    }
    
    // Show arrival message
    alert('You have reached your destination!');
    
    // Stop navigation after a short delay
    setTimeout(() => {
        stopNavigation();
    }, 3000);
}

/**
 * Announce a navigation instruction using speech synthesis
 * @param {Object} step - The navigation step with instruction property
 */
function announceInstruction(step) {
    if (!step || !step.instruction) return;
    
    // Use the Web Speech API for voice guidance
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(step.instruction);
        utterance.lang = 'en-US';
        utterance.volume = 1;
        utterance.rate = 1;
        utterance.pitch = 1;
        
        window.speechSynthesis.speak(utterance);
    }
}

/**
 * Toggle voice guidance on/off
 */
function toggleVoiceGuidance() {
    navigationState.voiceEnabled = !navigationState.voiceEnabled;
    
    // Update the UI to reflect the change
    const voiceButton = document.getElementById('voice-guidance-btn');
    if (voiceButton) {
        voiceButton.textContent = navigationState.voiceEnabled ? 'Mute Voice' : 'Enable Voice';
        voiceButton.classList.toggle('btn-secondary', !navigationState.voiceEnabled);
        voiceButton.classList.toggle('btn-primary', navigationState.voiceEnabled);
    }
    
    // Announce the change
    if (navigationState.voiceEnabled) {
        announceInstruction({ instruction: 'Voice guidance enabled' });
    }
}

/**
 * Show the directions panel with turn-by-turn instructions
 * @param {Object} routeData - The route data from getDetailedRoute
 */
function showDirectionsPanel(routeData) {
    // On mobile devices, use the bottom sheet instead of creating a new panel
    if (window.innerWidth <= 768) {
        const bottomSheet = document.getElementById('mobile-bottom-sheet');
        if (bottomSheet) {
            // Expand the bottom sheet
            const maxHeight = window.innerHeight * 0.8;
            bottomSheet.style.height = `${maxHeight}px`;
            bottomSheet.classList.remove('collapsed');
            bottomSheet.classList.remove('peek');
            bottomSheet.classList.add('expanded');
            
            // Update bottom sheet content with route information
            const bottomSheetBody = document.getElementById('bottom-sheet-body');
            if (bottomSheetBody) {
                // Create detailed route information content
                let routeInfoHTML = `
                    <div class="route-details-container">
                        <div class="route-summary">
                            <div class="route-distance">
                                <i class="fas fa-road"></i> ${routeData.distance.toFixed(1)} km
                            </div>
                            <div class="route-duration">
                                <i class="fas fa-clock"></i> ${routeData.duration} min
                            </div>
                        </div>
                        <div class="route-steps-container">
                `;
                
                // Add all steps
                routeData.steps.forEach((step, index) => {
                    const icon = getDirectionIcon(step);
                    const distance = (step.distance / 1000).toFixed(1);
                    
                    routeInfoHTML += `
                        <div class="route-step ${index === 0 ? 'current-step' : ''}">
                            <div class="step-icon">${icon}</div>
                            <div class="step-details">
                                <div class="step-instruction">${step.instruction}</div>
                                <div class="step-distance">${distance} km</div>
                            </div>
                        </div>
                    `;
                });
                
                routeInfoHTML += `
                        </div>
                        <div class="navigation-actions">
                            <button id="mobile-start-navigation" class="btn btn-primary w-100 mt-3">
                                <i class="fas fa-play-circle"></i> Start Navigation
                            </button>
                        </div>
                    </div>
                `;
                
                bottomSheetBody.innerHTML = routeInfoHTML;
                
                // Add event listener to the start navigation button
                const mobileStartNavBtn = document.getElementById('mobile-start-navigation');
                if (mobileStartNavBtn) {
                    mobileStartNavBtn.addEventListener('click', function() {
                        // Update UI to show navigation mode
                        updateNavigationUI(true);
                        
                        // Update the bottom sheet with live navigation info
                        bottomSheetBody.innerHTML = `
                            <div class="live-navigation-container">
                                <div id="current-instruction" class="current-instruction">
                                    <div class="instruction-icon">${getDirectionIcon(routeData.steps[0])}</div>
                                    <div class="instruction-text">${routeData.steps[0].instruction}</div>
                                </div>
                                <div class="navigation-info">
                                    <div class="info-item">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span id="remaining-distance">${routeData.distance.toFixed(1)} km</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-clock"></i>
                                        <span id="eta">${new Date(Date.now() + routeData.duration * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                                <div class="navigation-controls">
                                    <button id="mobile-voice-toggle" class="btn btn-outline-primary">
                                        <i class="fas fa-volume-up"></i> Voice
                                    </button>
                                    <button id="mobile-stop-navigation" class="btn btn-outline-danger">
                                        <i class="fas fa-stop-circle"></i> Stop
                                    </button>
                                </div>
                            </div>
                        `;
                        
                        // Add event listeners to the new buttons
                        document.getElementById('mobile-voice-toggle').addEventListener('click', toggleVoiceGuidance);
                        document.getElementById('mobile-stop-navigation').addEventListener('click', stopNavigation);
                    });
                }
            }
            
            // Update the mobile route info if it exists
            const mobileRouteInfo = document.getElementById('mobile-route-info');
            if (mobileRouteInfo) {
                mobileRouteInfo.innerHTML = `
                    <div class="d-flex justify-content-between mb-2">
                        <div><i class="fas fa-road"></i> ${routeData.distance.toFixed(1)} km</div>
                        <div><i class="fas fa-clock"></i> ${routeData.duration} min</div>
                    </div>
                    <div class="text-muted small">${routeData.steps[0].instruction}</div>
                `;
            }
            
            return; // Exit early as we're using the bottom sheet instead
        }
    }
    
    // For desktop, create the directions panel if it doesn't exist
    if (!navigationState.directionsPanel) {
        const panel = document.createElement('div');
        panel.id = 'directions-panel';
        panel.className = 'directions-panel fade-in';
        
        // Add close button for mobile
        const closeButton = document.createElement('button');
        closeButton.className = 'btn-close';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '12px';
        closeButton.style.right = '12px';
        closeButton.style.color = 'white';
        closeButton.addEventListener('click', function() {
            // Minimize the panel on mobile instead of closing completely
            panel.classList.toggle('minimized');
        });
        
        panel.appendChild(closeButton);
        document.body.appendChild(panel);
        navigationState.directionsPanel = panel;
        
        // Make the panel draggable on mobile
        makeDraggable(panel);
    }
    
    // Populate the panel with route information
    updateDirectionsPanel();
    
    // Check if we're on mobile and adjust the panel size
    if (window.innerWidth <= 768) {
        navigationState.directionsPanel.style.maxWidth = 'calc(100% - 20px)';
    }
}

/**
 * Get direction icon based on maneuver type and modifier
 * @param {Object} step - The navigation step
 * @returns {string} - HTML for the direction icon
 */
function getDirectionIcon(step) {
    const type = step.type;
    const modifier = step.modifier;
    
    // Use Font Awesome icons for better consistency
    if (type === 'arrive') return '<i class="fas fa-flag-checkered"></i>';
    if (type === 'depart') return '<i class="fas fa-play"></i>';
    
    if (type === 'turn') {
        if (modifier === 'left') return '<i class="fas fa-arrow-left"></i>';
        if (modifier === 'right') return '<i class="fas fa-arrow-right"></i>';
        if (modifier === 'slight left') return '<i class="fas fa-arrow-alt-circle-left"></i>';
        if (modifier === 'slight right') return '<i class="fas fa-arrow-alt-circle-right"></i>';
        if (modifier === 'sharp left') return '<i class="fas fa-chevron-left"></i>';
        if (modifier === 'sharp right') return '<i class="fas fa-chevron-right"></i>';
        if (modifier === 'uturn') return '<i class="fas fa-undo"></i>';
    }
    
    if (type === 'continue') return '<i class="fas fa-arrow-up"></i>';
    if (type === 'roundabout') return '<i class="fas fa-sync"></i>';
    
    return '<i class="fas fa-arrow-right"></i>';
}

/**
 * Make an element draggable (for mobile)
 * @param {HTMLElement} element - The element to make draggable
 */
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    // Only enable dragging on mobile devices
    if (window.innerWidth > 768) return;
    
    // Add a drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '<div class="drag-indicator"></div>';
    dragHandle.style.width = '100%';
    dragHandle.style.height = '20px';
    dragHandle.style.cursor = 'move';
    dragHandle.style.display = 'flex';
    dragHandle.style.justifyContent = 'center';
    dragHandle.style.alignItems = 'center';
    
    // Add the drag indicator
    const dragIndicator = document.createElement('div');
    dragIndicator.style.width = '40px';
    dragIndicator.style.height = '4px';
    dragIndicator.style.backgroundColor = 'rgba(255,255,255,0.5)';
    dragIndicator.style.borderRadius = '4px';
    
    dragHandle.appendChild(dragIndicator);
    element.insertBefore(dragHandle, element.firstChild);
    
    dragHandle.onmousedown = dragMouseDown;
    dragHandle.ontouchstart = dragTouchStart;
    
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function dragTouchStart(e) {
        e = e || window.event;
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementTouchDrag;
    }
    
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Only allow vertical movement
        element.style.top = (element.offsetTop - pos2) + "px";
    }
    
    function elementTouchDrag(e) {
        e = e || window.event;
        pos1 = pos3 - e.touches[0].clientX;
        pos2 = pos4 - e.touches[0].clientY;
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;
        
        // Only allow vertical movement
        element.style.top = (element.offsetTop - pos2) + "px";
    }
    
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}

/**
 * Update the directions panel with current navigation information
 */
function updateDirectionsPanel() {
    if (!navigationState.currentRoute) return;
    
    const currentStep = navigationState.currentRoute.steps[navigationState.currentStep];
    
    // Check if we're on mobile and update the bottom sheet
    if (window.innerWidth <= 768) {
        const bottomSheetBody = document.getElementById('bottom-sheet-body');
        if (bottomSheetBody) {
            // Update the current instruction
            const currentInstructionElement = document.getElementById('current-instruction');
            if (currentInstructionElement) {
                currentInstructionElement.innerHTML = `
                    <div class="instruction-icon">${getDirectionIcon(currentStep)}</div>
                    <div class="instruction-text">${currentStep.instruction}</div>
                `;
            }
            
            // Update remaining distance and ETA
            const remainingDistanceElement = document.getElementById('remaining-distance');
            if (remainingDistanceElement) {
                remainingDistanceElement.textContent = `${navigationState.remainingDistance.toFixed(1)} km`;
            }
            
            const etaElement = document.getElementById('eta');
            if (etaElement) {
                etaElement.textContent = new Date(Date.now() + navigationState.remainingTime * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
            
            return; // Exit early as we've updated the mobile view
        }
    }
    
    // For desktop, update the directions panel if it exists
    if (!navigationState.directionsPanel) return;
    
    const panel = navigationState.directionsPanel;
    
    // Create header with summary info
    let content = `
        <div class="directions-header">
            <div class="directions-title">Navigation</div>
            <div class="directions-summary">
                <div>${navigationState.remainingDistance.toFixed(1)} km</div>
                <div>ETA: ${new Date(Date.now() + navigationState.remainingTime * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        </div>
        <div class="directions-body">
    `;
    
    // Add current step with prominent styling
    content += `
        <div class="direction-step current">
            <div class="direction-icon">${getDirectionIcon(currentStep)}</div>
            <div class="direction-content">
                <div class="direction-instruction">${currentStep.instruction}</div>
                <div class="direction-distance">${(currentStep.distance / 1000).toFixed(1)} km</div>
            </div>
        </div>
    `;
    
    // Add upcoming steps (up to 3)
    const remainingSteps = navigationState.currentRoute.steps.slice(navigationState.currentStep + 1, navigationState.currentStep + 4);
    
    if (remainingSteps.length > 0) {
        content += `<div class="direction-divider">THEN</div>`;
        
        remainingSteps.forEach(step => {
            content += `
                <div class="direction-step">
                    <div class="direction-icon">${getDirectionIcon(step)}</div>
                    <div class="direction-content">
                        <div class="direction-instruction">${step.instruction}</div>
                        <div class="direction-distance">${(step.distance / 1000).toFixed(1)} km</div>
                    </div>
                </div>
            `;
        });
    }
    
    // Add destination information
    const finalStep = navigationState.currentRoute.steps[navigationState.currentRoute.steps.length - 1];
    content += `
        <div class="direction-divider">DESTINATION</div>
        <div class="direction-step">
            <div class="direction-icon"><i class="fas fa-map-marker-alt"></i></div>
            <div class="direction-content">
                <div class="direction-instruction">Arrive at destination</div>
                <div class="direction-distance">Total: ${navigationState.currentRoute.distance.toFixed(1)} km</div>
            </div>
        </div>
    `;
    
    // Close the content div
    content += `</div>`;
    
    // Add action buttons at the bottom
    content += `
        <div class="directions-actions">
            <button class="view-mode-button" onclick="switchViewMode('overview')">
                <i class="fas fa-route view-mode-icon"></i> View Route
            </button>
            <button class="view-mode-button" onclick="switchViewMode('follow')">
                <i class="fas fa-location-arrow view-mode-icon"></i> Follow Me
            </button>
        </div>
    `;
    
    panel.innerHTML = content;
}

/**
 * Hide the directions panel
 */
function hideDirectionsPanel() {
    if (navigationState.directionsPanel) {
        document.body.removeChild(navigationState.directionsPanel);
        navigationState.directionsPanel = null;
    }
}

/**
 * Update the navigation UI elements
 * @param {boolean} isNavigating - Whether navigation is active
 */
function updateNavigationUI(isNavigating) {
    const navControls = document.getElementById('navigation-controls');
    const distanceControls = document.getElementById('distance-controls');
    const searchContainer = document.querySelector('.search-container');
    
    if (isNavigating) {
        // Show navigation controls, hide distance controls
        if (navControls) navControls.style.display = 'block';
        if (distanceControls) distanceControls.style.display = 'none';
        
        // Add view mode controls if they don't exist
        if (!document.getElementById('view-mode-controls')) {
            createViewModeControls();
        }
        
        // Show a toast notification that navigation has started
        showToast('Navigation started', 'success');
        
        // Modify search container for navigation mode
        if (searchContainer) {
            searchContainer.classList.add('navigation-mode');
            searchContainer.style.top = '70px'; // Move down to make room for navigation status bar
        }
        
        // Add navigation status bar
        createNavigationStatusBar();
    } else {
        // Hide navigation controls, show distance controls
        if (navControls) navControls.style.display = 'none';
        if (distanceControls) distanceControls.style.display = 'block';
        
        // Remove view mode controls
        const viewControls = document.getElementById('view-mode-controls');
        if (viewControls) {
            document.body.removeChild(viewControls);
        }
        
        // Remove navigation status bar
        const statusBar = document.getElementById('navigation-status-bar');
        if (statusBar) {
            document.body.removeChild(statusBar);
        }
        
        // Reset search container position
        if (searchContainer) {
            searchContainer.classList.remove('navigation-mode');
            searchContainer.style.top = '10px';
        }
    }
    
    // Update navigation info if navigating
    if (isNavigating) {
        updateNavigationInfo();
    }
}

/**
 * Create a Google Maps-like navigation status bar at the top of the screen
 */
function createNavigationStatusBar() {
    // Remove existing status bar if any
    const existingBar = document.getElementById('navigation-status-bar');
    if (existingBar) {
        document.body.removeChild(existingBar);
    }
    
    // Create status bar
    const statusBar = document.createElement('div');
    statusBar.id = 'navigation-status-bar';
    statusBar.className = 'navigation-status-bar';
    statusBar.style.position = 'absolute';
    statusBar.style.top = '0';
    statusBar.style.left = '0';
    statusBar.style.width = '100%';
    statusBar.style.backgroundColor = '#4285F4';
    statusBar.style.color = 'white';
    statusBar.style.padding = '10px 15px';
    statusBar.style.zIndex = '1001';
    statusBar.style.display = 'flex';
    statusBar.style.justifyContent = 'space-between';
    statusBar.style.alignItems = 'center';
    statusBar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    
    // ETA and distance info
    const etaTime = new Date(Date.now() + navigationState.remainingTime * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    statusBar.innerHTML = `
        <div style="display: flex; align-items: center;">
            <button id="exit-nav-btn" style="background: none; border: none; color: white; margin-right: 10px;">
                <i class="fas fa-times"></i>
            </button>
            <div>
                <div style="font-weight: 500; font-size: 16px;">ETA: ${etaTime}</div>
                <div style="font-size: 14px;">${navigationState.remainingDistance.toFixed(1)} km</div>
            </div>
        </div>
        <div>
            <button id="nav-options-btn" style="background: none; border: none; color: white;">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(statusBar);
    
    // Add event listeners
    document.getElementById('exit-nav-btn').addEventListener('click', stopNavigation);
    document.getElementById('nav-options-btn').addEventListener('click', toggleNavigationOptions);
}

/**
 * Toggle navigation options menu
 */
function toggleNavigationOptions() {
    // Remove existing menu if any
    const existingMenu = document.getElementById('nav-options-menu');
    if (existingMenu) {
        document.body.removeChild(existingMenu);
        return;
    }
    
    // Create options menu
    const optionsMenu = document.createElement('div');
    optionsMenu.id = 'nav-options-menu';
    optionsMenu.className = 'nav-options-menu';
    optionsMenu.style.position = 'absolute';
    optionsMenu.style.top = '50px';
    optionsMenu.style.right = '10px';
    optionsMenu.style.backgroundColor = 'white';
    optionsMenu.style.borderRadius = '8px';
    optionsMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    optionsMenu.style.zIndex = '1002';
    optionsMenu.style.overflow = 'hidden';
    
    // Menu options
    const options = [
        { id: 'toggle-voice', icon: navigationState.voiceEnabled ? 'fa-volume-up' : 'fa-volume-mute', text: navigationState.voiceEnabled ? 'Mute Voice' : 'Enable Voice' },
        { id: 'show-overview', icon: 'fa-route', text: 'Show Route Overview' },
        { id: 'share-location', icon: 'fa-share-alt', text: 'Share Location' }
    ];
    
    // Create menu items
    options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'nav-option-item';
        item.style.padding = '12px 16px';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.cursor = 'pointer';
        item.style.transition = 'background-color 0.2s';
        
        item.innerHTML = `
            <i class="fas ${option.icon}" style="margin-right: 12px; width: 20px;"></i>
            <span>${option.text}</span>
        `;
        
        item.addEventListener('mouseover', () => {
            item.style.backgroundColor = '#f1f3f4';
        });
        
        item.addEventListener('mouseout', () => {
            item.style.backgroundColor = 'white';
        });
        
        item.addEventListener('click', () => {
            handleNavigationOption(option.id);
            document.body.removeChild(optionsMenu);
        });
        
        optionsMenu.appendChild(item);
    });
    
    document.body.appendChild(optionsMenu);
}

/**
 * Handle navigation option selection
 * @param {string} optionId - The ID of the selected option
 */
function handleNavigationOption(optionId) {
    switch(optionId) {
        case 'toggle-voice':
            toggleVoiceGuidance();
            break;
        case 'show-overview':
            switchViewMode('overview');
            break;
        case 'share-location':
            // Simulate share functionality
            showToast('Sharing location... (Feature coming soon)', 'info');
            break;
    }
}

/**
 * Create view mode controls for navigation
 */
function createViewModeControls() {
    const controlDiv = document.createElement('div');
    controlDiv.id = 'view-mode-controls';
    controlDiv.className = 'view-mode-controls fade-in';
    
    // Add view mode buttons with Font Awesome icons
    const viewModes = [
        { id: 'follow', name: 'Follow', icon: 'fa-location-arrow', description: 'Follow your position' },
        { id: 'overview', name: 'Overview', icon: 'fa-route', description: 'See entire route' },
        { id: 'north-up', name: 'North Up', icon: 'fa-compass', description: 'Fixed orientation' },
        { id: 'tilt', name: '3D View', icon: 'fa-cube', description: 'Perspective view' }
    ];
    
    viewModes.forEach(mode => {
        const button = document.createElement('button');
        button.className = 'view-mode-button ' + (mode.id === 'follow' ? 'active' : '');
        button.innerHTML = `<i class="fas ${mode.icon} view-mode-icon"></i> ${mode.name}`;
        button.onclick = () => switchViewMode(mode.id);
        button.id = `view-mode-${mode.id}`;
        button.title = mode.description;
        
        controlDiv.appendChild(button);
    });
    
    // Add a collapse/expand button for mobile
    if (window.innerWidth <= 768) {
        const collapseButton = document.createElement('button');
        collapseButton.className = 'view-mode-collapse';
        collapseButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        collapseButton.style.width = '100%';
        collapseButton.style.textAlign = 'center';
        collapseButton.style.marginTop = '4px';
        collapseButton.style.padding = '4px';
        collapseButton.style.borderTop = '1px solid #eee';
        collapseButton.onclick = () => {
            const buttons = controlDiv.querySelectorAll('.view-mode-button');
            buttons.forEach(btn => {
                btn.style.display = btn.style.display === 'none' ? 'flex' : 'none';
            });
            collapseButton.innerHTML = buttons[0].style.display === 'none' ? 
                '<i class="fas fa-chevron-up"></i>' : 
                '<i class="fas fa-chevron-down"></i>';
        };
        
        controlDiv.appendChild(collapseButton);
    }
    
    document.body.appendChild(controlDiv);
}

/**
 * Switch between different view modes during navigation
 * @param {string} modeId - The ID of the view mode to switch to
 */
function switchViewMode(modeId) {
    // Update active button
    document.querySelectorAll('#view-mode-controls .view-mode-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`view-mode-${modeId}`).classList.add('active');
    
    // Show a toast notification about the view mode change
    const modeMessages = {
        'follow': 'Following your position',
        'overview': 'Showing full route overview',
        'north-up': 'North-up orientation',
        'tilt': 'Switching to 3D view'
    };
    
    showToast(modeMessages[modeId] || 'View mode changed', 'info');
    
    // Apply view mode changes with smooth transitions
    switch(modeId) {
        case 'follow':
            // Auto-follow user with rotation
            if (userMarker && navigationState.lastPosition) {
                map.flyTo([navigationState.lastPosition.lat, navigationState.lastPosition.lng], 16, {
                    duration: 1.5,
                    animate: true
                });
                
                // Highlight the current step in the directions panel
                highlightCurrentStep();
            }
            break;
            
        case 'overview':
            // Show the entire route with animation
            if (navigationState.routePolyline) {
                if (Array.isArray(navigationState.routePolyline)) {
                    const bounds = L.latLngBounds([]);
                    navigationState.routePolyline.forEach(line => {
                        if (line.getBounds) {
                            bounds.extend(line.getBounds());
                        }
                    });
                    map.flyToBounds(bounds, { 
                        padding: [50, 50],
                        duration: 1.5,
                        animate: true
                    });
                } else if (navigationState.routePolyline.getBounds) {
                    map.flyToBounds(navigationState.routePolyline.getBounds(), { 
                        padding: [50, 50],
                        duration: 1.5,
                        animate: true
                    });
                }
                
                // Pulse the route lines to highlight them
                pulseRouteLines();
            }
            break;
            
        case 'north-up':
            // Fixed north-up orientation with smooth transition
            if (userMarker && navigationState.lastPosition) {
                map.flyTo([navigationState.lastPosition.lat, navigationState.lastPosition.lng], 16, {
                    duration: 1.5,
                    animate: true
                });
                
                // Reset any transforms
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    mapContainer.style.transform = '';
                    mapContainer.style.transformOrigin = '';
                }
            }
            break;
            
        case 'tilt':
            // Enhanced 3D view with better visual effect
            if (userMarker && navigationState.lastPosition) {
                // First zoom in
                map.flyTo([navigationState.lastPosition.lat, navigationState.lastPosition.lng], 18, {
                    duration: 1.5,
                    animate: true
                });
                
                // Then apply the 3D transform with a slight delay for better effect
                setTimeout(() => {
                    const mapContainer = document.getElementById('map');
                    if (mapContainer) {
                        // Apply a more sophisticated transform for better 3D effect
                        mapContainer.style.transition = 'transform 1s ease-in-out';
                        mapContainer.style.transform = 'perspective(1200px) rotateX(35deg) scale(1.1)';
                        mapContainer.style.transformOrigin = 'center 70%';
                        
                        // Add a subtle shadow for depth
                        mapContainer.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
                        
                        // Reset after 8 seconds (longer duration for better experience)
                        setTimeout(() => {
                            mapContainer.style.transition = 'transform 1s ease-in-out, box-shadow 1s ease-in-out';
                            mapContainer.style.transform = '';
                            mapContainer.style.transformOrigin = '';
                            mapContainer.style.boxShadow = '';
                            
                            // Switch back to follow mode
                            setTimeout(() => {
                                switchViewMode('follow');
                            }, 1000);
                        }, 8000);
                    }
                }, 500);
            }
            break;
    }
}

/**
 * Highlight the current step in the directions panel
 */
function highlightCurrentStep() {
    const directionSteps = document.querySelectorAll('.direction-step');
    if (directionSteps.length > 0) {
        directionSteps.forEach((step, index) => {
            if (index === navigationState.currentStep) {
                step.classList.add('current');
                // Scroll to the current step
                if (navigationState.directionsPanel) {
                    step.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                step.classList.remove('current');
            }
        });
    }
}

/**
 * Create a pulsing effect on the route lines to highlight them
 */
function pulseRouteLines() {
    if (!navigationState.routePolyline || !Array.isArray(navigationState.routePolyline)) return;
    
    // Get the main route line (usually the second one, which is the blue line)
    const mainLine = navigationState.routePolyline[1];
    if (!mainLine) return;
    
    // Store the original options
    const originalWeight = mainLine.options.weight;
    const originalOpacity = mainLine.options.opacity;
    
    // Pulse effect (thicker and more opaque)
    mainLine.setStyle({ weight: originalWeight * 1.5, opacity: 1 });
    
    // Reset after a short delay
    setTimeout(() => {
        mainLine.setStyle({ weight: originalWeight, opacity: originalOpacity });
    }, 1000);
}

/**
 * Update the navigation information display
 */
function updateNavigationInfo() {
    const infoElement = document.getElementById('navigation-info');
    if (!infoElement || !navigationState.isNavigating) return;
    
    // Calculate ETA time
    const etaTime = new Date(Date.now() + navigationState.remainingTime * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    infoElement.innerHTML = `
        <div class="alert alert-info">
            <div><strong>Distance:</strong> ${navigationState.remainingDistance.toFixed(1)} km</div>
            <div><strong>ETA:</strong> ${etaTime}</div>
            <div><strong>Current speed:</strong> ${calculateCurrentSpeed()} km/h</div>
        </div>
    `;
    
    // Also update the navigation status bar if it exists
    const statusBar = document.getElementById('navigation-status-bar');
    if (statusBar) {
        const statusInfo = statusBar.querySelector('div:first-child div');
        if (statusInfo) {
            statusInfo.innerHTML = `
                <div style="font-weight: 500; font-size: 16px;">ETA: ${etaTime}</div>
                <div style="font-size: 14px;">${navigationState.remainingDistance.toFixed(1)} km</div>
            `;
        }
    }
}

/**
 * Calculate current speed based on position changes
 * @returns {string} Current speed in km/h
 */
function calculateCurrentSpeed() {
    if (!navigationState.lastPosition || !userMarker) return '0.0';
    
    const currentPosition = userMarker.getLatLng();
    const distance = calculateDistance(
        navigationState.lastPosition.lat,
        navigationState.lastPosition.lng,
        currentPosition.lat,
        currentPosition.lng
    );
    
    // Get time difference in hours
    const timeDiff = (new Date() - navigationState.startTime) / 1000 / 3600;
    
    if (timeDiff > 0) {
        const speed = distance / timeDiff;
        return speed.toFixed(1);
    }
    
    return '0.0';
}

/**
 * Show toast notifications for user feedback
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info, warning)
 */
function showToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        document.body.removeChild(existingToast);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type} slide-in`;
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    toast.style.zIndex = '2000';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.minWidth = '200px';
    toast.style.maxWidth = '80%';
    
    // Set icon based on type
    let icon = 'info-circle';
    let iconColor = '#4285F4'; // Google Blue
    
    if (type === 'success') {
        icon = 'check-circle';
        iconColor = '#0F9D58'; // Google Green
    } else if (type === 'error') {
        icon = 'exclamation-circle';
        iconColor = '#DB4437'; // Google Red
    } else if (type === 'warning') {
        icon = 'exclamation-triangle';
        iconColor = '#F4B400'; // Google Yellow
    }
    
    toast.innerHTML = `
        <div style="margin-right: 12px; color: ${iconColor};"><i class="fas fa-${icon}"></i></div>
        <div style="flex-grow: 1;">${message}</div>
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

/**
 * Get the current position as a Promise
 * @returns {Promise} - A promise that resolves with the current position
 */
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    });
}