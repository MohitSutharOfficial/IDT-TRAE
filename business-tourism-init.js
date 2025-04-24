// Business Tourism Initialization and Event Handlers
import { 
    findBusinessVenues, 
    findOptimalMeetingLocation, 
    compareBusinessVenues, 
    generateBusinessTravelItinerary, 
    createBusinessVenueMarker, 
    createVenueListHTML, 
    createVenueComparisonHTML 
} from './business-tourism.js';

// Global variables
let businessVenueMarkers = [];
let participantMarkers = [];
let participantLocations = [];
let selectedVenueIds = [];
let currentVenues = [];

// Initialize business tourism features
document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
    const addParticipantBtn = document.getElementById('add-participant-btn');
    const participantLocationsContainer = document.getElementById('participant-locations');
    const findVenuesBtn = document.getElementById('find-venues-btn');
    const venueResults = document.getElementById('venue-results');
    const venueListContainer = document.getElementById('venue-list-container');
    const venueComparisonContainer = document.getElementById('venue-comparison-container');
    const venueComparison = document.getElementById('venue-comparison');
    
    // Add event listeners
    if (addParticipantBtn) {
        addParticipantBtn.addEventListener('click', addParticipantLocation);
    }
    
    if (findVenuesBtn) {
        findVenuesBtn.addEventListener('click', findMeetingVenues);
    }
    
    // Initialize the first participant location input
    initializeParticipantLocationEvents();
});

/**
 * Add a new participant location input field
 */
function addParticipantLocation() {
    const participantLocationsContainer = document.getElementById('participant-locations');
    const participantCount = participantLocationsContainer.querySelectorAll('.participant-location').length;
    
    // Create a new participant location input
    const participantDiv = document.createElement('div');
    participantDiv.className = 'participant-location';
    participantDiv.dataset.index = participantCount;
    
    participantDiv.innerHTML = `
        <input type="text" class="form-control form-control-sm participant-input" placeholder="Enter location">
        <button type="button" class="btn-remove"><i class="fas fa-times"></i></button>
    `;
    
    participantLocationsContainer.appendChild(participantDiv);
    
    // Enable remove button on the first participant if we now have more than one
    if (participantCount === 1) {
        const firstParticipant = participantLocationsContainer.querySelector('.participant-location[data-index="0"] .btn-remove');
        if (firstParticipant) {
            firstParticipant.disabled = false;
        }
    }
    
    // Add event listener to the remove button
    const removeBtn = participantDiv.querySelector('.btn-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            participantDiv.remove();
            
            // If only one participant remains, disable its remove button
            const remainingParticipants = participantLocationsContainer.querySelectorAll('.participant-location');
            if (remainingParticipants.length === 1) {
                const lastRemoveBtn = remainingParticipants[0].querySelector('.btn-remove');
                if (lastRemoveBtn) {
                    lastRemoveBtn.disabled = true;
                }
            }
            
            // Reindex the remaining participants
            remainingParticipants.forEach((participant, index) => {
                participant.dataset.index = index;
            });
        });
    }
    
    // Add event listeners to the new input
    const input = participantDiv.querySelector('.participant-input');
    if (input) {
        input.addEventListener('change', function() {
            geocodeParticipantLocation(input, participantCount);
        });
    }
}

/**
 * Initialize event listeners for the first participant location input
 */
function initializeParticipantLocationEvents() {
    const firstParticipantInput = document.querySelector('.participant-location[data-index="0"] .participant-input');
    if (firstParticipantInput) {
        firstParticipantInput.addEventListener('change', function() {
            geocodeParticipantLocation(firstParticipantInput, 0);
        });
    }
}

/**
 * Geocode a participant location input and add a marker to the map
 * @param {HTMLElement} input - The input element
 * @param {Number} index - The participant index
 */
async function geocodeParticipantLocation(input, index) {
    const locationText = input.value.trim();
    if (!locationText) return;
    
    try {
        // Show loading indicator
        input.classList.add('loading');
        
        // Use Nominatim API for geocoding
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&limit=1`);
        const data = await response.json();
        
        // Remove loading indicator
        input.classList.remove('loading');
        
        if (data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            
            // Remove previous marker for this participant if it exists
            if (participantMarkers[index]) {
                map.removeLayer(participantMarkers[index]);
            }
            
            // Create a marker for the participant
            const markerHtml = `
                <div style="background-color: #0F9D58; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                    <span style="font-weight: bold;">${index + 1}</span>
                </div>
            `;
            
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'participant-marker',
                    html: markerHtml,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            }).addTo(map);
            
            marker.bindPopup(`Participant ${index + 1}: ${result.display_name}`);
            participantMarkers[index] = marker;
            
            // Store the participant location
            participantLocations[index] = { lat, lng };
            
            // If we have at least 2 participants, fit the map to show all markers
            if (participantLocations.filter(Boolean).length >= 2) {
                const group = new L.featureGroup(participantMarkers.filter(Boolean));
                map.fitBounds(group.getBounds().pad(0.2));
            } else {
                map.setView([lat, lng], 13);
            }
            
            // Show success indicator
            input.classList.add('is-valid');
            setTimeout(() => input.classList.remove('is-valid'), 2000);
        } else {
            // Show error indicator
            input.classList.add('is-invalid');
            setTimeout(() => input.classList.remove('is-invalid'), 2000);
        }
    } catch (error) {
        console.error('Error geocoding participant location:', error);
        input.classList.remove('loading');
        input.classList.add('is-invalid');
        setTimeout(() => input.classList.remove('is-invalid'), 2000);
    }
}

/**
 * Find meeting venues based on participant locations and preferences
 */
async function findMeetingVenues() {
    const venueResults = document.getElementById('venue-results');
    const venueListContainer = document.getElementById('venue-list-container');
    const venueComparisonContainer = document.getElementById('venue-comparison-container');
    
    // Filter out empty participant locations
    const validParticipantLocations = participantLocations.filter(Boolean);
    
    if (validParticipantLocations.length < 2) {
        showToast('Please enter at least two participant locations', 'error');
        return;
    }
    
    try {
        // Show loading indicator
        const findVenuesBtn = document.getElementById('find-venues-btn');
        if (findVenuesBtn) {
            findVenuesBtn.disabled = true;
            findVenuesBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Finding venues...';
        }
        
        // Clear previous venue markers
        clearBusinessVenueMarkers();
        
        // Get preferences
        const preferences = getVenuePreferences();
        
        // Find optimal meeting locations
        const venues = await findOptimalMeetingLocation(validParticipantLocations, preferences);
        
        // Store the current venues
        currentVenues = venues;
        
        // Display venues on the map
        venues.forEach(venue => {
            const marker = createBusinessVenueMarker(venue, map);
            businessVenueMarkers.push(marker);
            
            // Add click event to the "Select Venue" button in the popup
            marker.on('popupopen', function() {
                const selectBtn = document.querySelector(`.select-venue-btn[data-venue-id="${venue.id}"]`);
                if (selectBtn) {
                    selectBtn.addEventListener('click', function() {
                        selectVenue(venue.id);
                    });
                }
                
                const compareBtn = document.querySelector(`.compare-venue-btn[data-venue-id="${venue.id}"]`);
                if (compareBtn) {
                    compareBtn.addEventListener('click', function() {
                        addVenueToComparison(venue.id);
                    });
                }
            });
        });
        
        // Create venue list HTML
        const venueListHTML = createVenueListHTML(venues);
        if (venueListContainer) {
            venueListContainer.innerHTML = venueListHTML;
            
            // Add event listeners to venue list items
            document.querySelectorAll('.venue-list-item').forEach(item => {
                item.addEventListener('click', function() {
                    const venueId = this.dataset.venueId;
                    highlightVenue(venueId);
                });
                
                const viewBtn = item.querySelector('.view-venue-btn');
                if (viewBtn) {
                    viewBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const venueId = this.dataset.venueId;
                        viewVenue(venueId);
                    });
                }
                
                const compareBtn = item.querySelector('.compare-venue-btn');
                if (compareBtn) {
                    compareBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const venueId = this.dataset.venueId;
                        addVenueToComparison(venueId);
                    });
                }
            });
        }
        
        // Show venue results
        if (venueResults) {
            venueResults.style.display = 'block';
        }
        
        // Hide venue comparison if it's visible
        if (venueComparisonContainer) {
            venueComparisonContainer.style.display = 'none';
        }
        
        // Fit map to show all markers
        const allMarkers = [...participantMarkers.filter(Boolean), ...businessVenueMarkers];
        const group = new L.featureGroup(allMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
        
        // Reset button
        if (findVenuesBtn) {
            findVenuesBtn.disabled = false;
            findVenuesBtn.innerHTML = '<i class="fas fa-search map-button-icon"></i> Find Meeting Venues';
        }
        
        // Show success message
        showToast(`Found ${venues.length} suitable meeting venues`, 'success');
    } catch (error) {
        console.error('Error finding meeting venues:', error);
        
        // Reset button
        const findVenuesBtn = document.getElementById('find-venues-btn');
        if (findVenuesBtn) {
            findVenuesBtn.disabled = false;
            findVenuesBtn.innerHTML = '<i class="fas fa-search map-button-icon"></i> Find Meeting Venues';
        }
        
        // Show error message
        showToast('Error finding meeting venues. Please try again.', 'error');
    }
}

/**
 * Get venue preferences from the form
 * @returns {Object} - The venue preferences
 */
function getVenuePreferences() {
    const searchRadius = document.getElementById('search-radius');
    const minRating = document.getElementById('min-rating');
    const optimizeFor = document.getElementById('optimize-for');
    
    // Get selected amenities
    const amenities = [];
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        amenities.push(checkbox.value);
    });
    
    return {
        radius: searchRadius ? parseFloat(searchRadius.value) || 5 : 5,
        minRating: minRating && minRating.value ? parseFloat(minRating.value) : null,
        amenities: amenities,
        optimizeFor: optimizeFor ? optimizeFor.value : 'average'
    };
}

/**
 * Clear all business venue markers from the map
 */
function clearBusinessVenueMarkers() {
    businessVenueMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    businessVenueMarkers = [];
}

/**
 * Highlight a venue in the list and on the map
 * @param {String} venueId - The ID of the venue to highlight
 */
function highlightVenue(venueId) {
    // Find the venue marker
    const venueMarker = businessVenueMarkers.find(marker => {
        return marker.getPopup().getContent().includes(`data-venue-id="${venueId}"`);
    });
    
    if (venueMarker) {
        // Open the popup
        venueMarker.openPopup();
        
        // Pan to the marker
        map.panTo(venueMarker.getLatLng());
    }
    
    // Highlight in the list
    document.querySelectorAll('.venue-list-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.venueId === venueId) {
            item.classList.add('active');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

/**
 * View a venue details
 * @param {String} venueId - The ID of the venue to view
 */
function viewVenue(venueId) {
    // Find the venue marker and open its popup
    const venueMarker = businessVenueMarkers.find(marker => {
        return marker.getPopup().getContent().includes(`data-venue-id="${venueId}"`);
    });
    
    if (venueMarker) {
        venueMarker.openPopup();
        map.panTo(venueMarker.getLatLng());
        map.setZoom(16);
    }
}

/**
 * Add a venue to the comparison list
 * @param {String} venueId - The ID of the venue to add to comparison
 */
function addVenueToComparison(venueId) {
    const venueComparisonContainer = document.getElementById('venue-comparison-container');
    const venueComparison = document.getElementById('venue-comparison');
    
    // Check if venue is already in comparison
    if (selectedVenueIds.includes(venueId)) {
        showToast('This venue is already in comparison', 'info');
        return;
    }
    
    // Add venue to selected venues
    selectedVenueIds.push(venueId);
    
    // Get venues to compare
    const venuesToCompare = compareBusinessVenues(selectedVenueIds);
    
    // Create comparison HTML
    const comparisonHTML = createVenueComparisonHTML(venuesToCompare);
    if (venueComparison) {
        venueComparison.innerHTML = comparisonHTML;
        
        // Add event listener to clear comparison button
        const clearComparisonBtn = document.getElementById('clear-comparison');
        if (clearComparisonBtn) {
            clearComparisonBtn.addEventListener('click', clearVenueComparison);
        }
    }
    
    // Show comparison container
    if (venueComparisonContainer) {
        venueComparisonContainer.style.display = 'block';
    }
    
    // Show success message
    showToast(`Added ${venuesToCompare.find(v => v.id === venueId).name} to comparison`, 'success');
}

/**
 * Clear the venue comparison
 */
function clearVenueComparison() {
    const venueComparisonContainer = document.getElementById('venue-comparison-container');
    
    // Clear selected venues
    selectedVenueIds = [];
    
    // Hide comparison container
    if (venueComparisonContainer) {
        venueComparisonContainer.style.display = 'none';
    }
}

/**
 * Select a venue for the meeting
 * @param {String} venueId - The ID of the selected venue
 */
function selectVenue(venueId) {
    // Find the venue in current venues
    const venue = currentVenues.find(v => v.id === venueId);
    if (!venue) return;
    
    // Show confirmation message
    showToast(`Selected ${venue.name} as the meeting venue`, 'success');
    
    // Highlight the venue
    highlightVenue(venueId);
}

/**
 * Show a toast notification
 * @param {String} message - The message to display
 * @param {String} type - The type of toast (success, error, info, warning)
 */
function showToast(message, type = 'info') {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    // Set icon based on type
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle toast-icon"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle toast-icon"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle toast-icon"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle toast-icon"></i>';
    }
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(toast);
    
    // Animate in
    toast.style.animation = 'slide-in 0.3s forwards';
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slide-out 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Mock function for calculating road distance (in a real app, this would use a routing API)
async function calculateRoadDistance(origin, destination) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Calculate straight-line distance
    const R = 6371; // Earth's radius in km
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLon = (destination.lng - origin.lng) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Simulate road distance (typically 20-40% longer than straight line)
    const roadFactor = 1.3;
    const roadDistance = distance * roadFactor;
    
    // Simulate travel time (assuming average speed of 50 km/h)
    const avgSpeed = 50; // km/h
    const duration = (roadDistance / avgSpeed) * 60; // Convert to minutes
    
    return {
        distance: roadDistance,
        duration: duration
    };
}

// Mock function for getting detailed route information
async function getDetailedRoute(origin, destination) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get basic distance and duration
    const basic = await calculateRoadDistance(origin, destination);
    
    // Create mock route geometry (simplified)
    const steps = [
        {
            instruction: 'Start from your location',
            distance: 0,
            duration: 0
        },
        {
            instruction: 'Head north on Main St',
            distance: basic.distance * 0.2,
            duration: basic.duration * 0.2
        },
        {
            instruction: 'Turn right onto Broadway',
            distance: basic.distance * 0.3,
            duration: basic.duration * 0.3
        },
        {
            instruction: 'Continue onto 5th Ave',
            distance: basic.distance * 0.4,
            duration: basic.duration * 0.4
        },
        {
            instruction: 'Arrive at destination',
            distance: basic.distance * 0.1,
            duration: basic.duration * 0.1
        }
    ];
    
    return {
        distance: basic.distance,
        duration: basic.duration,
        geometry: 'mock_geometry',
        steps: steps
    };
}