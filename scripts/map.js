$(window).on('load', function() {

    var map;
    
    loadMap();
    
    function loadMap(){

        document.title = 'ONE STOP BM';

        // config map
		let config = {
            minZoom: 2,
            maxZoom: 18
        };
  
        // magnification with which the map will start
        const zoom = 13;

        // co-ordinates
        const lat = 51.66351928020173;
        const lng = -0.044915512927555125;

        var LeafIcon = L.Icon.extend({
            options: {
                    iconSize:     [38, 95],
                    shadowSize:   [50, 64],
                    iconAnchor:   [22, 94],
                    shadowAnchor: [4, 62],
                    popupAnchor:  [-3, -76]
            }
        });

        map = L.map("map", config).setView([lat, lng], zoom);

        L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
        
        const greenIcon = new LeafIcon({
            iconUrl: 'http://leafletjs.com/examples/custom-icons/leaf-green.png',
            shadowUrl: 'http://leafletjs.com/examples/custom-icons/leaf-shadow.png'
            });
        L.marker([lat, lng], {icon: greenIcon}).addTo(map).bindPopup(L.popup().setContent("Our Store"));
        
		L.easyButton('fa-home', 
			function(btn,map){
  				map.setView([lat, lng], 20);
			},'Zoom To Home').addTo(map);

		L.Control.geocoder().addTo(map);

        getObjects();
        addCompetitors();
        drawBoundries();

    }

    function getDate(dateString){
        let text = dateString.toString();
        let separator = text.substring(2, 3);
        let d = text.split(separator);
        let dat = new Date(d[2] + '/' + d[1] + '/' + d[0]);
        return dat;
    }

    
    function getObjects(){

        var mapObjects = {};

        var googleDocURL = 'https://docs.google.com/spreadsheets/d/11wgKZMzyoEW9rUWKGQOeapYrrGx5skCs2aPaqquhPzE/edit';
        var googleApiKey = 'AIzaSyD97t4JrSFYVxJvuZgsuBiVWBzLmDBXQIQ';

        var apiUrl = 'https://sheets.googleapis.com/v4/spreadsheets/'
        var spreadsheetId = googleDocURL.indexOf('/d/') > 0
            ? googleDocURL.split('/d/')[1].split('/')[0]
            : googleDocURL;

        var parse = function(res) {
            return Papa.parse(Papa.unparse(res[0].values), {header: true} ).data;
        } 

        var getCoordinates = function(query){
            var value = {};
            var url = "https://nominatim.openstreetmap.org/search.php?q=" + query + "&format=jsonv2";

            $.ajax({
                dataType: "json",
                async: false,
                url: url,
                success: function(data){
                    if (data[0]){
                        value.lat = data[0].lat;
                        value.lon = data[0].lon;
                    }
                }
            });
            return value;
        }

        $.getJSON(
            apiUrl + spreadsheetId + '?key=' + googleApiKey
        ).then(function(data){
            var sheets = data.sheets.map(function(o){ return o.properties.title})
            if (sheets.length === 0 || !sheets.includes('Showing')){
                alert('No data found');
                return;
            }
    
            $.when(
                $.getJSON(apiUrl + spreadsheetId + '/values/Showing?key=' + googleApiKey)
            ).done(function(data){

                var parsedData = parse([data]);
                var hash = new Map();

                parsedData.forEach(function(item){

                    hashItem = {};

                    var key = item["Longitude"].toString() + '-' + item["Latitude"].toString();

                    if (hash.has(key)){
                        hashItem = hash.get(key);
                    } else{
                        hashItem.name = item["POST CODE"];
                        hashItem.customers = new Set();
                        hashItem.date = "01.01.0001"
                        hashItem.coordinates = [item["Latitude"], item["Longitude"]];
                        hashItem.sum = 0;
                    }

                    hashItem.customers.add(item["ACCOUNT REFERENCE"]);
                    hashItem.sum += parseFloat(item["SUM OF INVOICE"]);

                    if (getDate(item["INVOICE DATE"]) > getDate(hashItem.date))
                        hashItem.date = item["INVOICE DATE"]

                    hash.set(key, hashItem);
                });

                hash.forEach(function(item){
                    addMarkerToLayer(item);
                });
            });
        })
    };

    function numberWithSpaces(x) {
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return parts.join(".");
    }

    function addMarkerToLayer(item){
        const redMarker = L.AwesomeMarkers.icon({
            icon: 'star',
            markerColor: 'red'
        });
        
        const greenMarker = L.AwesomeMarkers.icon({
            icon: 'star',
            markerColor: 'green'
        });

        const dayinmsseconds = 86400000;
        var today = new Date();
        const diffDays = Math.ceil(Math.abs(today - getDate(item.date)) / (dayinmsseconds)); 

        const markerIcon = (diffDays < 30) ? greenMarker : redMarker;

        var popupText = '<div><h4>' + item.name;
        popupText += '<br>Last Invoice Date: ' + item.date;
        popupText += '<br>Sum of invoices: ' + numberWithSpaces(item.sum.toFixed(2));
        popupText += '<br>';
        popupText += '<br>Customers: ' + '<br/>' + Array.from(item.customers).join('<br/>');
        popupText += '</div></h4>';
        var popup = L.popup()
            .setContent(popupText);
        
        var marker = L.marker(item.coordinates, { icon: markerIcon }).addTo(map).bindPopup(popup, {classname: 'tooltip'});
    }

    function addCompetitors(){

        var LeafIcon = L.Icon.extend({
            options: {
                iconSize:     [38, 95],
                shadowSize:   [50, 64],
                iconAnchor:   [22, 94],
                shadowAnchor: [4, 62],
                popupAnchor:  [-3, -76]
            }
        });

        const redIcon = new LeafIcon({
            iconUrl: 'https://leafletjs.com/examples/custom-icons/leaf-red.png',
            shadowUrl: 'https://leafletjs.com/examples/custom-icons/leaf-shadow.png'
        });

        var competitors = [
            {
                name: "Travis Perkins",
                address: "46 Crown Rd, Enfield EN1 1TH, United Kingdom",
                latitude: 51.649331415953924,
                longitude: -0.05305316931048556
            },
            {
                name: "Travis Perkins",
                address: "Sopers Rd, Cuffley, Potters Bar EN6 4RY, United Kingdom",
                latitude: 51.70718637843609, 
                longitude: -0.10861714230223259
            },
            {
                name: "Travis Perkins",
                address: "Bridge Dr, Broomfield Ln, London N13 4EU, United Kingdom",
                latitude: 51.616185881947935, 
                longitude: -0.11174531349143212
            },
            {
                name: "Build It Builders Merchants",
                address: "Units 1 - 4 Leeside Works, Leeside Rd, London N17 0SG, United Kingdom",
                latitude: 51.60643159680381, 
                longitude: -0.04585818280191764
            },
            {
                name: "Lawsons Edmonton - Timber, Building & Fencing Supplies",
                address: "401 Montagu Rd, London N9 0HP, United Kingdom",
                latitude: 51.62418938937044, 
                longitude: -0.04757667116381069,
            },
            {
                name: "Jewson Waltham Abbey",
                address: "Bridge House Wharf, Lea Rd, Waltham Cross, Waltham Abbey EN9 1AZ, United Kingdom",
                latitude: 51.686507910284924, 
                longitude: -0.012429213491432082
            },
            {
                name: "Builder Depot - New Southgate",
                address: "Station Rd, Arnos Grove, London N11 1QJ, United Kingdom",
                latitude: 51.612200479446706, 
                longitude: -0.14028678280191761
            },
            {
                name: "Selco Builders Warehouse",
                address: "Crown Rd, Enfield EN1 1TX, United Kingdom",
                latitude: 51.65265165770028, 
                longitude: -0.05444899814667487
            }
        ];
        competitors.forEach((item)=>{
            console.log(item);
            var popupText = '<div><h3>';
            popupText += '<br/>' + 'Name: ' + item.name;
            popupText += '<br/>' + 'Address: ' + item.address;
            popupText += '</h3></div>';
            var popup = L.popup().setContent(popupText);

            L.marker([item.latitude, item.longitude], {icon: redIcon}).addTo(map).bindPopup(popup);

        });

    };

    function drawBoundries(){

        let paths = [
            // "AB.geojson",
            // "AL.geojson",
            // "B.geojson",
            // "BA.geojson",
            // "BB.geojson",
            // "BD.geojson",
            // "BH.geojson",
            // "BL.geojson",
            // "BN.geojson",
            "BR.geojson",
            // "BS.geojson",
            // "CA.geojson",
            // "CB.geojson",
            // "CF.geojson",
            // "CH.geojson",
            "CM.geojson",
            // "CO.geojson",
            "CR.geojson",
            // "CT.geojson",
            // "CV.geojson",
            // "CW.geojson",
            "DA.geojson",
            // "DD.geojson",
            // "DE.geojson",
            // "DG.geojson",
            // "DH.geojson",
            // "DL.geojson",
            // "DN.geojson",
            // "DT.geojson",
            // "DY.geojson",
            "E.geojson",
            "EC.geojson",
            // "EH.geojson",
            "EN.geojson",
            // "EX.geojson",
            // "FK.geojson",
            // "FY.geojson",
            // "G.geojson",
            // "GL.geojson",
            // "GU.geojson",
            "HA.geojson",
            // "HD.geojson",
            // "HG.geojson",
            // "HP.geojson",
            // "HR.geojson",
            // "HS.geojson",
            // "HU.geojson",
            // "HX.geojson",
            "IG.geojson",
            // "IP.geojson",
            // "IV.geojson",
            // "KA.geojson",
            "KT.geojson",
            // "KW.geojson",
            // "KY.geojson",
            // "L.geojson",
            // "LA.geojson",
            // "LD.geojson",
            // "LE.geojson",
            // "LL.geojson",
            // "LN.geojson",
            // "LS.geojson",
            // "LU.geojson",
            // "M.geojson",
            // "ME.geojson",
            // "MK.geojson",
            // "ML.geojson",
            "N.geojson",
            // "NE.geojson",
            // "NG.geojson",
            // "NN.geojson",
            // "NP.geojson",
            // "NR.geojson",
            // "NW.geojson",
            // "OL.geojson",
            // "OX.geojson",
            // "PA.geojson",
            // "PE.geojson",
            // "PH.geojson",
            // "PL.geojson",
            // "PO.geojson",
            // "PR.geojson",
            // "RG.geojson",
            // "RH.geojson",
            "RM.geojson",
            // "S.geojson",
            // "SA.geojson",
            // "SE.geojson",
            // "SG.geojson",
            // "SK.geojson",
            "SL.geojson",
            "SM.geojson",
            // "SN.geojson",
            // "SO.geojson",
            // "SP.geojson",
            // "SR.geojson",
            // "SS.geojson",
            // "ST.geojson",
            // "SW.geojson",
            // "SY.geojson",
            // "TA.geojson",
            // "TD.geojson",
            // "TF.geojson",
            "TN.geojson",
            // "TQ.geojson",
            // "TR.geojson",
            // "TS.geojson",
            "TW.geojson",
            "UB.geojson",
            "W.geojson",
            // "WA.geojson",
            "WC.geojson",
            "WD.geojson",
            // "WF.geojson",
            // "WN.geojson",
            // "WR.geojson",
            // "WS.geojson",
            // "WV.geojson",
            // "YO.geojson",
            // "ZE.geojson"
        ]

        paths.forEach((item)=>{
            var geojsonLayer = new L.GeoJSON.AJAX("https://raw.githubusercontent.com/missinglink/uk-postcode-polygons/master/geojson/" + item, {
                pointToLayer: function(feature, latlng) {
                    return new L.marker(latlng, {icon: shopIcon});
                },
                onEachFeature: function (f, l) {
                    
                    var popupText = '<div><h2>' + 
                                    'Name: ' + f.properties.name;
                    popupText += '</h2></div>';
                    l.setStyle({ 
                        weight: 0.5,
                        color: 'black',
                        fillOpacity: 0.001,
                        /* fillColor: "green", fillOpacity: 0.4 */ });
                        
                    l.bindPopup(popupText);
                }
            }).addTo(map);
        });

       
    }

});


