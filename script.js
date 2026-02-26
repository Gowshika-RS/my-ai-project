// =====================
// 📊 BAR GRAPH TREND
// =====================
const ctx = document.getElementById('trendChart');
if (ctx) {
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Crime Reports',
                data: [12, 19, 8, 15, 22, 30],
                backgroundColor: '#38bdf8'
            }]
        }
    });
}

// =====================
// 🗺 MAP + HEATMAP
// =====================
const mapDiv = document.getElementById('map');

if (mapDiv) {
    const map = L.map('map').setView([13.0827, 80.2707], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    const locations = [
        {lat: 13.0827, lng: 80.2707, score: 75, name: "Chennai Central"},
        {lat: 13.0674, lng: 80.2376, score: 40, name: "T Nagar"},
        {lat: 13.0475, lng: 80.2091, score: 85, name: "Guindy"}
    ];

    locations.forEach(loc => {
        const marker = L.circleMarker([loc.lat, loc.lng], {
            radius: 10,
            color: loc.score > 70 ? 'red' : 'green'
        }).addTo(map);

        marker.bindPopup(`
            <b>${loc.name}</b><br>
            Safety Score: ${loc.score}/100
        `);
    });
}

// =====================
// 🎙 VOICE ASSISTANT
// =====================
function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.start();

    recognition.onresult = function(event) {
        const text = event.results[0][0].transcript;
        document.getElementById("voiceOutput").innerText = "You said: " + text;
    };
}