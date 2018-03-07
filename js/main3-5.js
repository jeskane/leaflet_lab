/* Map of GeoJSON data from MSW.geojson */

// Create the Leaflet map
function createMap(){
    var map = L.map('map', {
        center: [40.7, -39.7],
        zoom: 3,
        minZoom: 2,
        maxZoom: 6
    });

    // Add OSM base tilelayer
    L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiamthbmUiLCJhIjoiY2l4eXRpOHQwMDA1aDMzbXN0ZzM0eTVhaSJ9.hr5HUMhLI2Dve3F61qXp2w', {
        attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>',
        minZoom: 2,
        maxZoom: 6,
        detectRetina: true
    }).addTo(map);
    
    var genDataFile = "data/MSWKgPerCapita.geojson";
    var recDataFile = "data/MSWPercRecov.geojson"
    
    // Call getData function
    getData(map, genDataFile, recDataFile, setUpFunction);

};

function createPopup(properties, attribute, layer, radius, setName){
    //add country to popup content string
        var popupContent = "<p><b>Country:</b> " + properties.Country + "</p>";
    
    //add formatted attribute to panel content string
    var year = attribute.split("_")[1];
    
     if (setName == "genMSW"){
        popupContent += "<p><b>Municipal Solid Waste (" + year + "):</b></p>" + "<p>" + properties[attribute] + " kg per capita</p>";
    } else if (setName == "recMSW") {
        popupContent += "<p><b>Material Recovered:</p><p> Recycling/Composting (" + year + "):</b></p>" + "<p>" + properties[attribute] + " %</p>";
    }
    
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
function pointToLayer(feature, latlng, attributes, setName){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];

    //create marker options
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

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
    
    createPopup(feature.properties, attribute, layer, options.radius, setName);
    
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
function createPropSymbols(genData, recData, map, genAttributes, recAttributes, genSetName, recSetName){
    var genLayer = L.featureGroup();
    var recLayer = L.featureGroup();
    
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(genData, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, genAttributes, genSetName);
        },
        onEachFeature: function(feature, layer) {
            layer.addTo(genLayer.addTo(map));
        }
    }).addTo(map);
    
    //create a Leaflet GeoJSON layer and add it to the map
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
        "Municipal Waste Generated": genLayer,
        "Material Recovery": recLayer
    };
    L.control.layers(baseLayers, overlays, {position: 'topright'}).addTo(map);
    map.zoomControl.setPosition('topright');
    
    console.log(recLayer);
    
    map.on("overlayadd", function (event) {
	   recLayer.bringToFront();
    });
}; 

// Create new sequence controls
function createSequenceControls(map, genAttributes, recAttributes, genSetName, recSetName){
  
        var SequenceControl = L.Control.extend({
            options: {
                position: 'bottomleft'
            },

            onAdd: function (map) {
                // create the control container div with a particular class name
                var container = L.DomUtil.create('div', 'sequence-control-container');
            
                //create range input element (slider)
                $(container).append('<input class="range-slider" type="range" max=6 min=0 value=0 step=1>');
            
            
                //add skip buttons
                $(container).append('<span class="skip" id="reverse" title="Reverse">Reverse</span>');
                $(container).append('<span class="skip" id="forward" title="Forward">Skip</span>');
            
                //kill any mouse event listeners on the map
                $(container).on('mousedown dblclick pointerdown', function(e){
                    L.DomEvent.stopPropagation(e);
                });
            
                $(container).on('mousedown', function(){
                    map.dragging.disable();
                });

                return container;
            }
        });
    
        map.addControl(new SequenceControl());
    
        $('#reverse').html('<i class="fas fa-chevron-circle-left fa-2x"></i>');
        $('#forward').html('<i class="fas fa-chevron-circle-right fa-2x"></i>');
            
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
        updatePropSymbols(map, genAttributes[index], genSetName);
        updatePropSymbols(map, recAttributes[index], recSetName);
    });

    // Input listener for slider
    $('.range-slider').on('input', function(){
        // Get the new index value
        var index = $(this).val();
        updatePropSymbols(map, genAttributes[index], genSetName);
        updatePropSymbols(map, recAttributes[index], recSetName);
    });
};

// Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute, setName){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            createPopup(props, attribute, layer, radius, setName);
            
            updateLegend(map, attribute, setName);
        };
    });
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

//Update the legend with new attribute
function updateLegend(map, attribute, setName){
    //create content for legend
    var year = attribute.split("_")[1];
    if (setName == "genMSW"){
        var content = "<h3>Municipal Waste Generated in " + year + "</h3>";
        //replace legend content
        $('#temporal-legend-gen').html(content);
        
        //get the max, mean, and min values as an object
        var circleValues = getCircleValues(map, attribute);
        for (var key in circleValues){
            //get the radius
            var radius = calcPropRadius(circleValues[key]);

            //Step 3: assign the cy and r attributes
            $('#'+key).attr({
                cy: 59 - radius,
                r: radius
            });
        
            //Step 4: add legend text
            $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + " kg per capita");
        };
    } else if (setName == "recMSW") {
        var content = "<h3>Municipal Waste Recovered via Recycling/Composting in " + year + "</h3>";
        $('#temporal-legend-rec').html(content);
        
        //get the max, mean, and min values as an object
        var circleValues = getCircleValues(map, attribute);
        for (var key in circleValues){
            //get the radius
            var radius = calcPropRadius(circleValues[key]);

            //Step 3: assign the cy and r attributes
            $('#'+key).attr({
                cy: 59 - radius,
                r: radius
            });
        
            //Step 4: add legend text
            $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + " %");
        };
    }
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("MSW") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};

function createLegend(map, genAttributes, recAttributes, genSetName, recSetName){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');
            //var legendGenSvg = $(container).append('<div id="legend-genSVG">')
            //var legendRecSvg = $(container).append('<div id="legend-recSVG">')

            //add temporal legend div to container
            $(container).append('<div id="temporal-legend-gen">')
            $(container).append('<div id="temporal-legend-rec">')

            //start attribute legend svg string for Generated Waste
            var svgGen = '<svg id="attribute-legend-gen" width="200px" height="80px">';
            //array of circle names to base loop on
            var circlesGen = {
                max: 30,
                mean: 50,
                min: 70
            };
            //loop to add each circle and text to svg string
            for (var circle in circlesGen){
                //circle string
                svgGen += '<circle class="legend-circle-gen" id="' + circle + 
                '" fill="#CE7816" fill-opacity="0.8" stroke="#AD550D" cx="30"/>';  
                //text string
                svgGen += '<text id="' + circle + '-text" x="65" y="' + circlesGen[circle] + '"></text>';
            };
            //close svg string
            svgGen += "</svg>";
            //add attribute legend svg to container
            $(container).append(svgGen);
            
            //start attribute legend svg string for Recovered Waste
            var svgRec = '<svg id="attribute-legend-rec" width="200px" height="80px">';
            //array of circle names to base loop on
            var circlesRec = {
                max: 30,
                mean: 50,
                min: 70
            };
            //loop to add each circle and text to svg string
            for (var circle in circlesRec){
                //circle string
                svgRec += '<circle class="legend-circle-rec" id="' + circle + 
                '" fill="#006FFF" fill-opacity="0.8" stroke="#0026FF" cx="30"/>';  
                //text string
                svgRec += '<text id="' + circle + '-text" x="65" y="' + circlesRec[circle] + '"></text>';
            };
            //close svg string
            svgRec += "</svg>";
            //add attribute legend svg to container
            $(container).append(svgRec);
            console.log(svgGen);
            console.log(svgRec);
            
            return container;
        }
    });

    map.addControl(new LegendControl());
    updateLegend(map, genAttributes[0], genSetName);
    updateLegend(map, recAttributes[0], recSetName);
};

function setUpFunction(map, genData, recData, genAttributes, recAttributes){
    var genSetName = "genMSW";
    var recSetName = "recMSW";
    
    createPropSymbols(genData, recData, map, genAttributes, recAttributes, genSetName, recSetName);
    //createPropSymbols(recData, map, recAttributes, recSetName);
    
    createLegend(map, genAttributes, recAttributes, genSetName, recSetName);
            
    createSequenceControls(map, genAttributes, recAttributes, genSetName, recSetName);
};

// Import GeoJSON data
function getData(map, genDataFile, recDataFile, setUpFunction){
    
    //load the data
    $.ajax(genDataFile, {
        dataType: "json",
        success: function(response){
            var genAttributes = processData(response);
            //console.log(genAttributes);
            var genData = response;
        
            $.ajax(recDataFile, {
                dataType: "json",
                success: function(response){
                    var recAttributes = processData(response);
                    var recData = response;
                    
                    setUpFunction(map, genData, recData, genAttributes, recAttributes); 
                }
            });
        }
    });     
};

$(document).ready(createMap);