/**
 * Mobile-specific venue finder functionality
 * Enhances the venue finder experience on mobile devices
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add floating action button for venue finding on mobile
    if (window.innerWidth <= 768) {
        addFloatingActionButton();
    }
    
    // Listen for window resize events to add/remove the button
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            if (!document.querySelector('.floating-action-btn')) {
                addFloatingActionButton();
            }
        } else {
            const floatingBtn = document.querySelector('.floating-action-btn');
            if (floatingBtn) {
                floatingBtn.remove();
            }
        }
    });
});

/**
 * Add a floating action button for finding venues on mobile
 */
function addFloatingActionButton() {
    // Check if button already exists
    if (document.querySelector('.floating-action-btn')) {
        return;
    }
    
    // Create the floating action button
    const floatingBtn = document.createElement('button');
    floatingBtn.className = 'floating-action-btn';
    floatingBtn.innerHTML = '<i class="fas fa-building"></i>';
    floatingBtn.setAttribute('aria-label', 'Find meeting venues');
    floatingBtn.setAttribute('title', 'Find meeting venues');
    
    // Add click event listener
    floatingBtn.addEventListener('click', function() {
        // If search location exists, use it to find venues
        if (window.searchLocation) {
            if (typeof findVenuesNearLocation === 'function') {
                findVenuesNearLocation([window.searchLocation.lat, window.searchLocation.lng]);
            }
        } else if (window.userMarker) {
            // Otherwise use user's current location if available
            const userLatLng = window.userMarker.getLatLng();
            if (typeof findVenuesNearLocation === 'function') {
                findVenuesNearLocation([userLatLng.lat, userLatLng.lng]);
            }
        } else {
            // If no location is available, show a message
            showToast('Please search for a location first', 'warning');
        }
        
        // Show the bottom sheet
        const bottomSheet = document.getElementById('mobile-bottom-sheet');
        if (bottomSheet) {
            showMobileBottomSheet('business');
        }
    });
    
    // Add the button to the document
    document.body.appendChild(floatingBtn);
}

/**
 * Show the mobile bottom sheet with venue results
 * @param {string} contentType - The type of content to show
 */
function showMobileBottomSheet(contentType) {
    const bottomSheet = document.getElementById('mobile-bottom-sheet');
    if (!bottomSheet) return;
    
    // Make sure the bottom sheet is visible
    bottomSheet.style.transform = 'translateY(0)';
    
    // Set the height for peek mode
    const peekHeight = 200;
    bottomSheet.style.height = `${peekHeight}px`;
    bottomSheet.classList.remove('collapsed');
    bottomSheet.classList.add('peek');
    bottomSheet.classList.remove('expanded');
    
    // Update bottom sheet content based on type
    const bottomSheetBody = document.getElementById('bottom-sheet-body');
    if (!bottomSheetBody) return;
    
    if (contentType === 'business') {
        bottomSheetBody.innerHTML = `
            <div class="business-controls-container">
                <h5><i class="fas fa-building"></i> Find Meeting Venues</h5>
                <div id="mobile-venue-results">
                    <div class="loading-indicator">
                        <i class="fas fa-spinner fa-spin"></i> Loading venues nearby...
                    </div>
                </div>
            </div>
        `;
    }
}