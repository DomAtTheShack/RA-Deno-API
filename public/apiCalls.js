// deno-lint-ignore no-explicit-any
function sendData(coords, label1, label2, zoom) {
    fetch('http://localhost:8000/api/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            coordinates: coords,
            label1Text: label1,
            label2Text: label2,
            zoomLevel: zoom // Include the zoom level in the request
        })
    })
        .then(function (response) {
            if (response.ok) {
                console.log("Data sent successfully!");
            }
            else {
                return response.text().then(function (errorText) {
                    console.error("Failed to send data. Status:", response.status, errorText);
                });
            }
        })["catch"](function (error) { return console.error("Error sending data:", error); });
}
// Function to fetch data from the server
function fetchData() {
    fetch('http://localhost:8000/api/get')
        .then(function (response) { return response.json(); })
        .then(function (data) {
            // deno-lint-ignore no-explicit-any
            window.updateMap(data.coordinates, data.label1Text, data.label2Text, data.zoomLevel);
        })["catch"](function (error) { return console.error("Error fetching data:", error); });
}
