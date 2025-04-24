// Business Tourism Features for FindMyMap

/**
 * Business Meeting Location Finder and Travel Optimization
 * This module provides functionality for finding optimal business meeting locations,
 * comparing venues, and calculating travel times for multiple participants.
 */

// Store for business venues and meeting locations
let businessVenues = [];
let selectedVenues = [];

/**
 * Search for business meeting venues near a location
 * @param {Object} location - The center location with lat and lng properties
 * @param {Number} radius - Search radius in kilometers
 * @param {Object} filters - Filters for venue search (amenities, rating, etc.)
 * @returns {Promise} - A promise that resolves with venue results
 */
async function findBusinessVenues(location, radius = 2, filters = {}) {
    try {
        // In a real implementation, this would call a business venue API
        // For demonstration, we'll use mock data
        const mockVenues = [
            {
                id: 'venue1',
                name: 'Grand Business Center',
                location: { lat: location.lat + 0.01, lng: location.lng + 0.01 },
                rating: 4.7,
                price_level: 3,
                amenities: ['Conference Rooms', 'High-speed WiFi', 'Catering', 'Projectors'],
                capacity: 200,
                description: 'Premium business center with state-of-the-art facilities',
                image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
                contact: '+1 (555) 123-4567',
                website: 'https://example.com/grand-business-center'
            },
            {
                id: 'venue2',
                name: 'Executive Meeting Hub',
                location: { lat: location.lat - 0.01, lng: location.lng - 0.005 },
                rating: 4.5,
                price_level: 2,
                amenities: ['Meeting Rooms', 'WiFi', 'Coffee Service', 'Whiteboards'],
                capacity: 50,
                description: 'Convenient meeting spaces for medium-sized gatherings',
                image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4',
                contact: '+1 (555) 987-6543',
                website: 'https://example.com/executive-hub'
            },
            {
                id: 'venue3',
                name: 'Innovation Conference Center',
                location: { lat: location.lat + 0.005, lng: location.lng - 0.008 },
                rating: 4.8,
                price_level: 4,
                amenities: ['Large Conference Hall', 'High-speed WiFi', 'Full Catering', 'AV Equipment', 'Breakout Rooms'],
                capacity: 500,
                description: 'Expansive conference center for large corporate events',
                image: 'https://images.unsplash.com/photo-1573167243872-43c6433b9d40',
                contact: '+1 (555) 456-7890',
                website: 'https://example.com/innovation-center'
            }
        ];
        
        // Filter venues based on provided filters
        let filteredVenues = mockVenues;
        
        if (filters.minRating) {
            filteredVenues = filteredVenues.filter(venue => venue.rating >= filters.minRating);
        }
        
        if (filters.amenities && filters.amenities.length > 0) {
            filteredVenues = filteredVenues.filter(venue => {
                return filters.amenities.every(amenity => venue.amenities.includes(amenity));
            });
        }
        
        if (filters.minCapacity) {
            filteredVenues = filteredVenues.filter(venue => venue.capacity >= filters.minCapacity);
        }
        
        // Store the venues for later use
        businessVenues = filteredVenues;
        
        return filteredVenues;
    } catch (error) {
        console.error('Error finding business venues:', error);
        throw error;
    }
}

/**
 * Find the optimal meeting location based on multiple participants' locations
 * @param {Array} participantLocations - Array of participant locations with lat and lng
 * @param {Object} preferences - Meeting preferences (venue type, amenities, etc.)
 * @returns {Promise} - A promise that resolves with optimal meeting locations
 */
async function findOptimalMeetingLocation(participantLocations, preferences = {}) {
    try {
        // Calculate the centroid of all participant locations
        const centroid = calculateCentroid(participantLocations);
        
        // Find venues near the centroid
        const venues = await findBusinessVenues(centroid, preferences.radius || 5, preferences);
        
        // Calculate travel times for each participant to each venue
        const venuesWithTravelInfo = await Promise.all(venues.map(async (venue) => {
            const travelTimes = await Promise.all(participantLocations.map(async (participant, index) => {
                const route = await calculateRoadDistance(participant, venue.location);
                return {
                    participantId: index + 1,
                    duration: route.duration,
                    distance: route.distance
                };
            }));
            
            // Calculate average and total travel times
            const totalTravelTime = travelTimes.reduce((sum, info) => sum + info.duration, 0);
            const avgTravelTime = totalTravelTime / travelTimes.length;
            
            // Calculate maximum travel time (for fairness)
            const maxTravelTime = Math.max(...travelTimes.map(info => info.duration));
            
            return {
                ...venue,
                travelInfo: {
                    perParticipant: travelTimes,
                    totalTravelTime,
                    avgTravelTime,
                    maxTravelTime
                }
            };
        }));
        
        // Sort venues by optimal criteria (can be customized based on preferences)
        let sortedVenues;
        
        if (preferences.optimizeFor === 'fairness') {
            // Sort by minimizing the maximum travel time (most fair)
            sortedVenues = venuesWithTravelInfo.sort((a, b) => 
                a.travelInfo.maxTravelTime - b.travelInfo.maxTravelTime
            );
        } else if (preferences.optimizeFor === 'total') {
            // Sort by minimizing total travel time (most efficient)
            sortedVenues = venuesWithTravelInfo.sort((a, b) => 
                a.travelInfo.totalTravelTime - b.travelInfo.totalTravelTime
            );
        } else {
            // Default: sort by average travel time
            sortedVenues = venuesWithTravelInfo.sort((a, b) => 
                a.travelInfo.avgTravelTime - b.travelInfo.avgTravelTime
            );
        }
        
        return sortedVenues;
    } catch (error) {
        console.error('Error finding optimal meeting location:', error);
        throw error;
    }
}

/**
 * Calculate the centroid (average position) of multiple locations
 * @param {Array} locations - Array of locations with lat and lng properties
 * @returns {Object} - The centroid location with lat and lng properties
 */
function calculateCentroid(locations) {
    if (!locations || locations.length === 0) {
        throw new Error('No locations provided');
    }
    
    const sumLat = locations.reduce((sum, loc) => sum + loc.lat, 0);
    const sumLng = locations.reduce((sum, loc) => sum + loc.lng, 0);
    
    return {
        lat: sumLat / locations.length,
        lng: sumLng / locations.length
    };
}

/**
 * Compare multiple business venues for decision making
 * @param {Array} venueIds - Array of venue IDs to compare
 * @returns {Array} - Array of venues with comparison data
 */
function compareBusinessVenues(venueIds) {
    if (!businessVenues || businessVenues.length === 0) {
        throw new Error('No business venues available to compare');
    }
    
    // Filter venues by the provided IDs
    const venuesToCompare = businessVenues.filter(venue => venueIds.includes(venue.id));
    
    if (venuesToCompare.length === 0) {
        throw new Error('None of the specified venues were found');
    }
    
    // Store selected venues for later use
    selectedVenues = venuesToCompare;
    
    return venuesToCompare;
}

/**
 * Generate a travel itinerary for a business trip
 * @param {Object} origin - The starting location with lat and lng
 * @param {Object} destination - The destination location with lat and lng
 * @param {Object} options - Options for the itinerary (transportation, preferences)
 * @returns {Object} - The travel itinerary
 */
async function generateBusinessTravelItinerary(origin, destination, options = {}) {
    try {
        // Get detailed route information
        const routeInfo = await getDetailedRoute(origin, destination);
        
        // Format the itinerary
        const itinerary = {
            origin: origin,
            destination: destination,
            totalDistance: routeInfo.distance,
            estimatedDuration: routeInfo.duration,
            route: routeInfo.geometry,
            steps: routeInfo.steps,
            transportationMode: options.transportationMode || 'driving',
            departureTime: options.departureTime || new Date().toISOString(),
            estimatedArrivalTime: calculateArrivalTime(
                options.departureTime || new Date(), 
                routeInfo.duration
            )
        };
        
        return itinerary;
    } catch (error) {
        console.error('Error generating business travel itinerary:', error);
        throw error;
    }
}

/**
 * Calculate estimated arrival time based on departure time and duration
 * @param {Date|String} departureTime - Departure time as Date object or ISO string
 * @param {Number} durationMinutes - Travel duration in minutes
 * @returns {String} - Estimated arrival time as ISO string
 */
function calculateArrivalTime(departureTime, durationMinutes) {
    const departure = new Date(departureTime);
    const arrivalTime = new Date(departure.getTime() + durationMinutes * 60000);
    return arrivalTime.toISOString();
}

/**
 * Create a business venue marker on the map
 * @param {Object} venue - The venue object with location and details
 * @param {Object} map - The Leaflet map object
 * @returns {Object} - The created marker
 */
function createBusinessVenueMarker(venue, map) {
    // Create a custom icon for business venues
    const businessIcon = L.divIcon({
        className: 'business-venue-marker',
        html: `<div class="venue-marker-icon"><i class="fas fa-building"></i></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
    
    // Create the marker
    const marker = L.marker([venue.location.lat, venue.location.lng], {
        icon: businessIcon,
        title: venue.name
    }).addTo(map);
    
    // Create popup content
    const popupContent = `
        <div class="venue-popup">
            <h3>${venue.name}</h3>
            <div class="venue-rating">
                ${generateStarRating(venue.rating)}
                <span class="rating-value">${venue.rating}</span>
            </div>
            <p class="venue-description">${venue.description}</p>
            <div class="venue-details">
                <p><strong>Capacity:</strong> ${venue.capacity} people</p>
                <p><strong>Price Level:</strong> ${generatePriceLevel(venue.price_level)}</p>
                <p><strong>Amenities:</strong> ${venue.amenities.join(', ')}</p>
                <p><strong>Contact:</strong> ${venue.contact}</p>
            </div>
            <div class="venue-actions">
                <button class="btn btn-sm btn-primary select-venue-btn" data-venue-id="${venue.id}">
                    Select Venue
                </button>
                <button class="btn btn-sm btn-outline-secondary compare-venue-btn" data-venue-id="${venue.id}">
                    Add to Compare
                </button>
            </div>
        </div>
    `;
    
    // Bind popup to marker
    marker.bindPopup(popupContent);
    
    // Add click event listener
    marker.on('click', function() {
        // Highlight this venue in the sidebar list if it exists
        highlightVenueInList(venue.id);
    });
    
    return marker;
}

/**
 * Generate HTML for star rating display
 * @param {Number} rating - The rating value (0-5)
 * @returns {String} - HTML string for star rating
 */
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHtml = '';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star"></i>';
    }
    
    // Add half star if needed
    if (halfStar) {
        starsHtml += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star"></i>';
    }
    
    return starsHtml;
}

/**
 * Generate HTML for price level display
 * @param {Number} priceLevel - The price level (1-4)
 * @returns {String} - HTML string for price level
 */
function generatePriceLevel(priceLevel) {
    let html = '';
    for (let i = 0; i < priceLevel; i++) {
        html += '<span class="price-symbol">$</span>';
    }
    for (let i = priceLevel; i < 4; i++) {
        html += '<span class="price-symbol muted">$</span>';
    }
    return html;
}

/**
 * Highlight a venue in the sidebar list
 * @param {String} venueId - The ID of the venue to highlight
 */
function highlightVenueInList(venueId) {
    // Remove highlight from all venue items
    document.querySelectorAll('.venue-list-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add highlight to the selected venue item
    const venueItem = document.querySelector(`.venue-list-item[data-venue-id="${venueId}"]`);
    if (venueItem) {
        venueItem.classList.add('active');
        venueItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Create HTML for the business venue list in sidebar
 * @param {Array} venues - Array of venue objects
 * @returns {String} - HTML string for venue list
 */
function createVenueListHTML(venues) {
    if (!venues || venues.length === 0) {
        return '<p class="text-muted">No business venues found</p>';
    }
    
    let html = '<div class="venue-list">';
    
    venues.forEach(venue => {
        html += `
            <div class="venue-list-item" data-venue-id="${venue.id}">
                <div class="venue-list-content">
                    <h4 class="venue-name">${venue.name}</h4>
                    <div class="venue-rating small">
                        ${generateStarRating(venue.rating)}
                        <span class="rating-value">${venue.rating}</span>
                    </div>
                    <p class="venue-amenities small">${venue.amenities.slice(0, 3).join(', ')}${venue.amenities.length > 3 ? '...' : ''}</p>
                    ${venue.travelInfo ? `
                        <div class="travel-info">
                            <span class="travel-time"><i class="fas fa-clock"></i> Avg: ${Math.round(venue.travelInfo.avgTravelTime)} min</span>
                            <span class="travel-distance"><i class="fas fa-road"></i> Max: ${Math.round(venue.travelInfo.maxTravelTime)} min</span>
                        </div>
                    ` : ''}
                </div>
                <div class="venue-actions">
                    <button class="btn btn-sm btn-outline-primary view-venue-btn" data-venue-id="${venue.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary compare-venue-btn" data-venue-id="${venue.id}">
                        <i class="fas fa-balance-scale"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Create HTML for venue comparison view
 * @param {Array} venues - Array of venue objects to compare
 * @returns {String} - HTML string for comparison view
 */
function createVenueComparisonHTML(venues) {
    if (!venues || venues.length === 0) {
        return '<p class="text-muted">No venues selected for comparison</p>';
    }
    
    let html = `
        <div class="venue-comparison">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        ${venues.map(venue => `<th>${venue.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Rating</td>
                        ${venues.map(venue => `
                            <td>
                                <div class="venue-rating small">
                                    ${generateStarRating(venue.rating)}
                                    <span class="rating-value">${venue.rating}</span>
                                </div>
                            </td>
                        `).join('')}
                    </tr>
                    <tr>
                        <td>Price Level</td>
                        ${venues.map(venue => `
                            <td>${generatePriceLevel(venue.price_level)}</td>
                        `).join('')}
                    </tr>
                    <tr>
                        <td>Capacity</td>
                        ${venues.map(venue => `<td>${venue.capacity} people</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Amenities</td>
                        ${venues.map(venue => `
                            <td>
                                <ul class="amenities-list">
                                    ${venue.amenities.map(amenity => `<li>${amenity}</li>`).join('')}
                                </ul>
                            </td>
                        `).join('')}
                    </tr>
                    ${venues[0].travelInfo ? `
                        <tr>
                            <td>Avg Travel Time</td>
                            ${venues.map(venue => `
                                <td>${Math.round(venue.travelInfo.avgTravelTime)} min</td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td>Max Travel Time</td>
                            ${venues.map(venue => `
                                <td>${Math.round(venue.travelInfo.maxTravelTime)} min</td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td>Total Travel Time</td>
                            ${venues.map(venue => `
                                <td>${Math.round(venue.travelInfo.totalTravelTime)} min</td>
                            `).join('')}
                        </tr>
                    ` : ''}
                </tbody>
            </table>
            <div class="comparison-actions mt-3">
                <button id="clear-comparison" class="btn btn-sm btn-outline-secondary">
                    <i class="fas fa-times"></i> Clear Comparison
                </button>
            </div>
        </div>
    `;
    
    return html;
}

// Export functions for use in other modules
export {
    findBusinessVenues,
    findOptimalMeetingLocation,
    compareBusinessVenues,
    generateBusinessTravelItinerary,
    createBusinessVenueMarker,
    createVenueListHTML,
    createVenueComparisonHTML
};