/**
 * Venue Comparison Component for Business Tourism Web Application
 * Provides functionality for comparing meeting venues based on various criteria
 */

// Store for comparison data
let comparisonData = {
  venues: [],
  participants: [],
  travelTimes: {}
};

/**
 * Initialize the venue comparison component
 * @param {string} containerId - The ID of the container element for venue comparison UI
 */
function initVenueComparison(containerId = 'venue-comparison') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Venue comparison container with ID '${containerId}' not found`);
    return;
  }
  
  // Set up event listeners for comparison actions
  setupComparisonEventListeners();
  
  // Initialize the comparison UI
  renderComparisonUI(container);
}

/**
 * Set up event listeners for venue comparison actions
 */
function setupComparisonEventListeners() {
  // Event delegation for comparison container
  document.addEventListener('click', (event) => {
    const target = event.target;
    
    // Handle compare button clicks
    if (target.classList.contains('btn-compare-venues') || 
        target.closest('.btn-compare-venues')) {
      const selectedVenues = getSelectedVenues();
      if (selectedVenues.length >= 2) {
        compareVenues(selectedVenues);
      } else {
        showMessage('Please select at least two venues to compare', 'warning');
      }
    }
    
    // Handle clear comparison button clicks
    if (target.classList.contains('btn-clear-comparison') || 
        target.closest('.btn-clear-comparison')) {
      clearComparison();
    }
  });
}

/**
 * Render the initial comparison UI
 * @param {HTMLElement} container - The comparison container element
 */
function renderComparisonUI(container) {
  container.innerHTML = `
    <div class="comparison-header">
      <h6>Venue Comparison</h6>
      <button class="btn-clear-comparison btn-sm" style="display: none;">
        <i class="fas fa-times"></i> Clear
      </button>
    </div>
    <div class="comparison-body">
      <p class="text-center text-muted small">Select venues to compare them</p>
    </div>
    <div class="comparison-actions" style="display: none;">
      <button class="btn-book-venue btn-sm primary">
        <i class="fas fa-calendar-check"></i> Book Selected Venue
      </button>
    </div>
  `;
}

/**
 * Add a venue to the comparison
 * @param {Object} venue - Venue object to add to comparison
 */
function compareVenue(venue) {
  // Check if venue is already in comparison
  const existingIndex = comparisonData.venues.findIndex(v => v.id === venue.id);
  
  if (existingIndex >= 0) {
    // Update existing venue data
    comparisonData.venues[existingIndex] = venue;
  } else {
    // Add new venue to comparison
    comparisonData.venues.push(venue);
  }
  
  // Get participant data
  updateParticipantData();
  
  // Calculate travel times for all participants to this venue
  calculateTravelTimes(venue);
  
  // Update the comparison UI
  updateComparisonUI();
}

/**
 * Compare multiple venues
 * @param {Array} venues - Array of venue objects to compare
 */
function compareVenues(venues) {
  // Reset comparison data
  comparisonData.venues = [];
  comparisonData.travelTimes = {};
  
  // Add each venue to comparison
  venues.forEach(venue => {
    comparisonData.venues.push(venue);
    calculateTravelTimes(venue);
  });
  
  // Update the comparison UI
  updateComparisonUI();
}

/**
 * Update participant data from participant manager
 */
function updateParticipantData() {
  // This would integrate with the participant-manager.js module
  // For now, we'll check if the function exists and call it
  if (typeof getParticipants === 'function') {
    comparisonData.participants = getParticipants();
  } else {
    // Fallback to getting participant data from the UI
    const participantInputs = document.querySelectorAll('.participant-input');
    comparisonData.participants = Array.from(participantInputs)
      .map((input, index) => ({
        id: `participant-${index}`,
        name: `Participant ${index + 1}`,
        location: input.value.trim()
      }))
      .filter(p => p.location !== '');
  }
}

/**
 * Calculate travel times for all participants to a venue
 * @param {Object} venue - Venue object
 */
function calculateTravelTimes(venue) {
  // In a real implementation, this would use a routing API to calculate actual travel times
  // For demonstration, we'll simulate travel times based on distance
  
  if (!comparisonData.travelTimes[venue.id]) {
    comparisonData.travelTimes[venue.id] = {};
  }
  
  comparisonData.participants.forEach(participant => {
    // Simulate travel time calculation
    // In a real implementation, this would call a routing service
    
    // Generate a random travel time between 15 and 90 minutes
    // In a real implementation, this would be based on actual routing data
    const travelTimeMinutes = 15 + Math.floor(Math.random() * 75);
    
    comparisonData.travelTimes[venue.id][participant.id] = {
      participant: participant,
      travelTime: travelTimeMinutes,
      travelMode: 'driving' // Default travel mode
    };
  });
}

/**
 * Update the comparison UI with current comparison data
 */
function updateComparisonUI() {
  const comparisonContainer = document.getElementById('venue-comparison');
  const comparisonBody = comparisonContainer?.querySelector('.comparison-body');
  const comparisonActions = comparisonContainer?.querySelector('.comparison-actions');
  const clearButton = comparisonContainer?.querySelector('.btn-clear-comparison');
  
  if (!comparisonBody) {
    console.error('Comparison body element not found');
    return;
  }
  
  // Show/hide clear button and actions based on whether there are venues to compare
  if (clearButton) {
    clearButton.style.display = comparisonData.venues.length > 0 ? 'block' : 'none';
  }
  
  if (comparisonActions) {
    comparisonActions.style.display = comparisonData.venues.length > 0 ? 'block' : 'none';
  }
  
  // If no venues to compare, show default message
  if (comparisonData.venues.length === 0) {
    comparisonBody.innerHTML = `<p class="text-center text-muted small">Select venues to compare them</p>`;
    return;
  }
  
  // Create comparison table
  const comparisonTable = createComparisonTable();
  comparisonBody.innerHTML = '';
  comparisonBody.appendChild(comparisonTable);
}

/**
 * Create a comparison table for the selected venues
 * @returns {HTMLElement} Comparison table element
 */
function createComparisonTable() {
  const table = document.createElement('table');
  table.className = 'comparison-table';
  
  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Add criteria column header
  const criteriaHeader = document.createElement('th');
  criteriaHeader.textContent = 'Criteria';
  headerRow.appendChild(criteriaHeader);
  
  // Add venue column headers
  comparisonData.venues.forEach(venue => {
    const venueHeader = document.createElement('th');
    venueHeader.textContent = venue.name;
    headerRow.appendChild(venueHeader);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  // Add basic venue information rows
  addComparisonRow(tbody, 'Rating', venue => {
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'venue-rating';
    ratingDiv.innerHTML = createRatingStars(venue.rating);
    return ratingDiv;
  });
  
  addComparisonRow(tbody, 'Price', venue => {
    return '$'.repeat(venue.price_level);
  });
  
  addComparisonRow(tbody, 'Distance', venue => {
    return `${venue.distance} km`;
  });
  
  addComparisonRow(tbody, 'Capacity', venue => {
    return `${venue.capacity} people`;
  });
  
  // Add amenities row
  addComparisonRow(tbody, 'Amenities', venue => {
    const amenitiesList = document.createElement('ul');
    amenitiesList.className = 'amenities-list';
    
    venue.amenities.forEach(amenity => {
      const amenityItem = document.createElement('li');
      amenityItem.textContent = amenity;
      amenitiesList.appendChild(amenityItem);
    });
    
    return amenitiesList;
  });
  
  // Add travel time rows for each participant
  if (comparisonData.participants.length > 0) {
    // Add a header for the travel times section
    const travelTimesHeader = document.createElement('tr');
    const travelTimesHeaderCell = document.createElement('td');
    travelTimesHeaderCell.colSpan = comparisonData.venues.length + 1;
    travelTimesHeaderCell.className = 'section-header';
    travelTimesHeaderCell.textContent = 'Travel Times';
    travelTimesHeader.appendChild(travelTimesHeaderCell);
    tbody.appendChild(travelTimesHeader);
    
    // Add travel time row for each participant
    comparisonData.participants.forEach(participant => {
      addComparisonRow(tbody, participant.name || `Participant ${participant.id}`, venue => {
        const travelTimeData = comparisonData.travelTimes[venue.id]?.[participant.id];
        if (!travelTimeData) {
          return 'N/A';
        }
        
        return `${travelTimeData.travelTime} min`;
      });
    });
    
    // Add average travel time row
    addComparisonRow(tbody, 'Average Travel Time', venue => {
      const travelTimes = Object.values(comparisonData.travelTimes[venue.id] || {});
      if (travelTimes.length === 0) {
        return 'N/A';
      }
      
      const totalTime = travelTimes.reduce((sum, data) => sum + data.travelTime, 0);
      const averageTime = Math.round(totalTime / travelTimes.length);
      
      return `${averageTime} min`;
    });
    
    // Add maximum travel time row
    addComparisonRow(tbody, 'Max Travel Time', venue => {
      const travelTimes = Object.values(comparisonData.travelTimes[venue.id] || {});
      if (travelTimes.length === 0) {
        return 'N/A';
      }
      
      const maxTime = Math.max(...travelTimes.map(data => data.travelTime));
      
      return `${maxTime} min`;
    });
  }
  
  table.appendChild(tbody);
  return table;
}

/**
 * Add a row to the comparison table
 * @param {HTMLElement} tbody - Table body element
 * @param {string} criteriaName - Name of the comparison criteria
 * @param {Function} valueGetter - Function to get the value for each venue
 */
function addComparisonRow(tbody, criteriaName, valueGetter) {
  const row = document.createElement('tr');
  
  // Add criteria name cell
  const criteriaCell = document.createElement('td');
  criteriaCell.className = 'criteria-name';
  criteriaCell.textContent = criteriaName;
  row.appendChild(criteriaCell);
  
  // Add value cell for each venue
  comparisonData.venues.forEach(venue => {
    const valueCell = document.createElement('td');
    const value = valueGetter(venue);
    
    if (value instanceof HTMLElement) {
      valueCell.appendChild(value);
    } else {
      valueCell.textContent = value;
    }
    
    row.appendChild(valueCell);
  });
  
  tbody.appendChild(row);
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
 * Get selected venues from the venue finder
 * @returns {Array} Array of selected venue objects
 */
function getSelectedVenues() {
  // This would integrate with the venue-finder.js module
  // For now, we'll check if the function exists and call it
  if (window.venueFinder && typeof window.venueFinder.getSelectedVenue === 'function') {
    const selectedVenue = window.venueFinder.getSelectedVenue();
    return selectedVenue ? [selectedVenue] : [];
  }
  
  // Fallback to getting selected venues from the UI
  const selectedVenueCards = document.querySelectorAll('.venue-card.selected');
  return Array.from(selectedVenueCards).map(card => {
    const venueId = card.dataset.venueId;
    // This is a simplified approach; in a real implementation, we would get the venue data from a store
    return {
      id: venueId,
      name: card.querySelector('.venue-name')?.textContent || `Venue ${venueId}`,
      rating: parseFloat(card.querySelector('.venue-rating')?.dataset.rating || '0'),
      price_level: (card.querySelector('.venue-price')?.textContent || '').length,
      distance: parseFloat(card.querySelector('.venue-distance')?.textContent || '0'),
      amenities: []
    };
  });
}

/**
 * Clear the current comparison
 */
function clearComparison() {
  comparisonData.venues = [];
  comparisonData.travelTimes = {};
  
  // Update the comparison UI
  updateComparisonUI();
  
  // Deselect all venue cards
  document.querySelectorAll('.venue-card.selected').forEach(card => {
    card.classList.remove('selected');
  });
}

/**
 * Show a message to the user
 * @param {string} message - Message to display
 * @param {string} type - Message type (info, warning, error)
 */
function showMessage(message, type = 'info') {
  // This would be implemented with a toast or alert component
  console.log(`[${type}] ${message}`);
  
  // For now, we'll use an alert
  alert(message);
}

/**
 * Calculate cost estimates for a venue
 * @param {Object} venue - Venue object
 * @param {number} participantCount - Number of participants
 * @param {number} durationHours - Meeting duration in hours
 * @returns {Object} Cost estimate object
 */
function calculateCostEstimate(venue, participantCount, durationHours = 2) {
  // In a real implementation, this would use actual pricing data
  // For demonstration, we'll simulate cost estimates based on venue price level
  
  // Base hourly rate based on price level
  const baseHourlyRate = venue.price_level * 50; // $50, $100, or $150 per hour
  
  // Per-participant cost (e.g., for catering)
  const perParticipantCost = venue.price_level * 15; // $15, $30, or $45 per participant
  
  // Calculate total venue cost
  const venueCost = baseHourlyRate * durationHours;
  
  // Calculate total catering cost
  const cateringCost = perParticipantCost * participantCount;
  
  // Calculate estimated travel costs (simplified)
  const travelCosts = Object.values(comparisonData.travelTimes[venue.id] || {}).reduce((sum, data) => {
    // Estimate $0.50 per minute of travel time
    return sum + (data.travelTime * 0.5);
  }, 0);
  
  return {
    venueCost,
    cateringCost,
    travelCosts,
    totalCost: venueCost + cateringCost + travelCosts
  };
}

// Export functions for use in other modules
window.venueComparison = {
  initVenueComparison,
  compareVenue,
  compareVenues,
  clearComparison,
  calculateCostEstimate
};