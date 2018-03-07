/* Map of GeoJSON data from MSWKgPerCapita.geojson */

// Create the Leaflet map
function createMap(){
    var map = L.map('map', {
        center: [40.7, -39.7],
        zoom: 3,
        minZoom: 3,
        maxZoom: 6
    });

    // Add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        minZoom: 3,
        maxZoom: 6,
        detectRetina: true
    }).addTo(map);

    // Call getData function
    getData(map);
};

function createPopup(properties, attribute, layer, radius){
    //add city to popup content string
    var popupContent = "<p><b>Country:</b> " + properties.Country + "</p>";

    //add formatted attribute to panel content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Municipal Waste Generated (" + year + "):</b></p>" + "<p>" + properties[attribute] + " kg per capita</p>";

    //replace the layer popup
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-radius)
    });
};

// Calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    
    // Scale factor to adjust symbol size evenly
    var scaleFactor = 1;
    
    // Area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    
    // Radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);
    
    return radius;
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
    
    createPopup(feature.properties, attribute, layer, options.radius);
    
    //event listeners to open popup on hover
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        }
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, map, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

// Create new sequence controls
function createSequenceControls(map, attributes){
    //create range input element (slider)
    $('#slider').append('<input class="range-slider" type="range">');
    
    //set slider attributes
    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1
    });
    
    $('#slider').append('<button class="skip" id="reverse">Reverse</button>');
    
    $('#slider').append('<button class="skip" id="forward">Skip</button>');
    
    $('#reverse').html('<i class="fas fa-chevron-circle-left"></i>');
    $('#forward').html('<i class="fas fa-chevron-circle-right"></i>');
    
    // Click listener for buttons
    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();

        // Increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            // If past the last attribute, wrap around to first attribute
            index = index > 6 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            // If past the first attribute, wrap around to last attribute
            index = index < 0 ? 6 : index;
        };

        // Update slider
        $('.range-slider').val(index);
        
        // Pass new attribute to update symbols
        updatePropSymbols(map, attributes[index]);
    });

    // Input listener for slider
    $('.range-slider').on('input', function(){
        // Get the new index value
        var index = $(this).val();
        updatePropSymbols(map, attributes[index]);
    });
};

// Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            createPopup(props, attribute, layer, radius);
        };
    });
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("MSWKgPerCapita") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};

function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //PUT YOUR SCRIPT TO CREATE THE TEMPORAL LEGEND HERE

            return container;
        }
    });

    map.addControl(new LegendControl());
};
    
// Import GeoJSON data
function getData(map){
    //load the data
    $.ajax("data/MSWKgPerCapita.geojson", {
        dataType: "json",
        success: function(response){
            
            var attributes = processData(response);
            
            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
            createLegend(map, attributes);
        }
    });
};

$(document).ready(createMap);