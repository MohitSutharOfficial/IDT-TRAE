/**
 * Business Tourism Map Integration
 * Enhances business tourism features with direct map interaction
 */

// Store for tourism data and selected venues
let tourismData = [];
let selectedMeetingVenues = [];

// Initialize the business tourism map integration
document.addEventListener('DOMContentLoaded', function() {
    initBusinessTourismMapIntegration();
});

/**
 * Initialize business tourism map integration
 */
function initBusinessTourismMapIntegration() {
    // Set up map click handler for venue selection
    setupVenueMapSelection();
    
    // Set up tourism data overlay
    setupTourismDataOverlay();
    
    // Enhance venue finder with map integration
    enhanceVenueFinder();
    
    // Add map selection button to participant locations
    addMapSelectionToParticipants();
}

/**
 * Set up map click handler for venue selection
 */
function setupVenueMapSelection() {
    // Add a button to find venues near clicked location
    const findVenuesBtn = document.getElementById('find-venues-btn');
    const venueSelectionBtn = document.createElement('button');
    venueSelectionBtn.id = 'select-venue-location-btn';
    venueSelectionBtn.className = 'map-button';
    venueSelectionBtn.innerHTML = '<i class="fas fa-map-marker-alt map-button-icon"></i> Select on Map';
    
    if (findVenuesBtn && findVenuesBtn.parentNode) {
        findVenuesBtn.parentNode.insertBefore(venueSelectionBtn, findVenuesBtn);
    }
    
    // Add event listener to the button
    venueSelectionBtn.addEventListener('click', function() {
        // Enter venue selection mode
        window.selectingCustomPoint = 'venue';
        
        // Show selection mode indicator
        showSelectionModeIndicator('Click on the map to select meeting center location');
        
        // Show toast notification
        if (typeof showToast === 'function') {
            showToast('Click on the map to select meeting center location', 'info');
        }
    });
}

/**
 * Set up tourism data overlay on the map
 */
function setupTourismDataOverlay() {
    // Create tourism data toggle button
    const mapControls = document.querySelector('.d-flex.flex-wrap.gap-2.mb-4');
    if (mapControls) {
        const tourismBtn = document.createElement('button');
        tourismBtn.id = 'tourism-btn';
        tourismBtn.className = 'map-button';
        tourismBtn.innerHTML = '<i class="fas fa-umbrella-beach map-button-icon"></i> Tourism';
        
        mapControls.appendChild(tourismBtn);
        
        // Add event listener
        tourismBtn.addEventListener('click', function() {
            toggleTourismDataOverlay();
        });
    }
}

/**
 * Toggle tourism data overlay on the map
 */
function toggleTourismDataOverlay() {
    // Check if tourism data is already loaded
    if (tourismData.length === 0) {
        // Load tourism data (in a real app, this would be an API call)
        loadTourismData().then(data => {
            tourismData = data;
            displayTourismData(data);
        });
    } else {
        // Toggle visibility of existing tourism data
        const tourismLayer = window.tourismLayer;
        if (tourismLayer) {
            if (map.hasLayer(tourismLayer)) {
                map.removeLayer(tourismLayer);
                if (typeof showToast === 'function') {
                    showToast('Tourism data hidden', 'info');
                }
            } else {
                tourismLayer.addTo(map);
                if (typeof showToast === 'function') {
                    showToast('Tourism data shown', 'info');
                }
            }
        } else {
            displayTourismData(tourismData);
        }
    }
}

/**
 * Load tourism data
 * @returns {Promise} - A promise that resolves with tourism data
 */
async function loadTourismData() {
    // In a real implementation, this would call a tourism API
    // For demonstration, we'll use mock data and add some delay to simulate API call
    return new Promise(resolve => {
        setTimeout(() => {
            // Generate some mock tourism data around the current map center
            const center = map.getCenter();
            const data = [
                {
                    id: 'tourism1',
                    name: 'Historic Museum',
                    type: 'attraction',
                    location: { lat: center.lat + 0.01, lng: center.lng + 0.01 },
                    rating: 4.5,
                    description: 'A fascinating museum with historical artifacts',
                    image: 'https://example.com/museum.jpg'
                },
                {
                    id: 'tourism2',
                    name: 'Central Park',
                    type: 'park',
                    location: { lat: center.lat - 0.01, lng: center.lng - 0.01 },
                    rating: 4.8,
                    description: 'Beautiful park in the city center',
                    image: 'https://example.com/park.jpg'
                },
                {
                    id: 'tourism3',
                    name: 'Luxury Hotel',
                    type: 'accommodation',
                    location: { lat: center.lat + 0.02, lng: center.lng - 0.01 },
                    rating: 4.7,
                    description: '5-star hotel with excellent amenities',
                    image: 'https://example.com/hotel.jpg'
                },
                {
                    id: 'tourism4',
                    name: 'Shopping Mall',
                    type: 'shopping',
                    location: { lat: center.lat - 0.02, lng: center.lng + 0.02 },
                    rating: 4.2,
                    description: 'Large shopping center with many stores',
                    image: 'https://example.com/mall.jpg'
                },
                {
                    id: 'tourism5',
                    name: 'Fine Dining Restaurant',
                    type: 'restaurant',
                    location: { lat: center.lat + 0.015, lng: center.lng + 0.025 },
                    rating: 4.6,
                    description: 'Upscale restaurant with gourmet cuisine',
                    image: 'https://example.com/restaurant.jpg'
                }
            ];
            
            resolve(data);
        }, 500);
    });
}

/**
 * Display tourism data on the map
 * @param {Array} data - Tourism data to display
 */
function displayTourismData(data) {
    // Create a layer group for tourism markers
    const tourismLayer = L.layerGroup();
    
    // Add markers for each tourism point
    data.forEach(point => {
        // Set icon based on tourism type
        let icon = 'fas fa-landmark';
        let color = '#9C27B0'; // Default purple
        
        switch (point.type) {
            case 'attraction':
                icon = 'fas fa-monument';
                color = '#9C27B0'; // Purple
                break;
            case 'park':
                icon = 'fas fa-tree';
                color = '#4CAF50'; // Green
                break;
            case 'accommodation':
                icon = 'fas fa-hotel';
                color = '#2196F3'; // Blue
                break;
            case 'shopping':
                icon = 'fas fa-shopping-bag';
                color = '#FF9800'; // Orange
                break;
            case 'restaurant':
                icon = 'fas fa-utensils';
                color = '#F44336'; // Red
                break;
        }
        
        // Create marker
        const marker = L.marker([point.location.lat, point.location.lng], {
            icon: L.divIcon({
                className: 'tourism-marker',
                html: `<i class="${icon}" style="color: ${color};"></i>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        });
        
        // Add popup
        marker.bindPopup(`
            <div class="location-popup">
                <h5>${point.name}</h5>
                <p>${point.description}</p>
                <div class="venue-card-rating">
                    <i class="fas fa-star"></i> ${point.rating.toFixed(1)}
                </div>
                <div class="popup-actions">
                    <button class="popup-btn" onclick="showTourismDetails('${point.id}')"><i class="fas fa-info-circle"></i> Details</button>
                    <button class="popup-btn" onclick="addToItinerary('${point.id}')"><i class="fas fa-plus"></i> Add to Itinerary</button>
                </div>
            </div>
        `);
        
        // Add to layer group
        marker.addTo(tourismLayer);
    });
    
    // Add layer to map
    tourismLayer.addTo(map);
    
    // Store for later toggling
    window.tourismLayer = tourismLayer;
    
    // Show toast notification
    if (typeof showToast === 'function') {
        showToast('Tourism data loaded', 'success');
    }
}

/**
 * Enhance venue finder with map integration
 */
function enhanceVenueFinder() {
    // Override the venue finder's handleFindVenues function to add map integration
    if (typeof window.handleFindVenues === 'function') {
        const originalHandleFindVenues = window.handleFindVenues;
        
        window.handleFindVenues = async function() {
            try {
                // Call the original function
                await originalHandleFindVenues();
                
                // Add additional map integration
                if (window.venueSearchResults && window.venueSearchResults.length > 0) {
                    // Store selected venues
                    selectedMeetingVenues = window.venueSearchResults;
                    
                    // Add tourism data around the venues
                    const venueCenter = selectedMeetingVenues[0].location;
                    loadTourismDataNearVenues(venueCenter);
                }
            } catch (error) {
                console.error('Error in enhanced venue finder:', error);
            }
        };
    }
}

/**
 * Load tourism data near selected venues
 * @param {Object} center - Center location for tourism data
 */
function loadTourismDataNearVenues(center) {
    // Only load if tourism data isn't already displayed
    if (tourismData.length === 0) {
        loadTourismData().then(data => {
            tourismData = data;
            // Don't display automatically, let user toggle with the tourism button
        });
    }
}

/**
 * Add map selection button to participant locations
 */
function addMapSelectionToParticipants() {
    // Add a map button next to the add participant button
    const addParticipantBtn = document.getElementById('add-participant-btn');
    if (addParticipantBtn) {
        const mapSelectionBtn = document.createElement('button');
        mapSelectionBtn.type = 'button';
        mapSelectionBtn.className = 'add-participant-btn map-selection-btn';
        mapSelectionBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> From Map';
        
        // Insert after the add participant button
        if (addParticipantBtn.parentNode) {
            addParticipantBtn.parentNode.insertBefore(mapSelectionBtn, addParticipantBtn.nextSibling);
        }
        
        // Add event listener
        mapSelectionBtn.addEventListener('click', function() {
            window.selectingCustomPoint = 'participant';
            showSelectionModeIndicator('Click on the map to add participant location');
            
            // Show toast notification
            if (typeof showToast === 'function') {
                showToast('Click on the map to add participant location', 'info');
            }
        });
    }
}

/**
 * Show selection mode indicator on the map
 * @param {string} message - The message to display
 */
function showSelectionModeIndicator(message) {
    // Remove existing indicator
    const existingIndicator = document.querySelector('.map-selection-mode');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Create indicator
    const indicator = document.createElement('div');
    indicator.className = 'map-selection-mode';
    indicator.innerHTML = `<i class="fas fa-crosshairs"></i> ${message}`;
    
    // Add to document
    document.body.appendChild(indicator);
    
    // Remove after selection is made
    const clearIndicator = function() {
        if (window.selectingCustomPoint === null) {
            indicator.remove();
            document.removeEventListener('click', clearIndicator);
        }
    };
    
    // Listen for map clicks to remove indicator
    setTimeout(() => {
        document.addEventListener('click', clearIndicator);
    }, 100);
}

/**
 * Show tourism details
 * @param {string} id - Tourism point ID
 */
function showTourismDetails(id) {
    const point = tourismData.find(item => item.id === id);
    if (!point) return;
    
    // In a real app, this would show a modal with details
    if (typeof showToast === 'function') {
        showToast(`Viewing details for ${point.name}`, 'info');
    }
    
    console.log('Tourism details:', point);
}

/**
 * Add tourism point to itinerary
 * @param {string} id - Tourism point ID
 */
function addToItinerary(id) {
    const point = tourismData.find(item => item.id === id);
    if (!point) return;
    
    // In a real app, this would add to an itinerary feature
    if (typeof showToast === 'function') {
        showToast(`Added ${point.name} to itinerary`, 'success');
    }
    
    console.log('Added to itinerary:', point);
}

// Make functions available globally
window.showTourismDetails = showTourismDetails;
window.addToItinerary = addToItinerary;