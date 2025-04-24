// Routing API utilities for distance calculation and navigation

/**
 * Calculate the road distance between two points using OSRM API
 * @param {Object} pointA - The starting point with lat and lng properties
 * @param {Object} pointB - The ending point with lat and lng properties
 * @returns {Promise} - A promise that resolves with the distance and duration
 */
async function calculateRoadDistance(pointA, pointB) {
    try {
        // Format coordinates for OSRM API (OSRM expects [lng,lat] format)
        const coordinates = `${pointA.lng},${pointA.lat};${pointB.lng},${pointB.lat}`;
        
        // Call the OSRM API
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full`);
        const data = await response.json();
        
        // Check if the API returned a valid route
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            throw new Error('Could not calculate road distance');
        }
        
        // Extract distance (in meters) and duration (in seconds)
        const route = data.routes[0];
        const distanceKm = route.distance / 1000; // Convert to kilometers
        const durationMin = Math.round(route.duration / 60); // Convert to minutes
        
        // Return the distance and duration
        return {
            distance: distanceKm,
            duration: durationMin,
            geometry: route.geometry // This contains the encoded polyline
        };
    } catch (error) {
        console.error('Error calculating road distance:', error);
        throw error;
    }
}

/**
 * Get detailed route information with turn-by-turn directions
 * @param {Object} pointA - The starting point with lat and lng properties
 * @param {Object} pointB - The ending point with lat and lng properties
 * @returns {Promise} - A promise that resolves with detailed route information
 */
async function getDetailedRoute(pointA, pointB) {
    try {
        // Format coordinates for OSRM API (OSRM expects [lng,lat] format)
        const coordinates = `${pointA.lng},${pointA.lat};${pointB.lng},${pointB.lat}`;
        
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
 * Decode a polyline string into an array of coordinates
 * @param {String} encoded - The encoded polyline string
 * @returns {Array} - Array of [lat, lng] coordinates
 */
function decodePolyline(encoded) {
    // Implementation of Google's polyline algorithm
    // This decodes the polyline format returned by OSRM
    let index = 0;
    const len = encoded.length;
    const coordinates = [];
    let lat = 0;
    let lng = 0;

    while (index < len) {
        let b;
        let shift = 0;
        let result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        coordinates.push([lat / 1e5, lng / 1e5]);
    }

    return coordinates;
}