/**
 * Participant Manager Component for Business Tourism Web Application
 * Provides functionality for managing meeting participants with visual cards and location management
 */

// Store for participants data
let participants = [];

/**
 * Initialize the participant manager
 * @param {string} containerId - The ID of the container element for participant UI
 */
function initParticipantManager(containerId = 'participant-locations') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Participant container with ID '${containerId}' not found`);
    return;
  }
  
  // Add the "Add Participant" button
  renderAddParticipantButton(container);
  
  // Set up event delegation for participant actions
  setupEventListeners(container);
  
  // Initialize with a default participant if none exist
  if (participants.length === 0) {
    addParticipant({ name: 'You', location: 'My Location', useCurrentLocation: true });
  }
  
  // Render initial participants
  renderParticipants();
}

/**
 * Set up event listeners for participant actions
 * @param {HTMLElement} container - The participant container element
 */
function setupEventListeners(container) {
  // Event delegation for participant container
  container.addEventListener('click', (event) => {
    const target = event.target;
    
    // Handle remove participant button
    if (target.classList.contains('btn-remove-participant') || 
        target.closest('.btn-remove-participant')) {
      const participantCard = target.closest('.participant-card');
      if (participantCard) {
        const participantId = participantCard.dataset.participantId;
        removeParticipant(participantId);
      }
    }
    
    // Handle edit participant button
    if (target.classList.contains('btn-edit-participant') || 
        target.closest('.btn-edit-participant')) {
      const participantCard = target.closest('.participant-card');
      if (participantCard) {
        const participantId = participantCard.dataset.participantId;
        editParticipant(participantId);
      }
    }
    
    // Handle add participant button
    if (target.classList.contains('add-participant-btn') || 
        target.closest('.add-participant-btn')) {
      showAddParticipantModal();
    }
  });
  
  // Listen for custom point selection events
  document.addEventListener('customPointSelected', (event) => {
    // If we're in participant location selection mode
    if (window.participantLocationSelectionActive && window.activeParticipantId) {
      updateParticipantLocation(window.activeParticipantId, {
        lat: event.detail.lat,
        lng: event.detail.lng,
        address: 'Custom Location'
      });
      
      // Exit selection mode
      window.participantLocationSelectionActive = false;
      window.activeParticipantId = null;
    }
  });
}

/**
 * Render the "Add Participant" button
 * @param {HTMLElement} container - The container to append the button to
 */
function renderAddParticipantButton(container) {
  const addButton = document.createElement('button');
  addButton.className = 'add-participant-btn';
  addButton.innerHTML = '<i class="fas fa-plus"></i> Add Participant';
  container.appendChild(addButton);
}

/**
 * Show modal for adding a new participant
 */
function showAddParticipantModal() {
  // Create modal HTML
  const modalHtml = `
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Add Participant</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="form-group mb-3">
          <label for="participant-name" class="form-label">Name:</label>
          <input type="text" id="participant-name" class="form-control" placeholder="Enter participant name">
        </div>
        <div class="form-group mb-3">
          <label for="participant-location-type" class="form-label">Location Type:</label>
          <select id="participant-location-type" class="form-select">
            <option value="address">Address</option>
            <option value="current">Current Location</option>
            <option value="custom">Custom Point on Map</option>
          </select>
        </div>
        <div id="address-input-container" class="form-group mb-3">
          <label for="participant-address" class="form-label">Address:</label>
          <input type="text" id="participant-address" class="form-control" placeholder="Enter address">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-participant-btn">Add Participant</button>
      </div>
    </div>
  `;
  
  // Create modal container if it doesn't exist
  let modalContainer = document.getElementById('participant-modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'participant-modal-container';
    modalContainer.className = 'modal fade';
    modalContainer.setAttribute('tabindex', '-1');
    modalContainer.setAttribute('aria-hidden', 'true');
    modalContainer.innerHTML = `<div class="modal-dialog">${modalHtml}</div>`;
    document.body.appendChild(modalContainer);
  } else {
    modalContainer.querySelector('.modal-dialog').innerHTML = modalHtml;
  }
  
  // Initialize the modal
  const modal = new bootstrap.Modal(modalContainer);
  modal.show();
  
  // Set up location type change handler
  const locationTypeSelect = document.getElementById('participant-location-type');
  const addressContainer = document.getElementById('address-input-container');
  
  locationTypeSelect.addEventListener('change', () => {
    if (locationTypeSelect.value === 'address') {
      addressContainer.style.display = 'block';
    } else {
      addressContainer.style.display = 'none';
    }
  });
  
  // Set up save button handler
  const saveButton = document.getElementById('save-participant-btn');
  saveButton.addEventListener('click', () => {
    const name = document.getElementById('participant-name').value.trim();
    const locationType = locationTypeSelect.value;
    let location = '';
    let useCurrentLocation = false;
    let useCustomLocation = false;
    
    if (locationType === 'address') {
      location = document.getElementById('participant-address').value.trim();
    } else if (locationType === 'current') {
      location = 'Current Location';
      useCurrentLocation = true;
    } else if (locationType === 'custom') {
      location = 'Custom Location';
      useCustomLocation = true;
    }
    
    if (name && location) {
      addParticipant({ 
        name, 
        location, 
        useCurrentLocation, 
        useCustomLocation 
      });
      modal.hide();
      
      // If custom location, activate map selection mode
      if (useCustomLocation) {
        activateLocationSelection(participants[participants.length - 1].id);
      }
    } else {
      // Show validation error
      alert('Please enter both name and location');
    }
  });
}

/**
 * Activate location selection mode on the map
 * @param {string} participantId - The ID of the participant to set location for
 */
function activateLocationSelection(participantId) {
  // Set global flags for map click handler
  window.participantLocationSelectionActive = true;
  window.activeParticipantId = participantId;
  
  // Show instruction toast
  showToast('Click on the map to set participant location');
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 */
function showToast(message) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast
  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <i class="fas fa-info-circle me-2 text-primary"></i>
        <strong class="me-auto">Information</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;
  
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  
  // Initialize and show the toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
  toast.show();
  
  // Remove toast from DOM after it's hidden
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

/**
 * Add a new participant
 * @param {Object} participantData - The participant data
 */
function addParticipant(participantData) {
  const id = 'participant-' + Date.now();
  const participant = {
    id,
    name: participantData.name,
    location: participantData.location,
    useCurrentLocation: participantData.useCurrentLocation || false,
    useCustomLocation: participantData.useCustomLocation || false,
    coordinates: participantData.coordinates || null,
    color: getRandomColor(),
    initials: getInitials(participantData.name)
  };
  
  participants.push(participant);
  renderParticipants();
  
  // If using current location, get coordinates
  if (participant.useCurrentLocation) {
    getUserLocationForParticipant(participant.id);
  }
  
  // Dispatch event for participant added
  document.dispatchEvent(new CustomEvent('participantAdded', { detail: { participant } }));
}

/**
 * Get user's current location for a participant
 * @param {string} participantId - The ID of the participant
 */
function getUserLocationForParticipant(participantId) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        updateParticipantLocation(participantId, coordinates);
      },
      (error) => {
        console.error('Error getting user location:', error);
        showToast('Could not get your location. Please enter it manually.');
      }
    );
  } else {
    showToast('Geolocation is not supported by this browser. Please enter location manually.');
  }
}

/**
 * Update a participant's location
 * @param {string} participantId - The ID of the participant
 * @param {Object} coordinates - The new coordinates with lat and lng
 */
function updateParticipantLocation(participantId, coordinates) {
  const participantIndex = participants.findIndex(p => p.id === participantId);
  if (participantIndex !== -1) {
    participants[participantIndex].coordinates = coordinates;
    
    // If we have an address, update the location text
    if (coordinates.address) {
      participants[participantIndex].location = coordinates.address;
    }
    
    renderParticipants();
    
    // Dispatch event for participant updated
    document.dispatchEvent(new CustomEvent('participantUpdated', { 
      detail: { participant: participants[participantIndex] } 
    }));
  }
}

/**
 * Remove a participant
 * @param {string} participantId - The ID of the participant to remove
 */
function removeParticipant(participantId) {
  const participantIndex = participants.findIndex(p => p.id === participantId);
  if (participantIndex !== -1) {
    const removedParticipant = participants[participantIndex];
    participants.splice(participantIndex, 1);
    renderParticipants();
    
    // Dispatch event for participant removed
    document.dispatchEvent(new CustomEvent('participantRemoved', { 
      detail: { participant: removedParticipant } 
    }));
  }
}

/**
 * Edit a participant
 * @param {string} participantId - The ID of the participant to edit
 */
function editParticipant(participantId) {
  const participant = participants.find(p => p.id === participantId);
  if (!participant) return;
  
  // Create modal HTML
  const modalHtml = `
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Edit Participant</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="form-group mb-3">
          <label for="edit-participant-name" class="form-label">Name:</label>
          <input type="text" id="edit-participant-name" class="form-control" value="${participant.name}">
        </div>
        <div class="form-group mb-3">
          <label for="edit-participant-location-type" class="form-label">Location Type:</label>
          <select id="edit-participant-location-type" class="form-select">
            <option value="address" ${!participant.useCurrentLocation && !participant.useCustomLocation ? 'selected' : ''}>Address</option>
            <option value="current" ${participant.useCurrentLocation ? 'selected' : ''}>Current Location</option>
            <option value="custom" ${participant.useCustomLocation ? 'selected' : ''}>Custom Point on Map</option>
          </select>
        </div>
        <div id="edit-address-input-container" class="form-group mb-3" ${participant.useCurrentLocation || participant.useCustomLocation ? 'style="display:none;"' : ''}>
          <label for="edit-participant-address" class="form-label">Address:</label>
          <input type="text" id="edit-participant-address" class="form-control" value="${!participant.useCurrentLocation && !participant.useCustomLocation ? participant.location : ''}">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="update-participant-btn">Update</button>
      </div>
    </div>
  `;
  
  // Create modal container if it doesn't exist
  let modalContainer = document.getElementById('participant-modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'participant-modal-container';
    modalContainer.className = 'modal fade';
    modalContainer.setAttribute('tabindex', '-1');
    modalContainer.setAttribute('aria-hidden', 'true');
    modalContainer.innerHTML = `<div class="modal-dialog">${modalHtml}</div>`;
    document.body.appendChild(modalContainer);
  } else {
    modalContainer.querySelector('.modal-dialog').innerHTML = modalHtml;
  }
  
  // Initialize the modal
  const modal = new bootstrap.Modal(modalContainer);
  modal.show();
  
  // Set up location type change handler
  const locationTypeSelect = document.getElementById('edit-participant-location-type');
  const addressContainer = document.getElementById('edit-address-input-container');
  
  locationTypeSelect.addEventListener('change', () => {
    if (locationTypeSelect.value === 'address') {
      addressContainer.style.display = 'block';
    } else {
      addressContainer.style.display = 'none';
    }
  });
  
  // Set up update button handler
  const updateButton = document.getElementById('update-participant-btn');
  updateButton.addEventListener('click', () => {
    const name = document.getElementById('edit-participant-name').value.trim();
    const locationType = locationTypeSelect.value;
    let location = '';
    let useCurrentLocation = false;
    let useCustomLocation = false;
    
    if (locationType === 'address') {
      location = document.getElementById('edit-participant-address').value.trim();
    } else if (locationType === 'current') {
      location = 'Current Location';
      useCurrentLocation = true;
    } else if (locationType === 'custom') {
      location = 'Custom Location';
      useCustomLocation = true;
    }
    
    if (name && location) {
      // Update participant
      const participantIndex = participants.findIndex(p => p.id === participantId);
      if (participantIndex !== -1) {
        participants[participantIndex].name = name;
        participants[participantIndex].location = location;
        participants[participantIndex].useCurrentLocation = useCurrentLocation;
        participants[participantIndex].useCustomLocation = useCustomLocation;
        participants[participantIndex].initials = getInitials(name);
        
        // Clear coordinates if location type changed
        if (locationType !== 'custom' && participants[participantIndex].useCustomLocation) {
          participants[participantIndex].coordinates = null;
        }
        
        renderParticipants();
        
        // If using current location, get coordinates
        if (useCurrentLocation) {
          getUserLocationForParticipant(participantId);
        }
        
        // If custom location, activate map selection mode
        if (useCustomLocation) {
          activateLocationSelection(participantId);
        }
        
        // Dispatch event for participant updated
        document.dispatchEvent(new CustomEvent('participantUpdated', { 
          detail: { participant: participants[participantIndex] } 
        }));
      }
      
      modal.hide();
    } else {
      // Show validation error
      alert('Please enter both name and location');
    }
  });
}

/**
 * Render all participants
 */
function renderParticipants() {
  const container = document.getElementById('participant-locations');
  if (!container) return;
  
  // Clear existing participant cards (but keep the add button)
  const addButton = container.querySelector('.add-participant-btn');
  container.innerHTML = '';
  
  // Render each participant
  participants.forEach(participant => {
    const participantCard = document.createElement('div');
    participantCard.className = 'participant-card';
    participantCard.dataset.participantId = participant.id;
    
    participantCard.innerHTML = `
      <div class="participant-avatar" style="background-color: ${participant.color}">
        ${participant.initials}
      </div>
      <div class="participant-info">
        <div class="participant-name">${participant.name}</div>
        <div class="participant-location">
          <i class="fas fa-map-marker-alt"></i> ${participant.location}
          ${participant.coordinates ? `(${participant.coordinates.lat.toFixed(6)}, ${participant.coordinates.lng.toFixed(6)})` : ''}
        </div>
      </div>
      <div class="participant-actions">
        <button class="btn btn-icon btn-outline btn-edit-participant" title="Edit Participant">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-icon btn-outline btn-remove-participant" title="Remove Participant">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
    
    container.appendChild(participantCard);
  });
  
  // Add the "Add Participant" button back
  if (addButton) {
    container.appendChild(addButton);
  } else {
    renderAddParticipantButton(container);
  }
}

/**
 * Get initials from a name
 * @param {string} name - The name to get initials from
 * @returns {string} - The initials (up to 2 characters)
 */
function getInitials(name) {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  } else {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}

/**
 * Get a random color for participant avatar
 * @returns {string} - A random color in hex format
 */
function getRandomColor() {
  const colors = [
    '#1a73e8', // Blue
    '#34a853', // Green
    '#fbbc04', // Yellow
    '#ea4335', // Red
    '#9c27b0', // Purple
    '#00bcd4', // Cyan
    '#ff9800', // Orange
    '#795548'  // Brown
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Get all participants
 * @returns {Array} - Array of participant objects
 */
function getAllParticipants() {
  return [...participants];
}

/**
 * Get participants with valid coordinates
 * @returns {Array} - Array of participant objects with coordinates
 */
function getParticipantsWithCoordinates() {
  return participants.filter(p => p.coordinates !== null);
}

// Export functions for use in other modules
window.participantManager = {
  init: initParticipantManager,
  add: addParticipant,
  remove: removeParticipant,
  edit: editParticipant,
  getAll: getAllParticipants,
  getWithCoordinates: getParticipantsWithCoordinates
};