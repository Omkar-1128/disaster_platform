document.addEventListener("DOMContentLoaded", function () {
    // Status message function
    function showStatus(message, isError = false) {
        const existing = document.querySelectorAll('.status-message');
        existing.forEach(el => el.remove());
        
        const status = document.createElement('div');
        status.className = `status-message ${isError ? 'error' : ''}`;
        status.textContent = message;
        document.body.appendChild(status);
        
        setTimeout(() => {
            status.remove();
        }, 3000);
    }

    // WebSocket connection
    const socket = new WebSocket(`ws://${window.location.host}`);
    
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'ALERT') {
            showAlert(message.data);
            playAlertSound(message.data.disasterType);
            updateStats(); // Refresh stats when new alert comes in
        }
    });
    
    function showAlert(alertData) {
        const container = document.getElementById('alert-container');
        const alertCard = document.createElement('div');
        
        // Determine alert type
        let alertClass = '';
        let typeClass = 'alert-type';
        let typeText = 'Alert';
        
        if (alertData.disasterType === 'Earthquake' || alertData.disasterType === 'Fire') {
            alertClass = 'emergency';
            typeClass = 'emergency-type';
            typeText = 'EMERGENCY';
        } else if (alertData.disasterType === 'Flood' || alertData.disasterType === 'Cyclone') {
            alertClass = 'warning';
            typeClass = 'warning-type';
            typeText = 'WARNING';
        }
        
        alertCard.className = `alert-card ${alertClass}`;
        alertCard.innerHTML = `
            <div class="alert-header">
                <h3 class="alert-title">${alertData.disasterType} Alert</h3>
                <span class="${typeClass}">${typeText}</span>
            </div>
            <p class="alert-location">📍 ${alertData.location}</p>
            <p>Assistance needed: ${alertData.requestType}</p>
            <div class="alert-actions">
                <button class="alert-button view-button" onclick="viewOnMap(${alertData.coordinates.lat}, ${alertData.coordinates.lng})">
                    <i class="fas fa-map-marker-alt"></i> View on Map
                </button>
                <button class="alert-button dismiss-button" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i> Dismiss
                </button>
            </div>
            <p class="alert-time">${new Date(alertData.timestamp).toLocaleTimeString()}</p>
        `;
        
        container.appendChild(alertCard);
        
        // Auto-dismiss after 2 minutes
        setTimeout(() => {
            alertCard.style.opacity = '0';
            setTimeout(() => alertCard.remove(), 300);
        }, 120000);
    }
    
    function playAlertSound(type) {
        try {
            const audio = new Audio();
            audio.src = type === 'Earthquake' || type === 'Fire' 
                ? '/sounds/emergency.mp3' 
                : '/sounds/notification.mp3';
            audio.play().catch(e => console.log("Audio play failed:", e));
        } catch (e) {
            console.log("Audio error:", e);
        }
    }
    
    function viewOnMap(lat, lng) {
        if (typeof map !== 'undefined') {
            map.flyTo([lat, lng], 15);
        }
    }

    // Auth check
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user_name");
    const role = localStorage.getItem("user_role");
    
    if (!token || !user || !role) {
        showStatus("Please login to access dashboard", true);
        setTimeout(() => window.location.href = "index.html", 1500);
        return;
    }

    // Set user info
    document.getElementById("user-name").textContent = user;
    
    // Set role badge
    const roleBadge = document.getElementById("user-role-badge");
    roleBadge.textContent = role;
    roleBadge.style.padding = "3px 8px";
    roleBadge.style.borderRadius = "12px";
    roleBadge.style.fontSize = "0.8rem";
    roleBadge.style.background = role === "Volunteer" ? "#27ae60" : "#e74c3c";
    roleBadge.style.color = "white";

    // Logout handler
    document.getElementById("logout-button").addEventListener("click", () => {
        localStorage.clear();
        showStatus("Logged out successfully");
        setTimeout(() => window.location.href = "index.html", 1000);
    });

    // Emergency call
    document.getElementById("call-for-help").addEventListener("click", () => {
        if (confirm("This will call local emergency services. Continue?")) {
            window.location.href = "tel:+91 8857065206";
        }
    });

    // Form submission
    const form = document.getElementById("disaster-report-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById("submit-btn");
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Reporting...';
        submitBtn.disabled = true;
        
        try {
            const reportData = {
                disasterType: form.querySelector("#disaster-type").value,
                requestType: form.querySelector("#request-type").value,
                location: form.querySelector("#location").value,
                description: form.querySelector("#description").value
            };
            
            const response = await fetch("http://localhost:8080/report-disaster", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(reportData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || "Failed to submit report");
            }
            
            showStatus("Disaster report submitted successfully!");
            form.reset();
            updateRecentReports();
            updateStats();
        } catch (error) {
            console.error("Report error:", error);
            showStatus(error.message || "Error submitting report", true);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Fetch and display recent reports
    async function updateRecentReports() {
        try {
            const response = await fetch("http://localhost:8080/all-help-requests");
            const data = await response.json();
            
            const tableBody = document.getElementById("recent-reports-body");
            tableBody.innerHTML = "";
            
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5">No reports found</td></tr>';
            } else {
                data.slice(0, 5).forEach(request => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td><span class="disaster-indicator ${request.disaster_type.toLowerCase()}"></span>${request.disaster_type}</td>
                        <td>${request.request_type}</td>
                        <td>${request.location}</td>
                        <td>${request.user_role}</td>
                        <td>${new Date(request.created_at).toLocaleString()}</td>
                    `;
                    tableBody.appendChild(row);
                });
            }
        } catch (error) {
            console.error("Error loading recent reports:", error);
            document.getElementById("recent-reports-body").innerHTML = 
                '<tr><td colspan="5">Error loading reports</td></tr>';
        }
    }
    
    // Update stats cards
    async function updateStats() {
        try {
            const response = await fetch("http://localhost:8080/all-help-requests");
            const data = await response.json();
            
            // Active disasters
            document.getElementById("active-disasters").textContent = data.length;
            
            // Volunteers count
            const volunteers = data.filter(r => r.user_role === 'Volunteer').length;
            document.getElementById("total-volunteers").textContent = volunteers;
            
            // Food requests
            const foodRequests = data.filter(r => r.request_type === 'Food').length;
            document.getElementById("food-requests").textContent = foodRequests;
            
            // Medical requests
            const medicalRequests = data.filter(r => r.request_type === 'Medical').length;
            document.getElementById("medical-requests").textContent = medicalRequests;
            
        } catch (error) {
            console.error("Error updating stats:", error);
        }
    }

    // Initial load
    updateRecentReports();
    updateStats();
    
    // Refresh every 30 seconds
    setInterval(updateRecentReports, 30000);
    setInterval(updateStats, 30000);

    // Check for URL message
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    if (message) {
        showStatus(message);
        window.history.replaceState({}, "", window.location.pathname);
    }
});

// wheather section
// Add these functions to handle weather data
async function loadCurrentWeather(lat, lng) {
    try {
        const response = await fetch(`http://localhost:8080/current-weather?lat=${lat}&lng=${lng}`);
        const data = await response.json();
        
        document.getElementById('weather-icon').src = 
            `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        document.getElementById('weather-temp').textContent = 
            `${Math.round(data.main.temp)}°C`;
        document.getElementById('weather-condition').textContent = 
            `${data.weather[0].main} (${data.weather[0].description})`;
        document.getElementById('weather-location').textContent = 
            `${data.name}, ${data.sys?.country || ''}`;
            
        document.querySelector('.weather-loading').style.display = 'none';
        document.querySelector('.weather-main').style.display = 'flex';
    } catch (error) {
        console.error("Error loading current weather:", error);
        document.querySelector('.weather-loading').textContent = 
            'Weather data unavailable';
    }
}


// wheather reports section
// Update the weather functions in script2.js
async function loadCurrentWeather(lat, lng) {
    try {
        const response = await fetch(`http://localhost:8080/current-weather?lat=${lat}&lng=${lng}`);
        if (!response.ok) {
            throw new Error("Failed to fetch weather data");
        }
        
        const data = await response.json();
        
        document.getElementById('weather-icon').src = 
            data.weather[0].icon || 'https://openweathermap.org/img/wn/01d@2x.png';
        document.getElementById('weather-temp').textContent = 
            `${Math.round(data.main.temp)}°C`;
        document.getElementById('weather-condition').textContent = 
            `${data.weather[0].main}`;
        document.getElementById('weather-location').textContent = 
            `${data.name}, ${data.country || ''}`;
            
        document.querySelector('.weather-loading').style.display = 'none';
        document.querySelector('.weather-main').style.display = 'flex';
    } catch (error) {
        console.error("Error loading current weather:", error);
        document.querySelector('.weather-loading').textContent = 
            'Weather data unavailable';
    }
}

async function loadWeatherAlerts() {
    try {
        // Get map center or user location
        let lat = 20.5937; // Default to India center
        let lng = 78.9629;
        
        if (typeof map !== 'undefined') {
            const center = map.getCenter();
            lat = center.lat;
            lng = center.lng;
        }
        
        const response = await fetch(`http://localhost:8080/weather-alerts?lat=${lat}&lng=${lng}`);
        if (!response.ok) {
            throw new Error("Failed to fetch weather alerts");
        }
        
        const alerts = await response.json();
        const container = document.getElementById('weather-alerts');
        
        if (alerts.length === 0) {
            container.innerHTML = '<div class="no-alerts">No active weather alerts in your area.</div>';
            return;
        }
        
        container.innerHTML = alerts.map(alert => `
            <div class="weather-alert ${alert.severity === 'severe' ? 'severe' : ''}">
                <h4>${alert.event}</h4>
                <p>${alert.description}</p>
                <div class="weather-meta">
                    <span>From: ${new Date(alert.start * 1000).toLocaleString()}</span>
                    <span>To: ${new Date(alert.end * 1000).toLocaleString()}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error loading weather alerts:", error);
        document.getElementById('weather-alerts').innerHTML = 
            '<div class="weather-error">Failed to load weather alerts. Please try again later.</div>';
    }
}