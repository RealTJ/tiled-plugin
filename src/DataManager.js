DataManager._tempTiledData = null;
DataManager._tiledLoaded = false;

let _loadMapData = DataManager.loadMapData;
DataManager.loadMapData = function (mapId) {
    _loadMapData.call(this, mapId);
    if (mapId > 0) {
        this.loadTiledMapData(mapId);
    } else {
        this.unloadTiledMapData();
    }
};

DataManager.loadTiledMapData = function (mapId) {
    const xhr = new XMLHttpRequest();
    let pluginParams = PluginManager.parameters("YED_Tiled");
    xhr.open('GET', "./" + pluginParams["Maps Location"] + "Map" + mapId + ".json");
    xhr.overrideMimeType('application/json');

    // on success callback
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.responseText !== "") {
                DataManager._tempTiledData = JSON.parse(xhr.responseText);
                TiledManager.processTiledData(DataManager._tempTiledData);
                TiledManager.triggerListener(TiledManager, "tiledmapdataprocessed", DataManager._tempTiledData, mapId);
            }
            let tiledLoaded = true;
            let tilesRequired = 0;
            if(DataManager._tempTiledData && DataManager._tempTiledData.tilesets && DataManager._tempTiledData.tilesets.length > 0) {
                for(var idx = 0; idx < DataManager._tempTiledData.tilesets.length; idx++) {
                    let tileset = DataManager._tempTiledData.tilesets[idx];
                    if(tileset.source) {
                        let realTileset = TilesetManager.getTileset(tileset.source);
                        if(realTileset) {
                            DataManager._tempTiledData.tilesets[idx] = Object.assign({}, realTileset, {firstgid: DataManager._tempTiledData.tilesets[idx].firstgid});
                        } else {
                            tiledLoaded = false;
                            tilesRequired++;
                            +function(idx) {
                                TilesetManager.loadTileset(tileset.source, function(returnTileset) {
                                    DataManager._tempTiledData.tilesets[idx] = Object.assign({}, returnTileset, {firstgid: DataManager._tempTiledData.tilesets[idx].firstgid});
                                    tilesRequired--;
                                    if(tilesRequired === 0) {
                                        DataManager._tiledLoaded = true;
                                    }
                                });
                            }(idx);
                        }
                    }
                }
            }
            // compability fix for newer tiled versions
            // after TileD Version 1.2, the format of the properties has changed
            // since I couldn't be bothered to change every source
            if (DataManager._tempTiledData.version >= 1.2 && true) {
                // old format:
                /*
                 "properties":
                      {
                       "priority":"1",
                       "zIndex":"1"
                      },
               "propertytypes":
                      {
                       "priority":"string",
                       "zIndex":"string"
                      },
                 */
                // new format (1.2 onwards)
                /*
                "properties":[
                  {
                   "name":"priority",
                   "type":"string",
                   "value":"1"
                  },
                  {
                   "name":"zIndex",
                   "type":"string",
                   "value":"1"
                  }],
                 */
                DataManager._tempTiledData.layers = DataManager._tempTiledData.layers.map(layer => {
                    layer.properties = layer.properties.reduce((aggregator, currentValue) => {
                        aggregator[currentValue.name] = currentValue.value;
                        return aggregator;
                    }, {});
                    return layer;
                });
            }
            DataManager._tiledLoaded = tiledLoaded;
        }
    };

    // set data to null and send request
    this.unloadTiledMapData();
    xhr.send();
};

DataManager.unloadTiledMapData = function () {
    DataManager._tempTiledData = null;
    DataManager._tiledLoaded = false;
};

let _isMapLoaded = DataManager.isMapLoaded;
DataManager.isMapLoaded = function() {
    let defaultLoaded = _isMapLoaded.call(this);
    let tiledLoaded = DataManager._tiledLoaded;

    return defaultLoaded && tiledLoaded;
};
