// Initialize the map and set the view to IITGN's coordinates
const map = L.map("map", {
  center: [23.21141,72.68806],
  zoom: 17,
  zoomControl: false, // Disable the default zoom control
});

// Add OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 25,
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Add zoom control to the right
L.control.zoom({ position: "topright" }).addTo(map);

// Placeholder for the buildings layer
let buildingsLayer;

// Define a function to assign colors based on the category property
const getColorByCategory = (Category) => {
  const colors = {
    "Academic Buildings": "#E57373", // Soft Red
    "Hostels": "#64B5F6", // Soft Blue
    "Faculty Housing": "#81C784", // Soft Green
    "Sports": "#FFB74D", // Soft Orange
    "Dinings and Food": "#BA68C8", // Soft Purple
    "Utilities": "#90A4AE", // Cool Gray
    "Default": "#CFD8DC" // Light Gray-Blue
  };
  return colors[Category] || colors["Default"];
};

// Load the GeoJSON file for the buildings
fetch("map_all.geojson")
  .then((response) => response.json())
  .then((geojson) => {
    // Create a GeoJSON layer
    buildingsLayer = L.geoJSON(geojson, {
      style: (feature) => {
        const { Category } = feature.properties;
        return {
          color: getColorByCategory(Category), // Polygon border color
          fillColor: getColorByCategory(Category), // Fill color
          fillOpacity: 0.5, // Transparency
        };
      },
      onEachFeature: (feature, layer) => {
        const { title, info, center, directions, image } = feature.properties;
        if (center) {
          const [lat, lng] = center;

          const popupContent = `
            <div class="popup-container">
              <h3>${title}</h3>
              ${image ? `<img src="${image}" alt="${title}" class="popup-image" />` : ""}
              <p><strong>Info:</strong> ${info || "No additional information"}</p>
              <p><strong>Directions:</strong> ${directions || "No directions available"}</p>
              <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=25/${lat}/${lng}" target="_blank" class="btn">Location Link</a>
            </div>
          `;
          layer.bindPopup(popupContent);

          // Store reference to the layer for search functionality
          feature.properties._layer = layer;
        }
      },
    }).addTo(map);
  })
  .catch((err) => {
    console.error("Error loading GeoJSON:", err);
  });

// Update the map based on selected categories
const updateLayers = () => {
  const categories = {
    "Academic Buildings": document.getElementById("academic").checked,
    "Hostels": document.getElementById("hostels").checked,
    "Faculty Housing": document.getElementById("faculty-housing").checked,
    "Sports": document.getElementById("sports").checked,
    "Dinings and Food": document.getElementById("dining").checked,
    "Utilities": document.getElementById("utilities").checked,
  };

  buildingsLayer.eachLayer((layer) => {
    const Category = layer.feature.properties.Category;
    if (categories[Category]) {
      layer.setStyle({ opacity: 1, fillOpacity: 0.5 });
    } else {
      layer.setStyle({ opacity: 0, fillOpacity: 0 });
    }
  });
};

// Attach event listeners to checkboxes
["academic", "hostels", "faculty-housing", "sports", "dining", "utilities"].forEach((id) => {
  document.getElementById(id).addEventListener("change", updateLayers);
});

let searchTimeout;
const searchResultsContainer = document.getElementById("search-results");

document.getElementById("search-bar").addEventListener("input", (e) => {
  const query = e.target.value.trim().toLowerCase();

  // If query is too short, don't perform search
  if (query.length < 2) {
    searchResultsContainer.style.display = "none"; // Hide dropdown when query is too short
    return;
  }

  // Clear the previous timeout to avoid redundant searches
  clearTimeout(searchTimeout);

  // Set a new timeout to delay the search
  searchTimeout = setTimeout(() => {
    const results = [];

    buildingsLayer.eachLayer((layer) => {
      const { title, info, directions, id } = layer.feature.properties;
      const searchText = `${title} ${info} ${directions}`.toLowerCase();

      if (searchText.includes(query)) {
        results.push({ id: layer._leaflet_id, title, info, layer });
      }
    });

    if (results.length > 0) {
      searchResultsContainer.style.display = "block";
      searchResultsContainer.innerHTML = results
        .map((result) => `
          <div class="search-result-item" data-id="${result.id}">
            ${result.title}
          </div>
        `)
        .join("");

      // Attach event listeners to the results for selection
      document.querySelectorAll(".search-result-item").forEach((item) => {
        item.addEventListener("click", () => {
          const selectedId = item.getAttribute("data-id");
          const selectedLayer = buildingsLayer.getLayer(selectedId);

          // Highlight the layer and open its popup
          selectedLayer.openPopup();
          map.setView(selectedLayer.getLatLng(), 18);

          searchResultsContainer.style.display = "none"; // Hide dropdown
        });
      });
    } else {
      searchResultsContainer.style.display = "block";
      searchResultsContainer.innerHTML = "<div class='no-results'>No results found</div>";
    }
  }, 300); // Delay of 300ms before performing the search
});