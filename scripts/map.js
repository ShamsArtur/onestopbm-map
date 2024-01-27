$(window).on('load', function() {
    
    loadMap();
    
    function loadMap(){
        var objects = getObjects();
        if (objects.length === 0){
            alert('NO DATA FOUND');
            return;
        }

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
  
          const map = L.map("map", config).setView([lat, lng], zoom);
          L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
          
          var geojsonLayer = new L.geoJson("..\geodata\areas.geojsonn", {
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
		// L.marker([lat, lng], {icon: greenIcon}).addTo(map);


    }

    function getObjects(){

        var objects = {};

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
            var url = "https://nominatim.openstreetmap.org/search.php?q=" + query + "&format=jsonv2"
            $.getJSON(
                url
            ).then(function(data){
                if (data[0]){
                    value.lat = data[0].lat;
                    value.lon = data[0].lon;
                }
            })
            return value;
        }

        var getDate = function(dateString){
            let text = dateString;
            let d = text.split(".");
            let dat = new Date(d[2] + '/' + d[1] + '/' + d[0]);
            return dat;
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
                const result = [...parse([data]).reduce((r, o) => {
                    const key = o["DELIVERY ADDRESS"] + '-' + o["ACCOUNT RFFERENCE"]
                    
                    const item = r.get(key) || Object.assign({}, o, {
                        "SUM": 0,
                        "COORDINATES": {},
                        "DATE": "01.01.0001"
                    });
                    
                    item["SUM"] += parseFloat(o["SUM OF INVOICE"]);
                    item["COORDINATES"] = getCoordinates(o["POST CODE"] + " " + o["DELIVERY ADDRESS"]);
                    if (getDate(item["INVOICE DATE"]) > getDate(item["DATE"]))
                        item["DATE"] = item["INVOICE DATE"];
                
                    return r.set(key, item);
                }, new Map).values()];
                
                objects = result;
            })

        });
        return objects;
    }
});
