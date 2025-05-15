// Mobile-specific functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize mobile-specific features
    initMobileUI();
    initMobileBottomSheet();
});

/**
 * Initialize all mobile-specific features
 */
function initMobileFeatures() {
    // Add bottom sheet for directions
    createBottomSheet();
    
    // Add swipe gestures for map interaction
    initSwipeGestures();
    
    // Add quick action buttons
    createQuickActionButtons();
    
    // Add autocomplete for search
    enhanceSearchWithAutocomplete();
    
    // Add pull-to-refresh functionality
    initPullToRefresh();
    
    // Add haptic feedback for buttons
    initHapticFeedback();
}

/**
 * Create a bottom sheet component for directions and information
 */
function createBottomSheet() {
    // Create bottom sheet container
    const bottomSheet = document.createElement('div');
    bottomSheet.id = 'mobile-bottom-sheet';
    bottomSheet.className = 'mobile-bottom-sheet';
    
    // Create handle for dragging
    const handle = document.createElement('div');
    handle.className = 'bottom-sheet-handle';
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'bottom-sheet-content';
    content.innerHTML = `
        <div class="bottom-sheet-header">
            <h5>Route Information</h5>
            <button class="bottom-sheet-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="bottom-sheet-body" id="bottom-sheet-body">
            <div class="placeholder-content">
                <p>Search for a location or tap on the map to see directions</p>
            </div>
        </div>
    `;
    
    // Assemble bottom sheet
    bottomSheet.appendChild(handle);
    bottomSheet.appendChild(content);
    
    // Add to document
    document.body.appendChild(bottomSheet);
    
    // Initialize bottom sheet behavior
    initBottomSheetBehavior(bottomSheet, handle);
    
    // Add close button functionality
    const closeBtn = bottomSheet.querySelector('.bottom-sheet-close');
    closeBtn.addEventListener('click', function() {
        bottomSheet.classList.remove('expanded');
        bottomSheet.classList.remove('peek');
    });
}

/**
 * Initialize the draggable behavior of the bottom sheet
 * @param {HTMLElement} sheet - The bottom sheet element
 * @param {HTMLElement} handle - The drag handle element
 */
function initBottomSheetBehavior(sheet, handle) {
    let startY = 0;
    let startHeight = 0;
    let sheetHeight = sheet.offsetHeight;
    const minHeight = 60; // Height when minimized
    const peekHeight = 200; // Height when in peek state
    const maxHeight = window.innerHeight * 0.8; // Maximum height (80% of viewport)
    
    // Set initial state
    sheet.style.height = `${minHeight}px`;
    sheet.classList.add('collapsed');
    
    // Touch start event
    handle.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
        startHeight = sheet.offsetHeight;
        sheet.classList.add('dragging');
        e.preventDefault();
    });
    
    // Touch move event
    handle.addEventListener('touchmove', function(e) {
        const deltaY = startY - e.touches[0].clientY;
        const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
        sheet.style.height = `${newHeight}px`;
    });
    
    // Touch end event
    handle.addEventListener('touchend', function() {
        sheet.classList.remove('dragging');
        const currentHeight = sheet.offsetHeight;
        
        // Determine which state to snap to
        if (currentHeight < (minHeight + peekHeight) / 2) {
            // Collapse
            sheet.style.height = `${minHeight}px`;
            sheet.classList.add('collapsed');
            sheet.classList.remove('peek');
            sheet.classList.remove('expanded');
        } else if (currentHeight < (peekHeight + maxHeight) / 2) {
            // Peek
            sheet.style.height = `${peekHeight}px`;
            sheet.classList.remove('collapsed');
            sheet.classList.add('peek');
            sheet.classList.remove('expanded');
        } else {
            // Expand
            sheet.style.height = `${maxHeight}px`;
            sheet.classList.remove('collapsed');
            sheet.classList.remove('peek');
            sheet.classList.add('expanded');
        }
    });
    
    // Double tap to expand/collapse
    handle.addEventListener('dblclick', function() {
        if (sheet.classList.contains('expanded')) {
            // Collapse to peek
            sheet.style.height = `${peekHeight}px`;
            sheet.classList.remove('expanded');
            sheet.classList.add('peek');
        } else {
            // Expand
            sheet.style.height = `${maxHeight}px`;
            sheet.classList.remove('collapsed');
            sheet.classList.remove('peek');
            sheet.classList.add('expanded');
        }
    });
}

/**
 * Initialize swipe gestures for map interaction
 */
function initSwipeGestures() {
    const map = document.getElementById('map');
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    // Minimum distance for a swipe
    const minSwipeDistance = 50;
    
    map.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    map.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Determine if it's a horizontal or vertical swipe
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > minSwipeDistance) {
                const controlsSidebar = document.getElementById('controls-sidebar');
                if (controlsSidebar) {
                    if (deltaX > 0) {
                        // Right swipe - open sidebar if closed
                        if (!controlsSidebar.classList.contains('active')) {
                            controlsSidebar.classList.add('active');
                        }
                    } else {
                        // Left swipe - close sidebar if open
                        if (controlsSidebar.classList.contains('active')) {
                            controlsSidebar.classList.remove('active');
                        }
                    }
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > minSwipeDistance) {
                const bottomSheet = document.getElementById('mobile-bottom-sheet');
                if (bottomSheet) {
                    if (deltaY > 0) {
                        // Swipe up - expand bottom sheet
                        const maxHeight = window.innerHeight * 0.8;
                        bottomSheet.style.height = `${maxHeight}px`;
                        bottomSheet.classList.remove('collapsed');
                        bottomSheet.classList.remove('peek');
                        bottomSheet.classList.add('expanded');
                    } else {
                        // Swipe down - collapse bottom sheet
                        bottomSheet.style.height = '60px';
                        bottomSheet.classList.add('collapsed');
                        bottomSheet.classList.remove('peek');
                        bottomSheet.classList.remove('expanded');
                    }
                }
            }
        }
    }
}

/**
 * Create floating quick action buttons for common actions
 */
function createQuickActionButtons() {
    // Create container for quick action buttons
    const quickActions = document.createElement('div');
    quickActions.className = 'quick-action-buttons';
    
    // Define buttons to add
    const buttons = [
        { icon: 'fa-location-arrow', label: 'My Location', id: 'quick-locate-btn' },
        { icon: 'fa-layer-group', label: 'Map Layers', id: 'quick-layers-btn' },
        { icon: 'fa-directions', label: 'Directions', id: 'quick-directions-btn' }
    ];
    
    // Create buttons
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = 'quick-action-btn';
        button.id = btn.id;
        button.innerHTML = `<i class="fas ${btn.icon}"></i><span>${btn.label}</span>`;
        quickActions.appendChild(button);
    });
    
    // Add to document
    document.body.appendChild(quickActions);
    
    // Add event listeners
    document.getElementById('quick-locate-btn').addEventListener('click', function() {
        locateUser();
    });
    
    document.getElementById('quick-layers-btn').addEventListener('click', function() {
        // Toggle map layers panel
        const layersControl = document.querySelector('.map-layers-control');
        if (layersControl) {
            layersControl.classList.toggle('visible');
        }
    });
    
    document.getElementById('quick-directions-btn').addEventListener('click', function() {
        // Show directions panel
        const bottomSheet = document.getElementById('mobile-bottom-sheet');
        if (bottomSheet) {
            const peekHeight = 200;
            bottomSheet.style.height = `${peekHeight}px`;
            bottomSheet.classList.remove('collapsed');
            bottomSheet.classList.add('peek');
            bottomSheet.classList.remove('expanded');
        }
    });
}

/**
 * Enhance search with autocomplete functionality
 */
function enhanceSearchWithAutocomplete() {
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    
    if (!searchInput) return;
    
    // Create autocomplete container
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'autocomplete-container';
    autocompleteContainer.style.display = 'none';
    searchInput.parentNode.appendChild(autocompleteContainer);
    
    // Add event listeners
    searchInput.addEventListener('input', debounce(function() {
        const query = searchInput.value.trim();
        if (query.length < 3) {
            autocompleteContainer.style.display = 'none';
            return;
        }
        
        // Fetch autocomplete suggestions
        fetchAutocompleteSuggestions(query, autocompleteContainer);
    }, 300));
    
    // Clear button functionality
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            autocompleteContainer.style.display = 'none';
        });
    }
    
    // Close autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !autocompleteContainer.contains(e.target)) {
            autocompleteContainer.style.display = 'none';
        }
    });
}

/**
 * Fetch autocomplete suggestions from Nominatim API
 * @param {string} query - The search query
 * @param {HTMLElement} container - The container to display results
 */
function fetchAutocompleteSuggestions(query, container) {
    // Use Nominatim API for geocoding suggestions
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`)
        .then(response => response.json())
        .then(data => {
            // Clear previous results
            container.innerHTML = '';
            
            if (data.length === 0) {
                container.style.display = 'none';
                return;
            }
            
            // Create result items
            data.forEach(result => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                
                // Format display name
                const displayName = result.display_name;
                
                item.innerHTML = `
                    <i class="fas fa-map-marker-alt autocomplete-icon"></i>
                    <div class="autocomplete-text">
                        <div class="autocomplete-main">${displayName.split(',')[0]}</div>
                        <div class="autocomplete-secondary">${displayName.split(',').slice(1, 3).join(',')}</div>
                    </div>
                `;
                
                // Add click event
                item.addEventListener('click', function() {
                    const searchInput = document.getElementById('search-input');
                    searchInput.value = displayName;
                    container.style.display = 'none';
                    
                    // Search for this location
                    searchLocation(result.lat, result.lon, displayName);
                });
                
                container.appendChild(item);
            });
            
            // Show container
            container.style.display = 'block';
        })
        .catch(error => {
            console.error('Error fetching autocomplete suggestions:', error);
            container.style.display = 'none';
        });
}

/**
 * Initialize pull-to-refresh functionality
 */
function initPullToRefresh() {
    const map = document.getElementById('map');
    let touchStartY = 0;
    let touchEndY = 0;
    let isPulling = false;
    let refreshIndicator = null;
    
    // Create refresh indicator
    function createRefreshIndicator() {
        refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'pull-to-refresh-indicator';
        refreshIndicator.innerHTML = '<i class="fas fa-sync-alt"></i>';
        refreshIndicator.style.display = 'none';
        document.body.appendChild(refreshIndicator);
        return refreshIndicator;
    }
    
    refreshIndicator = createRefreshIndicator();
    
    map.addEventListener('touchstart', function(e) {
        // Only trigger when at top of map
        if (window.scrollY === 0) {
            touchStartY = e.touches[0].clientY;
            isPulling = true;
        }
    });
    
    map.addEventListener('touchmove', function(e) {
        if (!isPulling) return;
        
        touchEndY = e.touches[0].clientY;
        const pullDistance = touchEndY - touchStartY;
        
        // Show refresh indicator if pulling down
        if (pullDistance > 0 && pullDistance < 100) {
            refreshIndicator.style.display = 'flex';
            refreshIndicator.style.transform = `translateY(${pullDistance - 50}px) rotate(${pullDistance * 3}deg)`;
        }
    });
    
    map.addEventListener('touchend', function() {
        if (!isPulling) return;
        
        const pullDistance = touchEndY - touchStartY;
        
        // If pulled enough, refresh the map
        if (pullDistance > 60) {
            refreshIndicator.classList.add('refreshing');
            refreshMap();
        } else {
            // Hide indicator if not pulled enough
            refreshIndicator.style.display = 'none';
        }
        
        isPulling = false;
    });
    
    function refreshMap() {
        // Simulate refreshing the map data
        setTimeout(function() {
            // Reset the indicator
            refreshIndicator.classList.remove('refreshing');
            refreshIndicator.style.display = 'none';
            
            // Show toast notification
            showToast('Map refreshed', 'success');
            
            // Refresh user location if available
            if (typeof locateUser === 'function') {
                locateUser();
            }
        }, 1000);
    }
}

/**
 * Fix mobile toggle functionality
 * This function ensures the mobile menu toggle works correctly
 */
function initMobileUI() {
    // Ensure mobile toggle and sidebar work reliably
    fixMobileToggle();
    // Add any additional mobile UI initializations here
}

/**
 * Initialize haptic feedback for buttons
 */
function initHapticFeedback() {
    // Add haptic feedback to all buttons
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            // Check if vibration API is supported
            if ('vibrate' in navigator) {
                navigator.vibrate(20); // Short vibration
            }
        });
    });
}

/**
 * Show a toast notification
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
    let icon = 'info-circle';
    switch (type) {
        case 'success': icon = 'check-circle'; break;
        case 'error': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
    }
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-${icon}"></i></div>
        <div class="toast-message">${message}</div>
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

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}