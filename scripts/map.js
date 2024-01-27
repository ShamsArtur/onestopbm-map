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
          
          var geojsonLayer = new L.geoJson.ajax("https://raw.githubusercontent.com/ShamsArtur/onestop-geodata-areas/main/areas.geojson", {
			pointToLayer: function(feature, latlng) {
				return new L.marker(latlng, {icon: shopIcon});
			},
			onEachFeature: function (f, l) {
				
				var popupText = '<pre><h2>' + 
								'Postcode zone: ' + 
                                f.properties.name + 
                                '</h2></pre>';
				
				if (f.properties.freeDeliveryFrom != null){
					if (f.properties.freeDeliveryFrom < 200){
						l.setStyle({fillColor: "green", fillOpacity: 0.4});
					} else{
                        if (f.properties.name == "N20"){
						    l.setStyle({fillColor: "orange", fillOpacity: 0.2});
                        } else{
                            l.setStyle({fillColor: "orange", fillOpacity: 0.4});
                        }
					}
				}
                    l.bindPopup(popupText);
				}
		}).addTo(map);

		L.easyButton('fa-home', 
			function(btn,map){
  				map.setView([lat, lng], 20);
			},'Zoom To Home').addTo(map);

		L.Control.geocoder().addTo(map);

        getObjects();

    }

    function getDate(dateString){
        let text = dateString.toString();
        let d = text.split(".");
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
            if (sheets.length === 0 || !sheets.includes('Sheet1')){
                'No data found'
            }
    
            $.when(
                $.getJSON(apiUrl + spreadsheetId + '/values/Sheet1?key=' + googleApiKey)
            ).done(function(data){

                var parsedData = parse([data]);
                var hash = new Map();

                parsedData.forEach(function(item){
                    hashItem = {};
                    var key = item["DELIVERY ADDRESS"] + '-' + item["ACCOUNT REFERENCE"];
                    console.log(item);
                    if (hash.has(key)){
                        hashItem = hash.get(key);
                    } else{
                        hashItem.name = item["POST CODE"] + ' ' + item["DELIVERY ADDRESS"];
                        hashItem.customer = item["ACCOUNT REFERENCE"];
                        hashItem.date = "01.01.0001"
                        hashItem.coordinates = [item["Latitude"], item["Longitude"]];//getCoordinates(item["POST CODE"] + " " + item["DELIVERY ADDRESS"]);
                        hashItem.sum = 0;
                    }

                    hashItem.sum += parseFloat(item["SUM OF INVOICE"]);

                    if (getDate(item["INVOICE DATE"]) > getDate(hashItem.date))
                        hashItem.date = item["INVOICE DATE"]

                    hash.set(key, hashItem);
                });

                console.log(hash);
                hash.forEach(function(item){
                    console.log(item);
                    addMarkerToLayer(item);
                });
            });
        })
    };


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

        const markerIcon = (diffDays < 7) ? greenMarker : redMarker;

        var popupText = '<pre><h2>' + item.name;
        popupText += '<br>Customer:' + item.customer;
        popupText += '<br>Last Invoice Date: ' + item.date;
        popupText += '<br>Sum of invoices: ' + item.sum;
        var popup = L.popup()
            .setContent(popupText);
        
        var marker = L.marker(item.coordinates, { icon: markerIcon }).addTo(map).bindPopup(popup);

    }

});


