document.addEventListener("DOMContentLoaded", function () {
    // Toggle between login and registration forms with animation
    const loginSection = document.getElementById("login");
    const registerSection = document.getElementById("register");
    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");

    showRegisterLink.addEventListener("click", function (e) {
        e.preventDefault();
        loginSection.style.animation = "fadeOut 0.3s forwards";
        setTimeout(() => {
            loginSection.style.display = "none";
            registerSection.style.display = "block";
            registerSection.style.animation = "fadeIn 0.3s forwards";
        }, 300);
    });

    showLoginLink.addEventListener("click", function (e) {
        e.preventDefault();
        registerSection.style.animation = "fadeOut 0.3s forwards";
        setTimeout(() => {
            registerSection.style.display = "none";
            loginSection.style.display = "block";
            loginSection.style.animation = "fadeIn 0.3s forwards";
        }, 300);
    });

    // WebSocket connection for real-time alerts
    const socket = new WebSocket(`ws://${window.location.host}`);
    
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'ALERT') {
            showAlert(message.data);
            playAlertSound(message.data.disasterType);
        }
    });
    
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

    // Handle Login with better loading state
    document.getElementById("login-form").addEventListener("submit", function (e) {
        e.preventDefault();

        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';
        submitBtn.disabled = true;

        fetch("http://localhost:8080/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Login failed");
            }
            return response.json();
        })
        .then(data => {
            showStatus("Login successful");
            localStorage.setItem("token", data.token);
            localStorage.setItem("user_role", data.user_role);
            localStorage.setItem("user_name", data.username);
            setTimeout(() => window.location.href = "dashboard.html", 1000);
        })
        .catch(error => {
            console.error("Error logging in:", error);
            showStatus(error.message || "Invalid email or password", true);
        })
        .finally(() => {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        });
    });

    // Handle Registration with loading state
    document.getElementById("register-form").addEventListener("submit", function (e) {
        e.preventDefault();

        const username = document.getElementById("register-username").value;
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        const user_role = document.getElementById("register-role").value;

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="spinner"></span> Registering...';
        submitBtn.disabled = true;

        fetch("http://localhost:8080/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password, user_role })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message) });
            }
            return response.json();
        })
        .then(data => {
            showStatus(data.message);
            if (data.message === "User registered successfully!") {
                setTimeout(() => {
                    registerSection.style.animation = "fadeOut 0.3s forwards";
                    setTimeout(() => {
                        registerSection.style.display = "none";
                        loginSection.style.display = "block";
                        loginSection.style.animation = "fadeIn 0.3s forwards";
                        e.target.reset();
                    }, 300);
                }, 1000);
            }
        })
        .catch(error => {
            console.error("Error registering user:", error);
            showStatus(error.message || "Registration failed. Please try again.", true);
        })
        .finally(() => {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        });
    });

    // Alert functions
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
                <button class="alert-button view-button" onclick="viewOnMap(${alertData.coordinates.lat}, ${alertData.coordinates.lng})">View on Map</button>
                <button class="alert-button dismiss-button" onclick="this.parentElement.parentElement.remove()">Dismiss</button>
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
    
    // Make viewOnMap available globally
    window.viewOnMap = function(lat, lng) {
        if (typeof map !== 'undefined') {
            map.flyTo([lat, lng], 15);
        }
    };

    // Public data loading with loading states
    function fetchPublicHelpRequests() {
        const tableBody = document.getElementById("public-help-requests-body");
        tableBody.innerHTML = '<tr><td colspan="4"><div class="spinner"></div> Loading requests...</td></tr>';
        
        fetch("http://localhost:8080/all-help-requests")
            .then(response => response.json())
            .then(data => {
                tableBody.innerHTML = "";

                if (data.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="4">No help requests found</td></tr>`;
                } else {
                    data.slice(0, 10).forEach(request => {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${request.request_type}</td>
                            <td>${request.disaster_type}</td>
                            <td>${request.location}</td>
                            <td>${new Date(request.created_at).toLocaleString()}</td>
                        `;
                        tableBody.appendChild(row);
                    });
                }
            })
            .catch(error => {
                console.error("Error loading help requests:", error);
                tableBody.innerHTML = 
                    `<tr><td colspan="4">Error loading requests. Please refresh.</td></tr>`;
            });
    }

    function updateHelpCount() {
        const countElement = document.getElementById("help-count");
        countElement.innerHTML = '<span class="spinner small"></span>';
        
        fetch("http://localhost:8080/help-count")
            .then(response => response.json())
            .then(data => {
                countElement.textContent = data.count;
            })
            .catch(error => {
                console.error("Error updating help count:", error);
                countElement.textContent = "?";
            });
    }

    // Initial load
    fetchPublicHelpRequests();
    updateHelpCount();
    
    // Refresh every 30 seconds
    setInterval(fetchPublicHelpRequests, 30000);
    setInterval(updateHelpCount, 30000);

    // Check for URL parameters to show messages
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        showStatus(message);
        window.history.replaceState({}, "", window.location.pathname);
    }
});

// CSS animations for form toggling
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(10px); }
    }
`;
document.head.appendChild(style);