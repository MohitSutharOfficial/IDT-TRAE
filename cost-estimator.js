/**
 * Cost Estimator Component for Business Tourism Web Application
 * Provides functionality for estimating costs of venues and travel
 */

/**
 * Initialize the cost estimator component
 */
function initCostEstimator() {
  // Set up event listeners for cost estimation
  setupCostEstimatorEventListeners();
}

/**
 * Set up event listeners for cost estimation
 */
function setupCostEstimatorEventListeners() {
  // Event delegation for cost estimation actions
  document.addEventListener('click', (event) => {
    const target = event.target;
    
    // Handle estimate costs button clicks
    if (target.classList.contains('btn-estimate-costs') || 
        target.closest('.btn-estimate-costs')) {
      const venueId = target.dataset.venueId || target.closest('.btn-estimate-costs').dataset.venueId;
      if (venueId) {
        showCostEstimateModal(venueId);
      }
    }
  });
}

/**
 * Show the cost estimate modal for a venue
 * @param {string} venueId - ID of the venue to estimate costs for
 */
function showCostEstimateModal(venueId) {
  // Get the venue data
  const venue = getVenueById(venueId);
  if (!venue) {
    console.error(`Venue with ID '${venueId}' not found`);
    return;
  }
  
  // Get participant count
  const participantCount = getParticipantCount();
  
  // Create modal content
  const modalContent = createCostEstimateModalContent(venue, participantCount);
  
  // Show the modal
  showModal('Cost Estimate', modalContent);
}

/**
 * Get a venue by its ID
 * @param {string} venueId - ID of the venue to get
 * @returns {Object|null} Venue object or null if not found
 */
function getVenueById(venueId) {
  // This would integrate with the venue-finder.js module
  // For now, we'll check if the function exists and call it
  if (window.venueFinder && typeof window.venueFinder.getVenueById === 'function') {
    return window.venueFinder.getVenueById(venueId);
  }
  
  // Fallback to getting the venue from the UI
  const venueCard = document.querySelector(`.venue-card[data-venue-id="${venueId}"]`);
  if (!venueCard) {
    return null;
  }
  
  return {
    id: venueId,
    name: venueCard.querySelector('.venue-name')?.textContent || `Venue ${venueId}`,
    rating: parseFloat(venueCard.querySelector('.venue-rating')?.dataset.rating || '0'),
    price_level: (venueCard.querySelector('.venue-price')?.textContent || '').length,
    distance: parseFloat(venueCard.querySelector('.venue-distance')?.textContent || '0'),
    amenities: []
  };
}

/**
 * Get the number of participants
 * @returns {number} Number of participants
 */
function getParticipantCount() {
  // This would integrate with the participant-manager.js module
  // For now, we'll check if the function exists and call it
  if (typeof getParticipants === 'function') {
    return getParticipants().length;
  }
  
  // Fallback to counting participant inputs
  const participantInputs = document.querySelectorAll('.participant-input');
  return participantInputs.length;
}

/**
 * Create the content for the cost estimate modal
 * @param {Object} venue - Venue object
 * @param {number} participantCount - Number of participants
 * @returns {HTMLElement} Modal content element
 */
function createCostEstimateModalContent(venue, participantCount) {
  const container = document.createElement('div');
  container.className = 'cost-estimate-container';
  
  // Add meeting duration input
  const durationContainer = document.createElement('div');
  durationContainer.className = 'form-group mb-3';
  durationContainer.innerHTML = `
    <label for="meeting-duration" class="form-label">Meeting Duration (hours):</label>
    <input type="number" id="meeting-duration" class="form-control" value="2" min="1" max="8" step="0.5">
  `;
  container.appendChild(durationContainer);
  
  // Add cost estimate table
  const costTable = document.createElement('table');
  costTable.className = 'cost-estimate-table';
  costTable.innerHTML = `
    <thead>
      <tr>
        <th>Cost Item</th>
        <th>Estimate</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Venue Rental</td>
        <td id="venue-cost">$${calculateVenueCost(venue, 2).toFixed(2)}</td>
      </tr>
      <tr>
        <td>Catering (${participantCount} participants)</td>
        <td id="catering-cost">$${calculateCateringCost(venue, participantCount).toFixed(2)}</td>
      </tr>
      <tr>
        <td>Equipment Rental</td>
        <td id="equipment-cost">$${calculateEquipmentCost(venue).toFixed(2)}</td>
      </tr>
      <tr>
        <td>Estimated Travel Costs</td>
        <td id="travel-cost">$${calculateTravelCost(venue).toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td><strong>Total Estimated Cost</strong></td>
        <td id="total-cost"><strong>$${calculateTotalCost(venue, participantCount, 2).toFixed(2)}</strong></td>
      </tr>
    </tbody>
  `;
  container.appendChild(costTable);
  
  // Add notes
  const notes = document.createElement('div');
  notes.className = 'cost-notes mt-3';
  notes.innerHTML = `
    <p class="small text-muted">Note: These are estimated costs and may vary based on actual venue pricing and availability.</p>
    <p class="small text-muted">Travel costs are estimated based on average transportation costs for all participants.</p>
  `;
  container.appendChild(notes);
  
  // Add event listener to update costs when duration changes
  const durationInput = container.querySelector('#meeting-duration');
  if (durationInput) {
    durationInput.addEventListener('change', () => {
      const duration = parseFloat(durationInput.value) || 2;
      updateCostEstimates(container, venue, participantCount, duration);
    });
  }
  
  return container;
}

/**
 * Update the cost estimates in the modal
 * @param {HTMLElement} container - Modal content container
 * @param {Object} venue - Venue object
 * @param {number} participantCount - Number of participants
 * @param {number} duration - Meeting duration in hours
 */
function updateCostEstimates(container, venue, participantCount, duration) {
  const venueCost = calculateVenueCost(venue, duration);
  const cateringCost = calculateCateringCost(venue, participantCount);
  const equipmentCost = calculateEquipmentCost(venue);
  const travelCost = calculateTravelCost(venue);
  const totalCost = venueCost + cateringCost + equipmentCost + travelCost;
  
  container.querySelector('#venue-cost').textContent = `$${venueCost.toFixed(2)}`;
  container.querySelector('#catering-cost').textContent = `$${cateringCost.toFixed(2)}`;
  container.querySelector('#equipment-cost').textContent = `$${equipmentCost.toFixed(2)}`;
  container.querySelector('#travel-cost').textContent = `$${travelCost.toFixed(2)}`;
  container.querySelector('#total-cost').textContent = `$${totalCost.toFixed(2)}`;
}

/**
 * Calculate the venue rental cost
 * @param {Object} venue - Venue object
 * @param {number} duration - Meeting duration in hours
 * @returns {number} Venue rental cost
 */
function calculateVenueCost(venue, duration) {
  // Base hourly rate based on price level
  const baseHourlyRate = venue.price_level * 50; // $50, $100, or $150 per hour
  
  // Calculate total venue cost
  return baseHourlyRate * duration;
}

/**
 * Calculate the catering cost
 * @param {Object} venue - Venue object
 * @param {number} participantCount - Number of participants
 * @returns {number} Catering cost
 */
function calculateCateringCost(venue, participantCount) {
  // Per-participant cost based on price level
  const perParticipantCost = venue.price_level * 15; // $15, $30, or $45 per participant
  
  // Calculate total catering cost
  return perParticipantCost * participantCount;
}

/**
 * Calculate the equipment rental cost
 * @param {Object} venue - Venue object
 * @returns {number} Equipment rental cost
 */
function calculateEquipmentCost(venue) {
  // Base equipment cost
  let equipmentCost = 50; // Base cost for standard equipment
  
  // Add costs for special equipment if not included in venue amenities
  if (venue.amenities) {
    if (!venue.amenities.includes('Projector')) {
      equipmentCost += 25; // Additional cost for projector rental
    }
    if (!venue.amenities.includes('Video Conferencing')) {
      equipmentCost += 50; // Additional cost for video conferencing equipment
    }
    if (!venue.amenities.includes('AV Equipment')) {
      equipmentCost += 35; // Additional cost for audio-visual equipment
    }
  } else {
    // If amenities are unknown, assume all equipment needs to be rented
    equipmentCost += 110; // Total additional cost for all equipment
  }
  
  return equipmentCost;
}

/**
 * Calculate the estimated travel cost
 * @param {Object} venue - Venue object
 * @returns {number} Estimated travel cost
 */
function calculateTravelCost(venue) {
  // This would integrate with the venue-comparison.js module to get actual travel times
  // For now, we'll use a simplified calculation based on venue distance
  
  // Get participant count
  const participantCount = getParticipantCount();
  
  // Estimate average travel distance (in km) based on venue distance from optimal location
  const averageTravelDistance = parseFloat(venue.distance) || 5;
  
  // Estimate cost per km per participant
  const costPerKm = 0.5; // $0.50 per km
  
  // Calculate total travel cost (round trip)
  return averageTravelDistance * costPerKm * participantCount * 2;
}

/**
 * Calculate the total estimated cost
 * @param {Object} venue - Venue object
 * @param {number} participantCount - Number of participants
 * @param {number} duration - Meeting duration in hours
 * @returns {number} Total estimated cost
 */
function calculateTotalCost(venue, participantCount, duration) {
  const venueCost = calculateVenueCost(venue, duration);
  const cateringCost = calculateCateringCost(venue, participantCount);
  const equipmentCost = calculateEquipmentCost(venue);
  const travelCost = calculateTravelCost(venue);
  
  return venueCost + cateringCost + equipmentCost + travelCost;
}

/**
 * Show a modal with the given title and content
 * @param {string} title - Modal title
 * @param {HTMLElement|string} content - Modal content
 */
function showModal(title, content) {
  // Check if a modal container already exists
  let modalContainer = document.getElementById('cost-estimate-modal');
  
  // Create modal container if it doesn't exist
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'cost-estimate-modal';
    modalContainer.className = 'modal fade';
    modalContainer.tabIndex = -1;
    modalContainer.setAttribute('aria-hidden', 'true');
    
    modalContainer.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="save-estimate-btn">Save Estimate</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modalContainer);
  }
  
  // Set modal title
  const modalTitle = modalContainer.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.textContent = title;
  }
  
  // Set modal content
  const modalBody = modalContainer.querySelector('.modal-body');
  if (modalBody) {
    if (content instanceof HTMLElement) {
      modalBody.innerHTML = '';
      modalBody.appendChild(content);
    } else {
      modalBody.innerHTML = content;
    }
  }
  
  // Initialize the modal
  const modal = new bootstrap.Modal(modalContainer);
  modal.show();
  
  // Add event listener to save button
  const saveButton = modalContainer.querySelector('#save-estimate-btn');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      saveEstimate(modalContainer);
      modal.hide();
    });
  }
}

/**
 * Save the cost estimate
 * @param {HTMLElement} modalContainer - Modal container element
 */
function saveEstimate(modalContainer) {
  // In a real implementation, this would save the estimate to a database or local storage
  // For demonstration, we'll just log that we're saving the estimate
  console.log('Saving cost estimate...');
  
  // Get the estimate details from the modal
  const venueCost = modalContainer.querySelector('#venue-cost')?.textContent;
  const cateringCost = modalContainer.querySelector('#catering-cost')?.textContent;
  const equipmentCost = modalContainer.querySelector('#equipment-cost')?.textContent;
  const travelCost = modalContainer.querySelector('#travel-cost')?.textContent;
  const totalCost = modalContainer.querySelector('#total-cost')?.textContent;
  
  // Log the estimate details
  console.log('Venue Cost:', venueCost);
  console.log('Catering Cost:', cateringCost);
  console.log('Equipment Cost:', equipmentCost);
  console.log('Travel Cost:', travelCost);
  console.log('Total Cost:', totalCost);
  
  // Show a success message
  alert('Cost estimate saved successfully!');
}

// Export functions for use in other modules
window.costEstimator = {
  initCostEstimator,
  calculateTotalCost,
  showCostEstimateModal
};