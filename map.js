// Custom disaster icons
const disasterIcons = {
    Earthquake: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }),
    Flood: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }),
    Cyclone: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }),
    Fire: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }),
    Other: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })
};

// Initialize map centered on India
let map = L.map('map').setView([20.5937, 78.9629], 5);
let markers = [];

// Add OpenStreetMap tiles with a more muted style for better marker visibility
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: 'map-tiles' // For potential custom styling
}).addTo(map);

// Function to clear all markers
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Function to get appropriate icon based on disaster type
function getDisasterIcon(disasterType) {
    return disasterIcons[disasterType] || disasterIcons.Other;
}

// Function to fetch and display markers with animation
async function fetchAndDisplayMarkers() {
    try {
        const response = await fetch("http://localhost:8080/all-help-requests");
        if (!response.ok) {
            throw new Error("Failed to fetch help requests");
        }
        
        const data = await response.json();
        clearMarkers();
        
        const markerCluster = L.markerClusterGroup();
        
        data.forEach(request => {
            if (request.lat && request.lng) {
                const icon = getDisasterIcon(request.disaster_type);
                const marker = L.marker([request.lat, request.lng], {icon})
                    .bindPopup(`
                        <div class="map-popup">
                            <strong>${request.request_type} Needed</strong><br>
                            <em>${request.disaster_type}</em><br>
                            Location: ${request.location}<br>
                            <small>${new Date(request.created_at).toLocaleString()}</small>
                        </div>
                    `);
                SevereWeather: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                }),
                
                markerCluster.addLayer(marker);
                markers.push(marker);
            }
        });
        
        map.addLayer(markerCluster);
    } catch (error) {
        console.error("Error fetching help requests:", error);
    }
}

// Initial load
map.whenReady(() => {
    setTimeout(() => {
        fetchAndDisplayMarkers();
    }, 500);
});

// Refresh markers every 30 seconds
setInterval(fetchAndDisplayMarkers, 30000);

// Global function to center map on a specific location
window.viewOnMap = function(lat, lng) {
    if (map) {
        map.flyTo([lat, lng], 15);
        
        const marker = markers.find(m => 
            m.getLatLng().lat === lat && m.getLatLng().lng === lng
        );
        
        if (marker) {
            marker.openPopup();
        }
    }
};


// wheather section

// Add to your map.js
let weatherLayer = L.layerGroup();

function addWeatherToMap(map) {
    weatherLayer.addTo(map);
    
    // Add weather control button
    L.control({
        position: 'topright',
        html: '<button id="weather-toggle"><i class="fas fa-cloud-sun"></i> Weather</button>'
    }).addTo(map);
    
    document.getElementById('weather-toggle').addEventListener('click', toggleWeatherLayer);
}

async function toggleWeatherLayer() {
    if (map.hasLayer(weatherLayer)) {
        weatherLayer.clearLayers();
        return;
    }
    
    const bounds = map.getBounds();
    const center = bounds.getCenter();
    
    try {
        const response = await fetch(`http://localhost:8080/current-weather?lat=${center.lat}&lng=${center.lng}`);
        const weatherData = await response.json();
        
        // Add weather icon at center
        const weatherIcon = L.icon({
            iconUrl: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`,
            iconSize: [50, 50],
            iconAnchor: [25, 25]
        });
        
        L.marker([center.lat, center.lng], {icon: weatherIcon})
            .bindPopup(`
                <strong>Current Weather</strong><br>
                ${weatherData.weather[0].main} (${weatherData.weather[0].description})<br>
                Temp: ${weatherData.main.temp}°C<br>
                Humidity: ${weatherData.main.humidity}%<br>
                Wind: ${weatherData.wind.speed} m/s
            `)
            .addTo(weatherLayer);
            
        // Check for severe weather
        if (weatherData.weather[0].main.match(/rain|storm|snow|extreme/i)) {
            showWeatherAlert(weatherData);
        }
    } catch (error) {
        console.error("Error fetching weather:", error);
    }
}

function showWeatherAlert(weatherData) {
    const alertData = {
        disasterType: "Severe Weather",
        location: "Current Area",
        requestType: "Take Precautions",
        timestamp: new Date().toISOString(),
        coordinates: map.getCenter(),
        weatherInfo: weatherData
    };
    
    // Use your existing alert system
    if (typeof showAlert === 'function') {
        showAlert(alertData);
    }
    
    // Or broadcast via WebSocket
    if (typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'ALERT',
            data: alertData
        }));
    }
}