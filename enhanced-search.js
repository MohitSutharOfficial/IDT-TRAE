/**
 * Enhanced Search and Business Tourism Map Integration
 * Provides improved search functionality with autocomplete and map integration
 */

// Store for search history and recent locations
let searchHistory = [];
let recentLocations = [];

// Maximum number of items to store in history
const MAX_HISTORY_ITEMS = 10;

// Initialize the enhanced search functionality
document.addEventListener('DOMContentLoaded', function() {
    initEnhancedSearch();
    initMapLocationSelection();
});

/**
 * Initialize enhanced search with autocomplete
 */
function initEnhancedSearch() {
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-container');
    const searchAutocomplete = document.getElementById('search-autocomplete');
    const searchClear = document.getElementById('search-clear');
    
    if (!searchInput || !searchContainer || !searchAutocomplete) {
        console.error('Search elements not found');
        return;
    }
    
    // Load search history from local storage if available
    try {
        const savedHistory = localStorage.getItem('findMyMapSearchHistory');
        if (savedHistory) {
            searchHistory = JSON.parse(savedHistory);
        }
    } catch (e) {
        console.warn('Could not load search history from local storage', e);
    }
    
    // Clear search input
    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchAutocomplete.classList.remove('active');
        searchContainer.classList.remove('has-results');
        searchInput.focus();
    });
    
    // Handle input changes for autocomplete
    searchInput.addEventListener('input', function() {
        const query = searchInput.value.trim();
        
        if (query.length < 2) {
            // Show recent searches instead if available
            if (searchHistory.length > 0) {
                const recentSearches = searchHistory.map(item => ({
                    text: item.query,
                    type: 'recent',
                    data: item.result
                }));
                renderAutocompleteResults(recentSearches, searchAutocomplete, true);
                searchAutocomplete.classList.add('active');
                searchContainer.classList.add('has-results');
            } else {
                searchAutocomplete.classList.remove('active');
                searchContainer.classList.remove('has-results');
            }
            return;
        }
        
        // Get autocomplete suggestions
        getSearchSuggestions(query).then(suggestions => {
            if (suggestions.length > 0) {
                renderAutocompleteResults(suggestions, searchAutocomplete);
                searchAutocomplete.classList.add('active');
                searchContainer.classList.add('has-results');
            } else {
                searchAutocomplete.classList.remove('active');
                searchContainer.classList.remove('has-results');
            }
        });
    });
    
    // Show recent searches when input is focused with empty value
    searchInput.addEventListener('focus', function() {
        if (searchInput.value.trim() === '' && searchHistory.length > 0) {
            const recentSearches = searchHistory.map(item => ({
                text: item.query,
                type: 'recent',
                data: item.result
            }));
            renderAutocompleteResults(recentSearches, searchAutocomplete, true);
            searchAutocomplete.classList.add('active');
            searchContainer.classList.add('has-results');
        }
    });
    
    // Handle keyboard navigation in autocomplete
    searchInput.addEventListener('keydown', function(e) {
        if (!searchAutocomplete.classList.contains('active')) return;
        
        const items = searchAutocomplete.querySelectorAll('.autocomplete-item');
        let focusedItem = searchAutocomplete.querySelector('.autocomplete-item.focused');
        let focusedIndex = -1;
        
        if (focusedItem) {
            focusedIndex = Array.from(items).indexOf(focusedItem);
        }
        
        // Arrow down
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (focusedIndex < items.length - 1) {
                if (focusedItem) focusedItem.classList.remove('focused');
                items[focusedIndex + 1].classList.add('focused');
                items[focusedIndex + 1].scrollIntoView({ block: 'nearest' });
            }
        }
        
        // Arrow up
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (focusedIndex > 0) {
                if (focusedItem) focusedItem.classList.remove('focused');
                items[focusedIndex - 1].classList.add('focused');
                items[focusedIndex - 1].scrollIntoView({ block: 'nearest' });
            }
        }
        
        // Enter to select
        if (e.key === 'Enter') {
            if (focusedItem) {
                e.preventDefault();
                focusedItem.click();
            }
        }
        
        // Escape to close
        if (e.key === 'Escape') {
            searchAutocomplete.classList.remove('active');
            searchContainer.classList.remove('has-results');
        }
    });
    
    // Close autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchContainer.contains(e.target)) {
            searchAutocomplete.classList.remove('active');
            searchContainer.classList.remove('has-results');
        }
    });
}

/**
 * Get search suggestions based on query
 * @param {string} query - The search query
 * @returns {Promise} - A promise that resolves with search suggestions
 */
async function getSearchSuggestions(query) {
    try {
        // Use Nominatim API for geocoding suggestions
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch search suggestions');
        }
        
        const data = await response.json();
        
        // Transform the response into our suggestion format
        return data.map(item => ({
            text: item.display_name,
            type: item.type || 'place',
            data: {
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                osm_id: item.osm_id,
                place_id: item.place_id
            }
        }));
    } catch (error) {
        console.error('Error fetching search suggestions:', error);
        // Return empty array on error
        return [];
    }
}

/**
 * Perform search with the given query
 * @param {string} query - The search query
 * @param {Object} locationData - Optional location data if already available
 */
function performSearch(query, locationData = null) {
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    // Clear previous search results from the map
    clearSearchResults();
    
    // If we already have location data from autocomplete, use it directly
    if (locationData && locationData.lat && locationData.lon) {
        handleSearchResult({
            lat: locationData.lat,
            lon: locationData.lon,
            display_name: query
        });
        return;
    }
    
    // Otherwise, perform geocoding with error handling
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Geocoding request failed');
            }
            return response.json();
        })
        .then(data => {
            // Reset search icon
            if (searchIcon) {
                searchIcon.innerHTML = '<i class="fas fa-search"></i>';
            }
            
            if (data.length > 0) {
                handleSearchResult(data[0]);
                // Add to search history
                addToSearchHistory(query, data[0]);
            } else {
                // Show error message
                showToast('Location not found. Please try a different search term.', 'error');
            }
        })
        .catch(error => {
            console.error('Error performing search:', error);
            
            // Reset search icon
            if (searchIcon) {
                searchIcon.innerHTML = '<i class="fas fa-search"></i>';
            }
            
            // Show error message to user
            showToast('Search failed. Please check your connection and try again.', 'error');
        }

/**
 * Clear previous search results from the map
 */
function clearSearchResults() {
    // Find and remove any existing search result markers
    const existingMarkers = document.querySelectorAll('.search-result-marker');
    existingMarkers.forEach(marker => {
        if (marker._leaflet_id) {
            map.removeLayer(marker);
        }
    });
}

/**
 * Add search query and result to search history
 * @param {string} query - The search query
 * @param {Object} result - The search result data
 */
function addToSearchHistory(query, result) {
    // Create history item
    const historyItem = {
        query: query,
        result: result,
        timestamp: new Date().getTime()
    };
    
    // Add to beginning of array
    searchHistory.unshift(historyItem);
    
    // Limit history size
    if (searchHistory.length > MAX_HISTORY_ITEMS) {
        searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
    }
    
    // Save to local storage if available
    try {
        localStorage.setItem('findMyMapSearchHistory', JSON.stringify(searchHistory));
    } catch (e) {
        console.warn('Could not save search history to local storage', e);
    }
}
            
            // Show error message
            showToast('An error occurred while searching. Please try again.', 'error');
        });
}

/**
 * Render autocomplete results in the dropdown
 * @param {Array} suggestions - The search suggestions
 * @param {HTMLElement} container - The container to render results in
 * @param {boolean} isRecent - Whether these are recent searches
 */
function renderAutocompleteResults(suggestions, container, isRecent = false) {
    // Clear previous results
    container.innerHTML = '';
    
    // Add header if showing recent searches
    if (isRecent) {
        const header = document.createElement('div');
        header.className = 'autocomplete-header';
        header.innerHTML = '<i class="fas fa-history"></i> Recent Searches';
        container.appendChild(header);
    }
    
    if (suggestions.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'autocomplete-no-results';
        noResults.innerHTML = '<i class="fas fa-info-circle"></i> No results found';
        container.appendChild(noResults);
        return;
    }
    
    // Create result items
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        
        // Create icon based on suggestion type
        let icon = 'fa-map-marker-alt';
        if (suggestion.type === 'transport' || suggestion.type === 'station') icon = 'fa-subway';
        if (suggestion.type === 'lodging' || suggestion.type === 'hotel') icon = 'fa-hotel';
        if (suggestion.type === 'food' || suggestion.type === 'restaurant') icon = 'fa-utensils';
        if (suggestion.type === 'building' || suggestion.type === 'office') icon = 'fa-building';
        if (suggestion.type === 'amenity') icon = 'fa-store';
        if (suggestion.type === 'recent') icon = 'fa-history';
        
        // Format the display text to be more readable
        const displayText = formatDisplayName(suggestion.text);
        
        item.innerHTML = `
            <i class="fas ${icon}"></i>
            <div class="autocomplete-content">
                <span class="autocomplete-primary">${displayText.primary}</span>
                <span class="autocomplete-secondary">${displayText.secondary}</span>
            </div>
        `;
        
        // Add click handler
        item.addEventListener('click', function() {
            // Set input value to selected suggestion
            document.getElementById('search-input').value = suggestion.text;
            
            // Hide autocomplete
            container.classList.remove('active');
            document.getElementById('search-container').classList.remove('has-results');
            
            // Trigger search with this suggestion and coordinates
            performSearch(suggestion.text, suggestion.data);
            
            // Add to search history
            addToSearchHistory(suggestion.text, suggestion.data);
        });
        
        container.appendChild(item);
    });
    
    // Add clear history button if showing recent searches
    if (isRecent && suggestions.length > 0) {
        const clearButton = document.createElement('div');
        clearButton.className = 'autocomplete-footer';
        clearButton.innerHTML = '<button class="clear-history-btn"><i class="fas fa-trash-alt"></i> Clear History</button>';
        
        clearButton.querySelector('.clear-history-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            searchHistory = [];
            localStorage.removeItem('findMyMapSearchHistory');
            container.classList.remove('active');
            document.getElementById('search-container').classList.remove('has-results');
        });
        
        container.appendChild(clearButton);
    }
}

/**
 * Format the display name for better readability
 * @param {string} displayName - The full display name from the API
 * @returns {Object} - Object with primary and secondary parts of the name
 */
function formatDisplayName(displayName) {
    const parts = displayName.split(',');
    const primary = parts[0].trim();
    const secondary = parts.slice(1, 4).join(',').trim();
    
    return {
        primary: primary,
        secondary: secondary
    };
}

/**
 * Handle selection of a search result
 * @param {Object} result - The selected search result
 */
function selectSearchResult(result) {
    const searchInput = document.getElementById('search-input');
    const searchAutocomplete = document.getElementById('search-autocomplete');
    const searchContainer = document.getElementById('search-container');
    
    // Update input value
    searchInput.value = result.name;
    
    // Hide autocomplete
    searchAutocomplete.classList.remove('active');
    searchContainer.classList.remove('has-results');
    
    // Add to search history
    if (!searchHistory.some(item => item.id === result.id)) {
        searchHistory.unshift(result);
        searchHistory = searchHistory.slice(0, 10); // Keep only 10 items
    }
    
    // Update map with the selected location
    updateMapWithSearchResult(result);
    
    // Show toast notification
    showToast('Location found: ' + result.name, 'success');
}

/**
 * Update map with search result
 * @param {Object} result - The search result
 */
function updateMapWithSearchResult(result) {
    // Remove previous search marker if it exists
    if (window.searchMarker && map.hasLayer(window.searchMarker)) {
        map.removeLayer(window.searchMarker);
    }
    
    // Create a new marker for the search result
    window.searchMarker = L.marker([result.location.lat, result.location.lng], {
        icon: L.divIcon({
            className: 'search-result-marker',
            html: `<i class="fas fa-map-pin"></i>`,
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        })
    }).addTo(map);
    
    // Add popup with information
    window.searchMarker.bindPopup(`
        <div class="location-popup">
            <h5>${result.name}</h5>
            <p>${result.address}</p>
            <div class="popup-actions">
                <button class="popup-btn" onclick="setAsStartingPoint()"><i class="fas fa-play"></i> Set as Start</button>
                <button class="popup-btn" onclick="setAsDestination()"><i class="fas fa-flag-checkered"></i> Set as Destination</button>
                <button class="popup-btn" onclick="addAsParticipant()"><i class="fas fa-user-plus"></i> Add as Participant</button>
            </div>
        </div>
    `).openPopup();
    
    // Pan to the location
    map.setView([result.location.lat, result.location.lng], 15);
    
    // Store the result for later use
    window.currentSearchResult = result;
}

/**
 * Initialize map click functionality for location selection
 */
function initMapLocationSelection() {
    // Add map click event for selecting custom points
    if (window.map) {
        window.map.on('click', function(e) {
            // Check if we're in custom point selection mode
            if (window.selectingCustomPoint) {
                const latlng = e.latlng;
                
                // Create a custom point based on the clicked location
                const customPoint = {
                    id: 'custom-' + Date.now(),
                    name: 'Custom Location',
                    address: `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`,
                    type: 'custom',
                    location: { lat: latlng.lat, lng: latlng.lng }
                };
                
                // Handle the custom point based on selection mode
                if (window.selectingCustomPoint === 'pointA') {
                    setCustomPointA(customPoint);
                } else if (window.selectingCustomPoint === 'pointB') {
                    setCustomPointB(customPoint);
                } else if (window.selectingCustomPoint === 'participant') {
                    addCustomParticipant(customPoint);
                } else if (window.selectingCustomPoint === 'venue') {
                    selectCustomVenue(customPoint);
                }
                
                // Exit selection mode
                window.selectingCustomPoint = null;
                
                // Show toast notification
                showToast('Custom location selected', 'success');
            }
        });
    }
    
    // Set up event listeners for custom point selection buttons
    setupCustomPointSelectionButtons();
}

/**
 * Set up event listeners for custom point selection buttons
 */
function setupCustomPointSelectionButtons() {
    // Point A custom selection
    const pointASelect = document.getElementById('point-a-select');
    if (pointASelect) {
        pointASelect.addEventListener('change', function(e) {
            if (e.target.value === 'custom') {
                window.selectingCustomPoint = 'pointA';
                showToast('Click on the map to select starting point', 'info');
            } else if (e.target.value === 'search' && window.currentSearchResult) {
                setSearchResultAsPointA();
            }
        });
    }
    
    // Point B custom selection
    const pointBSelect = document.getElementById('point-b-select');
    if (pointBSelect) {
        pointBSelect.addEventListener('change', function(e) {
            if (e.target.value === 'custom') {
                window.selectingCustomPoint = 'pointB';
                showToast('Click on the map to select destination', 'info');
            } else if (e.target.value === 'search' && window.currentSearchResult) {
                setSearchResultAsPointB();
            }
        });
    }
    
    // Add participant button
    const addParticipantBtn = document.getElementById('add-participant-btn');
    if (addParticipantBtn) {
        addParticipantBtn.addEventListener('click', function() {
            // Check if we should add from map
            if (window.addParticipantFromMap) {
                window.selectingCustomPoint = 'participant';
                showToast('Click on the map to add participant location', 'info');
            }
        });
    }
}

/**
 * Set custom point A (starting point)
 * @param {Object} point - The custom point
 */
function setCustomPointA(point) {
    // This would integrate with the existing routing functionality
    if (typeof window.setStartingPoint === 'function') {
        window.setStartingPoint(point.location.lat, point.location.lng, 'custom');
    } else {
        console.log('Setting custom point A:', point);
    }
}

/**
 * Set custom point B (destination)
 * @param {Object} point - The custom point
 */
function setCustomPointB(point) {
    // This would integrate with the existing routing functionality
    if (typeof window.setDestination === 'function') {
        window.setDestination(point.location.lat, point.location.lng, 'custom');
    } else {
        console.log('Setting custom point B:', point);
    }
}

/**
 * Add custom participant location
 * @param {Object} point - The custom point
 */
function addCustomParticipant(point) {
    // This would integrate with the existing participant manager
    if (typeof window.addParticipant === 'function') {
        window.addParticipant(point.name, point.location);
    } else {
        // Fallback implementation
        const participantLocations = document.getElementById('participant-locations');
        if (participantLocations) {
            const inputs = participantLocations.querySelectorAll('.participant-input');
            if (inputs.length > 0) {
                // Find the first empty input
                for (let input of inputs) {
                    if (!input.value) {
                        input.value = `${point.name} (${point.location.lat.toFixed(4)}, ${point.location.lng.toFixed(4)})`;
                        break;
                    }
                }
            }
        }
    }
}

/**
 * Select custom venue location
 * @param {Object} point - The custom point
 */
function selectCustomVenue(point) {
    // This would integrate with the venue finder
    if (typeof window.selectVenue === 'function') {
        window.selectVenue(point);
    } else {
        console.log('Selected custom venue:', point);
    }
}

/**
 * Set search result as starting point
 */
function setAsStartingPoint() {
    if (window.currentSearchResult) {
        const pointASelect = document.getElementById('point-a-select');
        if (pointASelect) {
            pointASelect.value = 'search';
        }
        
        setCustomPointA(window.currentSearchResult);
        showToast('Set as starting point', 'success');
    }
}

/**
 * Set search result as destination
 */
function setAsDestination() {
    if (window.currentSearchResult) {
        const pointBSelect = document.getElementById('point-b-select');
        if (pointBSelect) {
            pointBSelect.value = 'search';
        }
        
        setCustomPointB(window.currentSearchResult);
        showToast('Set as destination', 'success');
    }
}

/**
 * Add search result as participant
 */
function addAsParticipant() {
    if (window.currentSearchResult) {
        addCustomParticipant(window.currentSearchResult);
        showToast('Added as participant', 'success');
    }
}

/**
 * Show toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, info, warning)
 */
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type} slide-in`;
    
    // Set icon based on type
    let icon = 'fas fa-info-circle';
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            break;
    }
    
    toast.innerHTML = `
        <i class="${icon} toast-icon"></i>
        <span>${message}</span>
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('slide-in');
        toast.classList.add('slide-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions available globally
window.setAsStartingPoint = setAsStartingPoint;
window.setAsDestination = setAsDestination;
window.addAsParticipant = addAsParticipant;