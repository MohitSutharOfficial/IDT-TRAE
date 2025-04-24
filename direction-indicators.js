// Direction indicators for FindMyMap application

/**
 * Direction indicators system to show users where to go during navigation
 * This provides visual cues on the map with animated arrows pointing in the direction of travel
 */

let directionIndicators = {
    arrowMarkers: [],
    isActive: false,
    updateInterval: null,
    arrowSpacing: 100, // meters between arrows
    maxArrows: 5, // maximum number of arrows to show at once
    currentRoute: null
};

/**
 * Initialize direction indicators system
 */
function initDirectionIndicators() {
    // Add CSS for direction indicators
    addDirectionIndicatorStyles();
    
    // Listen for navigation events
    document.addEventListener('navigation:started', function(e) {
        if (e.detail && e.detail.route) {
            showDirectionIndicators(e.detail.route);
        }
    });
    
    document.addEventListener('navigation:stopped', function() {
        hideDirectionIndicators();
    });
    
    document.addEventListener('navigation:updated', function(e) {
        if (e.detail && e.detail.position && e.detail.route) {
            updateDirectionIndicators(e.detail.position, e.detail.route);
        }
    });
}

/**
 * Add CSS styles for direction indicators
 */
function addDirectionIndicatorStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .direction-arrow {
            width: 30px;
            height: 30px;
            background-color: #4285F4;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(79, 76, 76, 0.09);
            border: 2px solid white;
            color: white;
            font-size: 16px;
            transform-origin: center;
        }
        
        .direction-arrow i {
            transform: translateY(-1px);
        }
        
        .direction-arrow.pulse {
            animation: arrow-pulse 1.5s infinite;
        }
        
        .direction-arrow.next-turn {
            background-color: #F4B400;
            animation: arrow-pulse 1.5s infinite;
            z-index: 1000;
        }
        
        @keyframes arrow-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        
        .direction-arrow.animate-in {
            animation: arrow-in 0.3s forwards;
        }
        
        @keyframes arrow-in {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Show direction indicators along the route
 * @param {Object} route - The route object with geometry and steps
 */
function showDirectionIndicators(route) {
    // Clear any existing indicators
    hideDirectionIndicators();
    
    directionIndicators.currentRoute = route;
    directionIndicators.isActive = true;
    
    // Place initial arrows
    placeArrowsAlongRoute(route);
    
    // Set up interval to update arrows
    directionIndicators.updateInterval = setInterval(() => {
        if (navigationState.isNavigating && directionIndicators.isActive) {
            updateArrowPositions();
        } else {
            clearInterval(directionIndicators.updateInterval);
        }
    }, 2000); // Update every 2 seconds
}

/**
 * Hide all direction indicators
 */
function hideDirectionIndicators() {
    // Remove all arrow markers from the map
    directionIndicators.arrowMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    
    directionIndicators.arrowMarkers = [];
    directionIndicators.isActive = false;
    
    // Clear update interval
    if (directionIndicators.updateInterval) {
        clearInterval(directionIndicators.updateInterval);
        directionIndicators.updateInterval = null;
    }
}

/**
 * Place arrow indicators along the route
 * @param {Object} route - The route object with geometry
 */
function placeArrowsAlongRoute(route) {
    if (!route || !route.geometry) return;
    
    // Decode the route geometry
    const coordinates = decodePolyline(route.geometry);
    
    // Calculate total route length
    let totalDistance = 0;
    let distanceSegments = [];
    
    for (let i = 1; i < coordinates.length; i++) {
        const segmentDistance = calculateDistance(
            coordinates[i-1][0], coordinates[i-1][1],
            coordinates[i][0], coordinates[i][1]
        ) * 1000; // Convert to meters
        
        totalDistance += segmentDistance;
        distanceSegments.push({
            start: coordinates[i-1],
            end: coordinates[i],
            distance: segmentDistance,
            cumulativeDistance: totalDistance
        });
    }
    
    // Place arrows at regular intervals
    const numArrows = Math.min(directionIndicators.maxArrows, Math.floor(totalDistance / directionIndicators.arrowSpacing));
    
    if (numArrows <= 0) return;
    
    const arrowInterval = totalDistance / numArrows;
    
    // Place arrows
    for (let i = 1; i <= numArrows; i++) {
        const targetDistance = arrowInterval * i;
        
        // Find the segment containing this distance
        const segment = distanceSegments.find(seg => seg.cumulativeDistance >= targetDistance);
        
        if (segment) {
            // Calculate position within segment
            const prevCumulativeDistance = segment.cumulativeDistance - segment.distance;
            const segmentPortion = (targetDistance - prevCumulativeDistance) / segment.distance;
            
            // Interpolate position
            const lat = segment.start[0] + (segment.end[0] - segment.start[0]) * segmentPortion;
            const lng = segment.start[1] + (segment.end[1] - segment.start[1]) * segmentPortion;
            
            // Calculate direction angle
            const angle = calculateBearing(segment.start[0], segment.start[1], segment.end[0], segment.end[1]);
            
            // Add arrow marker
            addArrowMarker([lat, lng], angle, i === numArrows);
        }
    }
    
    // Add special marker for next turn
    addNextTurnMarker(route);
}

/**
 * Add an arrow marker at the specified position
 * @param {Array} position - [lat, lng] position for the arrow
 * @param {Number} angle - Direction angle in degrees
 * @param {Boolean} isLast - Whether this is the last arrow (closest to destination)
 */
function addArrowMarker(position, angle, isLast) {
    const arrowHtml = `
        <div class="direction-arrow ${isLast ? 'pulse' : ''}" style="transform: rotate(${angle}deg);">
            <i class="fas fa-arrow-up"></i>
        </div>
    `;
    
    const arrowMarker = L.marker(position, {
        icon: L.divIcon({
            className: 'direction-arrow-container',
            html: arrowHtml,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        }),
        zIndexOffset: isLast ? 1000 : 500
    }).addTo(map);
    
    // Add animation class after a short delay
    setTimeout(() => {
        const arrowElement = arrowMarker.getElement();
        if (arrowElement) {
            const arrowDiv = arrowElement.querySelector('.direction-arrow');
            if (arrowDiv) {
                arrowDiv.classList.add('animate-in');
            }
        }
    }, 10);
    
    directionIndicators.arrowMarkers.push(arrowMarker);
}

/**
 * Add a special marker for the next turn
 * @param {Object} route - The route object with steps
 */
function addNextTurnMarker(route) {
    if (!route || !route.steps || route.steps.length <= navigationState.currentStep + 1) return;
    
    // Get the next turn step
    const nextStep = route.steps[navigationState.currentStep + 1];
    
    // Only add marker for actual turns (not continue straight)
    if (nextStep.type === 'turn' || nextStep.type === 'roundabout' || 
        nextStep.type === 'fork' || nextStep.type === 'merge') {
        
        // Get the position of the turn
        const turnPosition = nextStep.coordinates[0];
        
        // Determine turn direction
        let turnIcon = 'fa-arrow-up';
        let turnClass = '';
        
        if (nextStep.modifier) {
            if (nextStep.modifier.includes('right')) {
                turnIcon = 'fa-arrow-right';
            } else if (nextStep.modifier.includes('left')) {
                turnIcon = 'fa-arrow-left';
            } else if (nextStep.modifier.includes('u-turn')) {
                turnIcon = 'fa-arrow-circle-down';
            }
        }
        
        // Create turn marker
        const turnHtml = `
            <div class="direction-arrow next-turn">
                <i class="fas ${turnIcon}"></i>
            </div>
        `;
        
        const turnMarker = L.marker([turnPosition[0], turnPosition[1]], {
            icon: L.divIcon({
                className: 'direction-arrow-container',
                html: turnHtml,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            }),
            zIndexOffset: 2000
        }).addTo(map);
        
        // Add popup with turn instruction
        turnMarker.bindPopup(nextStep.instruction, {
            offset: [0, -15],
            className: 'turn-popup'
        });
        
        directionIndicators.arrowMarkers.push(turnMarker);
    }
}

/**
 * Update arrow positions based on current location
 */
function updateArrowPositions() {
    if (!navigationState.isNavigating || !navigationState.currentRoute) return;
    
    // Remove existing arrows
    directionIndicators.arrowMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    
    directionIndicators.arrowMarkers = [];
    
    // Place new arrows based on current position
    placeArrowsAlongRoute(navigationState.currentRoute);
}

/**
 * Update direction indicators based on current position and route
 * @param {Object} position - Current position with lat and lng
 * @param {Object} route - Current route
 */
function updateDirectionIndicators(position, route) {
    if (!directionIndicators.isActive) return;
    
    // Update current route if provided
    if (route) {
        directionIndicators.currentRoute = route;
    }
    
    // Update arrow positions
    updateArrowPositions();
}

/**
 * Calculate bearing angle between two points
 * @param {Number} lat1 - Starting latitude
 * @param {Number} lng1 - Starting longitude
 * @param {Number} lat2 - Ending latitude
 * @param {Number} lng2 - Ending longitude
 * @returns {Number} - Bearing in degrees (0-360)
 */
function calculateBearing(lat1, lng1, lat2, lng2) {
    // Convert to radians
    const startLat = lat1 * Math.PI / 180;
    const startLng = lng1 * Math.PI / 180;
    const destLat = lat2 * Math.PI / 180;
    const destLng = lng2 * Math.PI / 180;
    
    // Calculate bearing
    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) -
              Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    
    // Normalize to 0-360
    bearing = (bearing + 360) % 360;
    
    return bearing;
}

// Initialize direction indicators when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDirectionIndicators);