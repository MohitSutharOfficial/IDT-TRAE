/**
 * Map Interface Component for Business Tourism Web Application
 * Provides enhanced map functionality with custom markers and smooth animations
 */

// Map state
let map = null;
let mapMarkers = [];
let activeInfoWindow = null;
let userLocationMarker = null;

// Custom map marker icons
const markerIcons = {
  user: {
    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    scaledSize: { width: 32, height: 32 }
  },
  venue: {
    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: { width: 32, height: 32 }
  },
  meeting: {
    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
    scaledSize: { width: 32, height: 32 }
  },
  poi: {
    url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
    scaledSize: { width: 32, height: 32 }
  }
};

/**
 * Initialize the map interface
 * @param {string} mapContainerId - The ID of the map container element
 * @param {Object} options - Map initialization options
 */
function initMapInterface(mapContainerId = 'map', options = {}) {
  const defaultOptions = {
    center: { lat: 40.7128, lng: -74.0060 }, // Default to New York
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: getMapStyles()
  };
  
  const mapOptions = { ...defaultOptions, ...options };
  const mapContainer = document.getElementById(mapContainerId);
  
  if (!mapContainer) {
    console.error(`Map container with ID '${mapContainerId}' not found`);
    return;
  }
  
  // Initialize the map
  map = new google.maps.Map(mapContainer, mapOptions);
  
  // Add custom controls
  addMapControls();
  
  // Add event listeners
  setupMapEventListeners();
  
  // Listen for theme changes
  document.addEventListener('themechange', (e) => {
    map.setOptions({ styles: getMapStyles(e.detail.theme) });
  });
  
  return map;
}

/**
 * Add custom controls to the map
 */
function addMapControls() {
  // Create custom zoom controls
  const zoomInControl = createMapControl('zoom-in', 'fa-plus', 'Zoom In');
  const zoomOutControl = createMapControl('zoom-out', 'fa-minus', 'Zoom Out');
  
  // Create layer toggle control
  const layerToggleControl = createMapControl('layer-toggle', 'fa-layer-group', 'Toggle Layers');
  
  // Create sidebar toggle control
  const sidebarToggleControl = createMapControl('sidebar-toggle', 'fa-bars', 'Toggle Sidebar');
  
  // Add controls to the map
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push(zoomInControl);
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push(zoomOutControl);
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push(layerToggleControl);
  map.controls[google.maps.ControlPosition.LEFT_TOP].push(sidebarToggleControl);
  
  // Add event listeners to controls
  zoomInControl.addEventListener('click', () => {
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom + 1);
  });
  
  zoomOutControl.addEventListener('click', () => {
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom - 1);
  });
  
  layerToggleControl.addEventListener('click', () => {
    // Toggle map layers (implementation depends on requirements)
    const mapType = map.getMapTypeId() === google.maps.MapTypeId.ROADMAP ? 
      google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP;
    map.setMapTypeId(mapType);
  });
  
  sidebarToggleControl.addEventListener('click', toggleSidebar);
}

/**
 * Create a custom map control
 * @param {string} id - The control ID
 * @param {string} iconClass - The Font Awesome icon class
 * @param {string} title - The control title/tooltip
 * @returns {HTMLElement} - The control element
 */
function createMapControl(id, iconClass, title) {
  const control = document.createElement('div');
  control.id = id;
  control.className = 'map-control-btn';
  control.title = title;
  control.innerHTML = `<i class="fas ${iconClass}"></i>`;
  return control;
}

/**
 * Toggle the sidebar visibility
 */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mapContainer = document.getElementById('map-container');
  
  if (sidebar && mapContainer) {
    sidebar.classList.toggle('sidebar-collapsed');
    mapContainer.classList.toggle('map-container-expanded');
    
    // Trigger resize event to ensure map renders correctly
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }
}

/**
 * Set up map event listeners
 */
function setupMapEventListeners() {
  // Add click listener for placing custom markers
  map.addListener('click', (event) => {
    // Check if we're in custom point selection mode
    if (window.customPointSelectionActive) {
      placeCustomMarker(event.latLng);
    }
  });
  
  // Add idle listener for smooth transitions
  map.addListener('idle', () => {
    // Map has finished moving/zooming
    // Could trigger data loading or other actions here
  });
}

/**
 * Add a marker to the map
 * @param {Object} options - Marker options
 * @returns {Object} - The created marker
 */
function addMarker(options) {
  const defaultOptions = {
    position: map.getCenter(),
    map: map,
    title: 'Marker',
    type: 'venue', // Default marker type
    animation: google.maps.Animation.DROP,
    optimized: true
  };
  
  const markerOptions = { ...defaultOptions, ...options };
  
  // Apply custom icon based on marker type
  if (markerIcons[markerOptions.type]) {
    markerOptions.icon = markerIcons[markerOptions.type];
  }
  
  // Create the marker
  const marker = new google.maps.Marker(markerOptions);
  
  // Add to markers array for tracking
  mapMarkers.push(marker);
  
  return marker;
}

/**
 * Add an info window to a marker
 * @param {Object} marker - The marker to attach the info window to
 * @param {string|HTMLElement} content - The info window content
 * @param {Object} options - Info window options
 */
function addInfoWindow(marker, content, options = {}) {
  const infoWindow = new google.maps.InfoWindow({
    content: content,
    ...options
  });
  
  marker.addListener('click', () => {
    // Close any open info window
    if (activeInfoWindow) {
      activeInfoWindow.close();
    }
    
    // Open this info window
    infoWindow.open(map, marker);
    activeInfoWindow = infoWindow;
    
    // Animate marker when clicked
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => {
      marker.setAnimation(null);
    }, 750);
  });
  
  return infoWindow;
}

/**
 * Create a venue card for info window
 * @param {Object} venue - The venue data
 * @returns {string} - HTML content for the info window
 */
function createVenueInfoCard(venue) {
  // Create rating stars
  const stars = Array(5).fill('').map((_, i) => 
    `<i class="fas ${i < Math.floor(venue.rating) ? 'fa-star' : 'fa-star-o'}"></i>`
  ).join('');
  
  // Create amenities badges
  const amenities = venue.amenities.slice(0, 3).map(amenity => 
    `<span class="venue-card-amenity">${amenity}</span>`
  ).join('');
  
  // Create the card HTML
  return `
    <div class="venue-info-card">
      <div class="venue-info-header">
        <h3>${venue.name}</h3>
        <div class="venue-info-rating">${stars} ${venue.rating}</div>
      </div>
      <div class="venue-info-amenities">${amenities}</div>
      <div class="venue-info-description">${venue.description}</div>
      <div class="venue-info-actions">
        <button class="btn btn-sm btn-primary view-details-btn" data-venue-id="${venue.id}">
          <i class="fas fa-info-circle"></i> Details
        </button>
        <button class="btn btn-sm btn-outline select-venue-btn" data-venue-id="${venue.id}">
          <i class="fas fa-check-circle"></i> Select
        </button>
      </div>
    </div>
  `;
}

/**
 * Clear all markers from the map
 * @param {string} type - Optional marker type to clear (clears all if not specified)
 */
function clearMarkers(type) {
  if (type) {
    // Clear only markers of specified type
    mapMarkers = mapMarkers.filter(marker => {
      if (marker.type === type) {
        marker.setMap(null);
        return false;
      }
      return true;
    });
  } else {
    // Clear all markers
    mapMarkers.forEach(marker => marker.setMap(null));
    mapMarkers = [];
  }
}

/**
 * Get user's current location and add a marker
 * @returns {Promise} - A promise that resolves with the user's location
 */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Add or update user location marker
          if (userLocationMarker) {
            userLocationMarker.setPosition(userLocation);
          } else {
            userLocationMarker = addMarker({
              position: userLocation,
              title: 'Your Location',
              type: 'user',
              animation: google.maps.Animation.DROP
            });
          }
          
          // Pan to user location with smooth animation
          map.panTo(userLocation);
          
          resolve(userLocation);
        },
        (error) => {
          console.error('Error getting user location:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      const error = new Error('Geolocation is not supported by this browser.');
      console.error(error);
      reject(error);
    }
  });
}

/**
 * Place a custom marker at the specified location
 * @param {Object} latLng - The location to place the marker
 */
function placeCustomMarker(latLng) {
  // Clear any existing custom markers
  clearMarkers('custom');
  
  // Add new custom marker
  const marker = addMarker({
    position: latLng,
    title: 'Custom Location',
    type: 'custom',
    draggable: true
  });
  
  // Set marker type for filtering
  marker.type = 'custom';
  
  // Trigger custom point selected event
  const customPointEvent = new CustomEvent('customPointSelected', {
    detail: { lat: latLng.lat(), lng: latLng.lng(), marker }
  });
  document.dispatchEvent(customPointEvent);
}

/**
 * Get map styles based on current theme
 * @param {string} theme - The current theme ('light' or 'dark')
 * @returns {Array} - Map style array for Google Maps
 */
function getMapStyles(theme) {
  // If theme not provided, try to detect from body class
  if (!theme) {
    theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  }
  
  // Return appropriate map styles based on theme
  if (theme === 'dark') {
    return [
      { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#263c3f' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6b9a76' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#38414e' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#212a37' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9ca5b3' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#746855' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1f2835' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#f3d19c' }]
      },
      {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2f3948' }]
      },
      {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#17263c' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#515c6d' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#17263c' }]
      }
    ];
  } else {
    // Light theme (default Google Maps style with slight modifications)
    return [
      {
        featureType: 'poi',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'on' }]
      },
      {
        featureType: 'transit',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'on' }]
      }
    ];
  }
}

/**
 * Calculate and display route between two points
 * @param {Object} origin - Origin location with lat and lng
 * @param {Object} destination - Destination location with lat and lng
 * @param {string} travelMode - Travel mode (DRIVING, WALKING, BICYCLING, TRANSIT)
 * @returns {Promise} - A promise that resolves with the route result
 */
function calculateRoute(origin, destination, travelMode = 'DRIVING') {
  return new Promise((resolve, reject) => {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#1a73e8',
        strokeWeight: 5,
        strokeOpacity: 0.7
      }
    });
    
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode[travelMode],
        provideRouteAlternatives: true
      },
      (result, status) => {
        if (status === 'OK') {
          // Display the route
          directionsRenderer.setDirections(result);
          
          // Add custom markers for origin and destination
          addMarker({
            position: origin,
            title: 'Origin',
            type: 'user'
          });
          
          addMarker({
            position: destination,
            title: 'Destination',
            type: 'venue'
          });
          
          // Fit map to route bounds with padding
          const bounds = new google.maps.LatLngBounds();
          result.routes[0].legs[0].steps.forEach(step => {
            bounds.extend(step.start_location);
            bounds.extend(step.end_location);
          });
          map.fitBounds(bounds, { padding: 50 });
          
          resolve(result);
        } else {
          console.error('Directions request failed due to ' + status);
          reject(new Error('Directions request failed due to ' + status));
        }
      }
    );
    
    // Store the renderer for later use (e.g., clearing the route)
    window.currentDirectionsRenderer = directionsRenderer;
  });
}

/**
 * Clear the current route from the map
 */
function clearRoute() {
  if (window.currentDirectionsRenderer) {
    window.currentDirectionsRenderer.setMap(null);
    window.currentDirectionsRenderer = null;
  }
}

/**
 * Animate the map to a new center with smooth transition
 * @param {Object} center - The new center with lat and lng
 * @param {number} zoom - Optional zoom level
 */
function animateMapTo(center, zoom) {
  if (!map) return;
  
  // If zoom is provided, animate both center and zoom
  if (zoom) {
    map.animateCamera({
      center: center,
      zoom: zoom,
      duration: 1000 // 1 second animation
    });
  } else {
    // Just animate to new center
    map.panTo(center);
  }
}

// Export functions for use in other modules
window.mapInterface = {
  init: initMapInterface,
  addMarker,
  addInfoWindow,
  clearMarkers,
  getUserLocation,
  calculateRoute,
  clearRoute,
  animateMapTo,
  createVenueInfoCard,
  toggleSidebar
};