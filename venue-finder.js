/**
 * Venue Finder Component for Business Tourism Web Application
 * Provides AI-powered optimal meeting location finder with geocoding functionality
 */

// Store for venue data and search results
let venueSearchResults = [];
let selectedVenue = null;

/**
 * Initialize the venue finder component
 * @param {Object} mapInstance - The map instance to display venues on
 */
function initVenueFinder(mapInstance) {
  if (!mapInstance) {
    console.error('Map instance is required for venue finder initialization');
    return;
  }
  
  // Set up event listeners for venue finding controls
  setupVenueFinderControls();
  
  // Initialize venue markers layer group
  initVenueMarkers(mapInstance);
}

/**
 * Set up event listeners for venue finder controls
 */
function setupVenueFinderControls() {
  const findVenuesBtn = document.getElementById('find-venues-btn');
  if (findVenuesBtn) {
    findVenuesBtn.addEventListener('click', handleFindVenues);
  }
  
  // Set up optimization preference controls
  const optimizeForSelect = document.getElementById('optimize-for');
  if (optimizeForSelect) {
    optimizeForSelect.addEventListener('change', (e) => {
      if (venueSearchResults.length > 0) {
        // Re-rank venues based on new optimization preference
        rankVenuesByPreference(venueSearchResults, e.target.value);
        renderVenueResults(venueSearchResults);
      }
    });
  }
}

/**
 * Initialize venue markers on the map
 * @param {Object} mapInstance - The map instance
 */
function initVenueMarkers(mapInstance) {
  // Create a layer group for venue markers
  window.venueMarkersGroup = L.layerGroup().addTo(mapInstance);
  window.venueFinderMap = mapInstance;
}

/**
 * Handle the "Find Venues" button click
 */
async function handleFindVenues() {
  try {
    // Show loading indicator
    toggleLoadingState(true, 'Finding optimal meeting venues...');
    
    // Get participant locations from participant manager
    const participantLocations = getParticipantLocations();
    if (!participantLocations || participantLocations.length < 2) {
      showError('Please add at least two participant locations');
      toggleLoadingState(false);
      return;
    }
    
    // Get meeting preferences
    const preferences = getMeetingPreferences();
    
    // Find optimal meeting location
    const optimalLocation = await findOptimalLocation(participantLocations, preferences);
    
    // Search for venues near the optimal location
    const venues = await searchVenuesNearLocation(optimalLocation, preferences);
    
    // Rank venues based on optimization preference
    venueSearchResults = rankVenuesByPreference(venues, preferences.optimizeFor);
    
    // Display results
    renderVenueResults(venueSearchResults);
    
    // Update map with venue markers
    updateVenueMarkersOnMap(venueSearchResults);
    
    // Hide loading indicator
    toggleLoadingState(false);
    
    // Show success message
    showToast(`Found ${venues.length} venues near optimal meeting location`, 'success');
  } catch (error) {
    console.error('Error finding venues:', error);
    showError('Failed to find meeting venues. Please try again.');
    toggleLoadingState(false);
  }
}

/**
 * Get participant locations from the participant manager
 * @returns {Array} Array of participant location objects
 */
function getParticipantLocations() {
  // This would integrate with the participant-manager.js module
  // For now, we'll return a placeholder implementation
  if (typeof getParticipants === 'function') {
    return getParticipants().map(p => p.location);
  }
  
  // Fallback to getting locations from the UI if participant manager isn't available
  const participantInputs = document.querySelectorAll('.participant-input');
  return Array.from(participantInputs)
    .map(input => input.value.trim())
    .filter(location => location !== '');
}

/**
 * Get meeting preferences from the UI
 * @returns {Object} Meeting preferences object
 */
function getMeetingPreferences() {
  const searchRadius = parseFloat(document.getElementById('search-radius')?.value || 5);
  const minRating = parseFloat(document.getElementById('min-rating')?.value || 0);
  
  // Get selected amenities
  const amenities = [];
  document.querySelectorAll('input[type="checkbox"][id^="amenity-"]:checked').forEach(checkbox => {
    amenities.push(checkbox.value);
  });
  
  // Get optimization preference
  const optimizeFor = document.getElementById('optimize-for')?.value || 'average';
  
  return {
    searchRadius,
    minRating,
    amenities,
    optimizeFor
  };
}

/**
 * Find the optimal meeting location based on participant locations
 * @param {Array} participantLocations - Array of participant location strings or coordinates
 * @param {Object} preferences - Meeting preferences
 * @returns {Promise<Object>} Promise resolving to the optimal location coordinates
 */
async function findOptimalLocation(participantLocations, preferences) {
  try {
    // First, geocode any location strings to coordinates
    const participantCoordinates = await geocodeParticipantLocations(participantLocations);
    
    // Calculate the optimal meeting point based on the optimization preference
    switch (preferences.optimizeFor) {
      case 'average':
        return findAverageLocation(participantCoordinates);
      case 'fairness':
        return findFairnessOptimizedLocation(participantCoordinates);
      case 'total':
        return findTotalTimeOptimizedLocation(participantCoordinates);
      default:
        return findAverageLocation(participantCoordinates);
    }
  } catch (error) {
    console.error('Error finding optimal location:', error);
    throw new Error('Failed to calculate optimal meeting location');
  }
}

/**
 * Geocode participant locations to coordinates
 * @param {Array} locations - Array of location strings or coordinates
 * @returns {Promise<Array>} Promise resolving to array of location coordinates
 */
async function geocodeParticipantLocations(locations) {
  // Process each location, either using its coordinates or geocoding the address
  const geocodedLocations = [];
  
  for (const location of locations) {
    // If location is already coordinates, use as is
    if (typeof location === 'object' && location.lat && location.lng) {
      geocodedLocations.push(location);
      continue;
    }
    
    // For string locations, use Nominatim geocoding service
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`);
      
      if (!response.ok) {
        throw new Error('Geocoding API request failed');
      }
      
      const data = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        geocodedLocations.push({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          originalLocation: location,
          name: result.display_name
        });
      } else {
        // If geocoding fails, use a fallback location and mark it
        console.warn(`Could not geocode location: ${location}`);
        // Use a fallback location (New York City)
        const baseCoords = { lat: 40.7128, lng: -74.0060 };
        geocodedLocations.push({
          lat: baseCoords.lat,
          lng: baseCoords.lng,
          originalLocation: location,
          geocodingFailed: true
        });
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      // Use a fallback location (New York City)
      const baseCoords = { lat: 40.7128, lng: -74.0060 };
      geocodedLocations.push({
        lat: baseCoords.lat,
        lng: baseCoords.lng,
        originalLocation: location,
        geocodingFailed: true
      });
    }
  }
  
  return geocodedLocations;
}

/**
 * Find the average location (centroid) of all participant coordinates
 * @param {Array} coordinates - Array of location coordinates
 * @returns {Object} The average location coordinates
 */
function findAverageLocation(coordinates) {
  if (!coordinates || coordinates.length === 0) {
    throw new Error('No valid coordinates provided');
  }
  
  const sum = coordinates.reduce((acc, coord) => {
    return {
      lat: acc.lat + coord.lat,
      lng: acc.lng + coord.lng
    };
  }, { lat: 0, lng: 0 });
  
  return {
    lat: sum.lat / coordinates.length,
    lng: sum.lng / coordinates.length
  };
}

/**
 * Find a location that minimizes the maximum travel time for any participant
 * @param {Array} coordinates - Array of location coordinates
 * @returns {Object} The fairness-optimized location coordinates
 */
function findFairnessOptimizedLocation(coordinates) {
  // This is a simplified implementation
  // In a real application, this would use a more sophisticated algorithm
  // For now, we'll use the average location as an approximation
  return findAverageLocation(coordinates);
}

/**
 * Find a location that minimizes the total travel time for all participants
 * @param {Array} coordinates - Array of location coordinates
 * @returns {Object} The total-time-optimized location coordinates
 */
function findTotalTimeOptimizedLocation(coordinates) {
  // This is a simplified implementation
  // In a real application, this would use a more sophisticated algorithm
  // For now, we'll use the average location as an approximation
  return findAverageLocation(coordinates);
}

/**
 * Search for venues near a location
 * @param {Object} location - The center location coordinates
 * @param {Object} preferences - Meeting preferences
 * @returns {Promise<Array>} Promise resolving to array of venue objects
 */
async function searchVenuesNearLocation(location, preferences) {
  try {
    // In a real implementation, this would call a venue search API
    // For demonstration, we'll generate mock venues
    const mockVenues = generateMockVenues(location, preferences);
    
    // Filter venues based on preferences
    return filterVenuesByPreferences(mockVenues, preferences);
  } catch (error) {
    console.error('Error searching for venues:', error);
    throw new Error('Failed to search for venues near the optimal location');
  }
}

/**
 * Generate mock venues for demonstration
 * @param {Object} location - The center location coordinates
 * @param {Object} preferences - Meeting preferences
 * @returns {Array} Array of mock venue objects
 */
function generateMockVenues(location, preferences) {
  const venueCount = 5 + Math.floor(Math.random() * 5); // 5-9 venues
  const venues = [];
  
  const venueTypes = [
    'Conference Center',
    'Hotel Meeting Room',
    'Business Center',
    'Coworking Space',
    'Executive Suite'
  ];
  
  const amenitiesList = [
    'WiFi',
    'Projector',
    'Catering',
    'Whiteboard',
    'Video Conferencing',
    'Parking',
    'Coffee Service',
    'AV Equipment'
  ];
  
  for (let i = 0; i < venueCount; i++) {
    // Generate a location within the search radius
    const venueLocation = {
      lat: location.lat + (Math.random() - 0.5) * 0.02,
      lng: location.lng + (Math.random() - 0.5) * 0.02
    };
    
    // Calculate distance from optimal location
    const distance = calculateDistance(location, venueLocation);
    
    // Skip if outside search radius
    if (distance > preferences.searchRadius) {
      continue;
    }
    
    // Generate random amenities (3-6 amenities)
    const amenitiesCount = 3 + Math.floor(Math.random() * 4);
    const venueAmenities = [];
    for (let j = 0; j < amenitiesCount; j++) {
      const amenity = amenitiesList[Math.floor(Math.random() * amenitiesList.length)];
      if (!venueAmenities.includes(amenity)) {
        venueAmenities.push(amenity);
      }
    }
    
    // Ensure required amenities are included if specified
    if (preferences.amenities && preferences.amenities.length > 0) {
      preferences.amenities.forEach(requiredAmenity => {
        if (!venueAmenities.includes(requiredAmenity)) {
          venueAmenities.push(requiredAmenity);
        }
      });
    }
    
    // Generate a venue
    venues.push({
      id: `venue-${i + 1}`,
      name: `${venueTypes[i % venueTypes.length]} ${i + 1}`,
      location: venueLocation,
      distance: distance.toFixed(1),
      rating: (3 + Math.random() * 2).toFixed(1), // 3.0-5.0 rating
      price_level: 1 + Math.floor(Math.random() * 3), // 1-3 price level
      amenities: venueAmenities,
      capacity: 10 + Math.floor(Math.random() * 90), // 10-100 capacity
      description: `A professional ${venueTypes[i % venueTypes.length].toLowerCase()} with modern amenities.`,
      image: `https://source.unsplash.com/random/300x200?meeting,business,${i}`,
      contact: `+1 (555) ${100 + i}-${1000 + i}`,
      website: `https://example.com/venue-${i + 1}`
    });
  }
  
  return venues;
}

/**
 * Filter venues based on meeting preferences
 * @param {Array} venues - Array of venue objects
 * @param {Object} preferences - Meeting preferences
 * @returns {Array} Filtered array of venue objects
 */
function filterVenuesByPreferences(venues, preferences) {
  return venues.filter(venue => {
    // Filter by minimum rating
    if (preferences.minRating && venue.rating < preferences.minRating) {
      return false;
    }
    
    // Filter by required amenities
    if (preferences.amenities && preferences.amenities.length > 0) {
      const hasAllAmenities = preferences.amenities.every(amenity => 
        venue.amenities.includes(amenity)
      );
      if (!hasAllAmenities) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Rank venues based on the optimization preference
 * @param {Array} venues - Array of venue objects
 * @param {string} optimizationPreference - The optimization preference
 * @returns {Array} Ranked array of venue objects
 */
function rankVenuesByPreference(venues, optimizationPreference) {
  // Clone the venues array to avoid modifying the original
  const rankedVenues = [...venues];
  
  // Sort venues based on the optimization preference
  switch (optimizationPreference) {
    case 'average':
      // Sort by average travel time (approximated by distance from optimal location)
      rankedVenues.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      break;
    case 'fairness':
      // Sort by maximum travel time for any participant
      // This would require calculating travel times for each participant to each venue
      // For simplicity, we'll use distance as an approximation
      rankedVenues.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      break;
    case 'total':
      // Sort by total travel time for all participants
      // This would require calculating travel times for each participant to each venue
      // For simplicity, we'll use distance as an approximation
      rankedVenues.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      break;
    default:
      // Default to sorting by rating
      rankedVenues.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
  }
  
  return rankedVenues;
}

/**
 * Calculate distance between two coordinates in kilometers
 * @param {Object} coord1 - First coordinates with lat and lng properties
 * @param {Object} coord2 - Second coordinates with lat and lng properties
 * @returns {number} Distance in kilometers
 */
function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Render venue search results in the UI
 * @param {Array} venues - The venues to display
 */
function renderVenueResults(venues) {
  const venueResultsContainer = document.getElementById('venue-results');
  if (!venueResultsContainer) {
    console.error('Venue results container not found');
    return;
  }
  
  // Clear previous results
  venueResultsContainer.innerHTML = '';
  
  if (venues.length === 0) {
    venueResultsContainer.innerHTML = '<div class="alert alert-info">No venues found. Try adjusting your search criteria.</div>';
    return;
  }
  
  // Create venue cards
  venues.forEach(venue => {
    const venueCard = document.createElement('div');
    venueCard.className = 'venue-card';
    venueCard.dataset.venueId = venue.id;
    
    // Add selected class if this is the selected venue
    if (selectedVenue && selectedVenue.id === venue.id) {
      venueCard.classList.add('selected');
    }
    
    venueCard.innerHTML = `
      <div class="venue-card-header">
        <h3 class="venue-name">${venue.name}</h3>
        <div class="venue-meta">
          <div class="venue-rating" data-rating="${venue.rating}">
            <i class="fas fa-star"></i> ${venue.rating.toFixed(1)}
          </div>
          <div class="venue-price">${'$'.repeat(venue.price_level || 1)}</div>
        </div>
      </div>
      <div class="venue-card-body">
        <div class="venue-distance">
          <i class="fas fa-map-marker-alt"></i> ${venue.distance.toFixed(1)} km from optimal location
        </div>
        <div class="venue-amenities">
          ${venue.amenities.map(amenity => `
            <span class="venue-amenity">
              <i class="fas fa-check"></i> ${amenity}
            </span>
          `).join('')}
        </div>
      </div>
      <div class="venue-card-footer">
        <button class="venue-card-btn primary select-venue-btn">
          <i class="fas fa-check-circle"></i> Select Venue
        </button>
        <button class="venue-card-btn secondary view-details-btn">
          <i class="fas fa-info-circle"></i> View Details
        </button>
      </div>
    `;
    
    // Add event listeners
    const selectBtn = venueCard.querySelector('.select-venue-btn');
    if (selectBtn) {
      selectBtn.addEventListener('click', () => selectVenue(venue));
    }
    
    const detailsBtn = venueCard.querySelector('.view-details-btn');
    if (detailsBtn) {
      detailsBtn.addEventListener('click', () => viewVenueDetails(venue));
    }
    
    venueResultsContainer.appendChild(venueCard);
  });
}

/**
 * Create a venue card element
 * @param {Object} venue - Venue object
 * @returns {HTMLElement} Venue card element
 */
function createVenueCard(venue) {
  const card = document.createElement('div');
  card.className = 'venue-card';
  card.dataset.venueId = venue.id;
  
  // Create rating stars
  const ratingStars = createRatingStars(venue.rating);
  
  // Create price level indicators
  const priceLevel = '$'.repeat(venue.price_level);
  
  // Create amenities list
  const amenitiesList = venue.amenities.slice(0, 3).join(', ') + 
    (venue.amenities.length > 3 ? ` +${venue.amenities.length - 3} more` : '');
  
  card.innerHTML = `
    <div class="venue-card-header">
      <h6 class="venue-name">${venue.name}</h6>
      <div class="venue-meta">
        <span class="venue-rating">${ratingStars}</span>
        <span class="venue-price">${priceLevel}</span>
      </div>
    </div>
    <div class="venue-card-body">
      <div class="venue-distance">${venue.distance} km from optimal location</div>
      <div class="venue-amenities"><small>${amenitiesList}</small></div>
    </div>
    <div class="venue-card-footer">
      <button class="btn-view-details btn-sm" data-venue-id="${venue.id}">View Details</button>
      <button class="btn-select-venue btn-sm primary" data-venue-id="${venue.id}">Select</button>
    </div>
  `;
  
  // Add event listeners
  const viewDetailsBtn = card.querySelector('.btn-view-details');
  if (viewDetailsBtn) {
    viewDetailsBtn.addEventListener('click', () => showVenueDetails(venue));
  }
  
  const selectVenueBtn = card.querySelector('.btn-select-venue');
  if (selectVenueBtn) {
    selectVenueBtn.addEventListener('click', () => selectVenue(venue));
  }
  
  return card;
}

/**
 * Create rating stars HTML
 * @param {number} rating - Venue rating (0-5)
 * @returns {string} HTML string for rating stars
 */
function createRatingStars(rating) {
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
 * Show venue details in a modal or expanded view
 * @param {Object} venue - Venue object
 */
function showVenueDetails(venue) {
  // This would be implemented with a modal or expanded card view
  console.log('Showing details for venue:', venue);
  
  // For now, we'll just log the venue details
  // In a real implementation, this would show a modal with venue details
}

/**
 * Select a venue for the meeting
 * @param {Object} venue - Venue object
 */
function selectVenue(venue) {
  selectedVenue = venue;
  
  // Highlight the selected venue card
  document.querySelectorAll('.venue-card').forEach(card => {
    if (card.dataset.venueId === venue.id) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  
  // Highlight the selected venue marker on the map
  highlightVenueOnMap(venue);
  
  // Show the venue comparison container if not already visible
  const venueComparisonContainer = document.getElementById('venue-comparison-container');
  if (venueComparisonContainer) {
    venueComparisonContainer.style.display = 'block';
  }
  
  // Update the venue comparison with the selected venue
  updateVenueComparison(venue);
}

/**
 * Update venue markers on the map
 * @param {Array} venues - Array of venue objects
 */
function updateVenueMarkersOnMap(venues) {
  // This would be implemented with the map library being used (e.g., Leaflet)
  // For now, we'll just log that we're updating markers
  console.log('Updating venue markers on map:', venues);
  
  // In a real implementation, this would add markers to the map for each venue
}

/**
 * Highlight a venue on the map
 * @param {Object} venue - Venue object
 */
function highlightVenueOnMap(venue) {
  // This would be implemented with the map library being used (e.g., Leaflet)
  // For now, we'll just log that we're highlighting a venue
  console.log('Highlighting venue on map:', venue);
  
  // In a real implementation, this would highlight the marker for the selected venue
}

/**
 * Update the venue comparison section with the selected venue
 * @param {Object} venue - Venue object
 */
function updateVenueComparison(venue) {
  // This would integrate with the venue-comparison.js module
  // For now, we'll check if the function exists and call it
  if (typeof compareVenue === 'function') {
    compareVenue(venue);
  } else {
    console.log('Venue comparison module not loaded');
  }
}

/**
 * Toggle the loading state of the venue finder
 * @param {boolean} isLoading - Whether the venue finder is loading
 * @param {string} message - Loading message to display
 */
function toggleLoadingState(isLoading, message = 'Loading...') {
  const findVenuesBtn = document.getElementById('find-venues-btn');
  
  if (findVenuesBtn) {
    if (isLoading) {
      findVenuesBtn.disabled = true;
      findVenuesBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    } else {
      findVenuesBtn.disabled = false;
      findVenuesBtn.innerHTML = `<i class="fas fa-search map-button-icon"></i> Find Meeting Venues`;
    }
  }
}

/**
 * Show an error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  // This would be implemented with a toast or alert component
  console.error(message);
  
  // For now, we'll use an alert
  alert(message);
}

// Export functions for use in other modules
window.venueFinder = {
  initVenueFinder,
  findOptimalLocation,
  searchVenuesNearLocation,
  selectVenue,
  getSelectedVenue: () => selectedVenue
};