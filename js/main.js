/* JavaScript by Jessica Kane, UW-Madison, 2018 */

// -----------------Create the Leaflet map--------------
function createMap(){
    var map = L.map('map', {
        center: [40.7, -39.7],
        zoom: 3,
        minZoom: 2,
        maxZoom: 6
    });

    // Add base tilelayer and attribution
    L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiamthbmUiLCJhIjoiY2l4eXRpOHQwMDA1aDMzbXN0ZzM0eTVhaSJ9.hr5HUMhLI2Dve3F61qXp2w', {
        attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong> | Data Source: <a href="http://dx.doi.org/10.1787/4de0116a-en">OECD iLibrary</a> accessed March 2, 2018 | Font: <a href="https://fonts.google.com/specimen/Open+Sans">Open Sans</a> | Map Prepared By: <a href="https://jeskane.github.io/">Jessica Kane</a> who was supported by an <a href="https://www.aauw.org/">AAUW</a> Career Development Grant',
        minZoom: 2,
        maxZoom: 6,
        detectRetina: true
    }).addTo(map);
    
    var genDataFile = "data/MSWKgPerCapita.geojson";
    var recDataFile = "data/MSWKgPerCapRecov.geojson";
    
    // Call getData function
    getData(map, genDataFile, recDataFile, setUpFunction);
};

// ---------------Get, Process, and Set Up Data---------------
function processData(data){
    // Empty array to hold attributes
    var attributes = [];

    // Properties of the first feature in the dataset
    var properties = data.features[0].properties;

    // Ppush each attribute name into attributes array
    for (var attribute in properties){
        //only take certain attributes
        if (attribute.indexOf("MSW") > -1){
            attributes.push(attribute);
        };
    };
    return attributes;
};

// Import GeoJSON data
function getData(map, genDataFile, recDataFile, setUpFunction){
    // Load the generated waste data
    $.ajax(genDataFile, {
        dataType: "json",
        success: function(response){
            var genAttributes = processData(response);
            var genData = response;
        
            // Lload the recycled waste data
            $.ajax(recDataFile, {
                dataType: "json",
                success: function(response){
                    var recAttributes = processData(response);
                    var recData = response;
                    
                    // Pass both sets of data to setUpFunction
                    setUpFunction(map, genData, recData, genAttributes, recAttributes); 
                }
            });
        }
    });     
};

function setUpFunction(map, genData, recData, genAttributes, recAttributes){
    // Create dataset names to make setup and styling of each layer easier
    var genSetName = "genMSW";
    var recSetName = "recMSW";
    
    createPropSymbols(genData, recData, map, genAttributes, recAttributes, genSetName, recSetName);
    
    createLegend(map, genAttributes, genSetName);
    createLegend(map, recAttributes, recSetName);
            
    createSequenceControls(map, genAttributes, recAttributes, genSetName, recSetName);
};

// ---------------Create Proportional Symbols---------------
function createPropSymbols(genData, recData, map, genAttributes, recAttributes, genSetName, recSetName){
    var genLayer = L.featureGroup();
    var recLayer = L.featureGroup();
    
    // Create a Leaflet GeoJSON layer for generated waste and add it to the map
    L.geoJson(genData, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, genAttributes, genSetName);
        },
        onEachFeature: function(feature, layer) {
            layer.addTo(genLayer.addTo(map));
        }
    }).addTo(map);
    
    // Create a Leaflet GeoJSON layer for recycled waste and add it to the map
    L.geoJson(recData, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, recAttributes, recSetName);
        },
        onEachFeature: function(feature, layer) {
            layer.addTo(recLayer.addTo(map));
        }
    }).addTo(map);
  
    var baseLayers = null;
    
    var overlays = {
        "Waste Generated": genLayer,
        "Waste Recycled or Composted": recLayer
    };
    
    // Add layer control and zoom control
    L.control.layers(baseLayers, overlays, {collapsed:false},{position: 'topright'}).addTo(map);
    
    map.zoomControl.setPosition('topright');
    
    map.on("overlayadd", function (event) {
      recLayer.bringToFront();
    });
}; 

// Function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes, setName){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];

    // Create marker options based on dataset
    if (setName == "genMSW"){
        var options = {
            fillColor: "#CE7816",
            color: "#AD550D",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }
    } else {
        var options = {
            fillColor: "#006FFF",
            color: "#0026FF",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }
    };

    // For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    // Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    // Create circle marker layer
    var layer = L.circleMarker(latlng, options);
    
    createPopup(feature.properties, attribute, layer, options.radius, setName);
    
    // Event listeners to open popup on hover
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        }
    });

    // Return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

// Calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    var scaleFactor = 1;
    
    // Area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    
    // Radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);
    
    return radius;
};

// ---------------Create PopUps---------------
function createPopup(properties, attribute, layer, radius, setName){
    // Add country title to popup content string
    var year = attribute.split("_")[1];    
    var popupContent = "<h3 id='popupTitle'><b>" + properties.Country + " " + "(" + year + ")" + "</b></h3>";
    
    // Add formatted attribute to panel content string, depending on dataset name
     if (setName == "genMSW"){
        popupContent += "<p>Waste Generated: " + "<b>" + properties[attribute] + "</b> kg/capita</p>";
        
        // Set popup options including class for styling
        var popupOptions = {
            offset: new L.Point(0,-radius),
            className: 'gen-popup'
        }
         
        // Replace the layer popup
        layer.bindPopup(popupContent, popupOptions)
    } else if (setName == "recMSW") {
        popupContent += "<p>Waste Recycled/Composted: " + "<b>" + properties[attribute] + "</b> kg/capita</p>";
        
        // Set popup options including class for styling
        var popupOptions = {
            offset: new L.Point(0,-radius),
            className: 'rec-popup'
        }
         
        // Replace the layer popup
        layer.bindPopup(popupContent, popupOptions)
    }
};

// ---------------Create Legends---------------
function createLegend(map, attributes, setName){
    // Set parameters for each legend, based on dataset name
    if(setName==="genMSW"){
        var fill = "#CE7816";
        var stroke = "#AD550D";
        var legendDiv = 'legend-control-container-gen';
        var temporalDiv = '<div id="temporal-legend-gen">';
        var circleClass = '<circle class="legend-circle-gen" id="gen-';
        var attributeLegend = '<svg id="attribute-legend-gen" width="110px" height="70px">';
        var attributeLegendId = '-text-gen" x="65" y="';
    } else if(setName==="recMSW"){
        var fill = "#006FFF";
        var stroke = "#0026FF";
        var legendDiv = 'legend-control-container-rec';
        var temporalDiv = '<div id="temporal-legend-rec">';
        var circleClass = '<circle class="legend-circle-rec" id="rec-';
        var attributeLegend = '<svg id="attribute-legend-rec" width="110px" height="70px">'
        var attributeLegendId = '-text-rec" x="65" y="';
    };
    
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },
        onAdd: function (map) {
            // Create the control container with a particular class name
            var container = L.DomUtil.create('div', legendDiv);

            // Add temporal legend div to container
            $(container).append(temporalDiv)

            // Start attribute legend svg string
            var svg = attributeLegend;
            
            // Array of circle names to base loop on
            var circles = {
                max: 30,
                mean: 50,
                min: 70
            };

            // Loop to add each circle and text to svg string based on dataset parameters
            for (var circle in circles){
                // Circle string
                svg += circleClass + circle + 
                '" fill=' + fill + ' fill-opacity="0.8" stroke=' + stroke + ' cx="30"/>';
                
                //Text string
                svg += '<text id="' + circle + attributeLegendId + circles[circle] + '" class="legendText"></text>';
            };

            // Close svg string
            svg += "</svg>";

            // Add attribute legend svg to container
            $(container).append(svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
    updateLegend(map, attributes[0], setName);
};

// ---------------Update Legend---------------
// Update the legend with new attribute
function updateLegend(map, attribute, setName){
    // Create content for legend
    var year = attribute.split("_")[1];
    // Content determined by dataset name
    if (setName === "genMSW"){
        var content = "<h3>Waste Generated (kg/capita) in " + year + "</h3>";
        // Replace legend content
        $('#temporal-legend-gen').html(content);
    
        // Get the max, mean, and min values as an object
        var circleValues = getCircleValues(map, attribute);
    
        for (var key in circleValues){
            // Get the radius
            var radius = calcPropRadius(circleValues[key]);
            
            // Assign the cy and r attributes
            $('#gen-'+key).attr({
                cy: 59 - radius,
                r: radius
            });
            
            // Add legend text
            $('#'+key+'-text-gen').text(Math.round(circleValues[key]*100)/100);
        };
    } else if (setName === "recMSW") {
        var content = "<h3>Waste Recycled or Composted (kg/capita) in " + year + "</h3>";
        // Replace legend content
        $('#temporal-legend-rec').html(content);
    
        // Get the max, mean, and min values as an object
        var circleValues = getCircleValues(map, attribute);
    
        for (var key in circleValues){
            // Get the radius
            var radius = calcPropRadius(circleValues[key]);

            // Assign the cy and r attributes
            $('#rec-'+key).attr({
                cy: 59 - radius,
                r: radius
            });
        
            // Add legend text
            $('#'+key+'-text-rec').text(Math.round(circleValues[key]*100)/100);
        };
    }
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

// ---------------Create Sequence Controls---------------
function createSequenceControls(map, genAttributes, recAttributes, genSetName, recSetName){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // Create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');
                
            var year = genAttributes[0].split("_")[1];
    
            $(container).append('<div id="year">' + year+ '</div>');
            
            // Create range input element (slider)
            $(container).append('<input class="range-slider" type="range" max=6 min=0 value=0 step=1>');
            
            
            // Add skip buttons
            $(container).append('<span class="skip" id="reverse" title="Reverse">Reverse</span>');
            $(container).append('<span class="skip" id="forward" title="Forward">Skip</span>');
            
            // Kill any mouse event listeners on the map
            $(container).on('mousedown dblclick pointerdown', function(e){
                L.DomEvent.stopPropagation(e);
            });
            
            // Disable map dragging when on slider
            $(container).on('mousedown', function(){
                map.dragging.disable();
            });
            
            // Reenable map dragging when off slider
            $(container).on('mouseup', function(){
                map.dragging.enable();
            });

            return container;
        }
    });
    
    map.addControl(new SequenceControl());
    
    // Add images to buttons
    $('#reverse').html('<i class="fas fa-chevron-circle-left fa-2x"></i>');
    $('#forward').html('<i class="fas fa-chevron-circle-right fa-2x"></i>');
            
    // Click listener for buttons
    $('.skip').click(function(){
        // Get the old index value
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
        
        // Pass new attribute to update symbols in both layers
        updatePropSymbols(map, genAttributes[index], genSetName);
        updatePropSymbols(map, recAttributes[index], recSetName);
        
        // Update year by slider
        updateSliderYear(genAttributes[index]);
    });

    // Input listener for slider
    $('.range-slider').on('input', function(){
        // Get the new index value
        var index = $(this).val();
        
        // Pass new attribute to update symbols in both layers
        updatePropSymbols(map, genAttributes[index], genSetName);
        updatePropSymbols(map, recAttributes[index], recSetName);
        
        // Update year by slider
        updateSliderYear(genAttributes[index]);
    });
};

function updateSliderYear(attribute){
    var year = attribute.split("_")[1];
    $('#year').html(year);  
};

// ---------------Resize Proportional Symbols---------------
// Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute, setName){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            // Access feature properties
            var props = layer.feature.properties;

            // Update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);
            
            // Update popups and legend
            createPopup(props, attribute, layer, radius, setName);
            updateLegend(map, attribute, setName);
        };
    });
};

$(document).ready(createMap);