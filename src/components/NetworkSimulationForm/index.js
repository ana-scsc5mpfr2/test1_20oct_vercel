import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRightFromSquareIcon, Loader2 } from 'lucide-react';
import { useScript } from "@uidotdev/usehooks";
import { Helmet } from "react-helmet";
import './index.css';
const calcularLadoDelCuadrado = (area) => {
  if (area <= 0) {
      console.error("El área debe ser mayor que 0.");
      return null;
  }
  return Math.sqrt(area); // Calcula el lado
};

const NetworkSimulationForm = ({ onStartSimulation, disabled = false, simulationParams }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeUpdateMode, setActiveUpdateMode] = useState(null);
  const cesiumContainerRef = useRef(null);
  const viewerRef = useRef(null);
  const osmBuildingsRef = useRef(null);
  const entitiesRef = useRef({
    center: null,
    antenna1: null,
    antenna2: null,
    boundary: null
  });
  const [formData, setFormData] = useState({
    centerLongitude: -99.167653,
    centerLatitude: 19.426979,
    studyAreaSize: 500, // Default 1km
    antena1: {
      longitude: -99.168996,
      latitude: 19.426468,
      frequency: 28,
      power: 30,
    },
    antena2: {
      longitude:-99.166626,
      latitude: 19.4275,
      frequency: 28,
      power: 30,
    },
    sensitivity: -110,
    G_rx:-3,
    modelType: "Umi",
    h_bs: 10,
    gridSpacing: 20,
    gridSize: 4, //11,
  });

  const offsetsRef = useRef({
    antenna1: {
      lat: formData.antena1.latitude - formData.centerLatitude,
      lon: formData.antena1.longitude - formData.centerLongitude
    },
    antenna2: {
      lat: formData.antena2.latitude - formData.centerLatitude,
      lon: formData.antena2.longitude - formData.centerLongitude
    }
  });

  const boundaryLimitsRef = useRef({
    minLat: 0,
    maxLat: 0,
    minLon: 0,
    maxLon: 0
  });

  useEffect(() => {
    if (simulationParams) {
      setFormData(simulationParams);
    }
  }, [simulationParams]);

  useEffect(() => {
    if (simulationParams === formData) {
      setTimeout(() => {
        setIsLoading(false);
      }, 10);
    }
  }, [simulationParams, formData]);

  const status = useScript(
    "https://cesium.com/downloads/cesiumjs/releases/1.106/Build/Cesium/Cesium.js"
  );

  // Fix for updateBuildingsStyle function
  const updateBuildingsStyle = () => {
    if (!osmBuildingsRef.current) return;

    osmBuildingsRef.current.style = new window.Cesium.Cesium3DTileStyle({
      color: {
        conditions: [
          ['${feature["cesium#longitude"]} >= ' + boundaryLimitsRef.current.minLon +
            ' && ${feature["cesium#longitude"]} <= ' + boundaryLimitsRef.current.maxLon +
            ' && ${feature["cesium#latitude"]} >= ' + boundaryLimitsRef.current.minLat +
            ' && ${feature["cesium#latitude"]} <= ' + boundaryLimitsRef.current.maxLat,
            "color('rgba(255, 0, 255, 0.5)')"],
          [true, "color('white')"]
        ]
      }
    });
  };

  const calculateDefaultOffsets = () => {
    return {
      antenna1: {
        lat: 0,
        lon: 0
      },
      antenna2: {
        lat: 0.000575,  // Default offset for antenna 2
        lon: -0.001555
      }
    };
  };

 // Modify the updateBoundary function to check antenna positions
 const updateBoundary = (center) => {
  if (!viewerRef.current) return;
  const area = formData.studyAreaSize; // Área en m², suponiendo que params.studyAreaSize ya contiene el área
  const ladoEnm = calcularLadoDelCuadrado(area); // Lado del cuadrado en kilómetros

  if (!ladoEnm) {
      console.error("No se pudo calcular el lado del cuadrado.");
      return;
  }

  //console.log(`Lado del cuadrado: ${ladoEnm} m`);

  // Convertir el lado del cuadrado en un radio en grados geográficos
  var radius = (ladoEnm ) / 11131.99 //  Donde 11131.99 es la aproximación de m por grado
  
  ////////const radius = (formData.studyAreaSize / 2) / 111319.9;

  boundaryLimitsRef.current = {
    minLon: center.lon - radius,
    maxLon: center.lon + radius,
    minLat: center.lat - radius,
    maxLat: center.lat + radius
  };

  // Check if antennas are outside boundary
  const antenna1Outside = !isInBoundary(formData.antena1.latitude, formData.antena1.longitude);
  const antenna2Outside = !isInBoundary(formData.antena2.latitude, formData.antena2.longitude);

  if (antenna1Outside || antenna2Outside) {
    // Reset to default offsets
    const defaultOffsets = calculateDefaultOffsets();
    offsetsRef.current = defaultOffsets;

    // Update antenna positions with new center and default offsets
    setFormData(prev => ({
      ...prev,
      antena1: {
        ...prev.antena1,
        latitude: center.lat + defaultOffsets.antenna1.lat,
        longitude: center.lon + defaultOffsets.antenna1.lon
      },
      antena2: {
        ...prev.antena2,
        latitude: center.lat + defaultOffsets.antenna2.lat,
        longitude: center.lon + defaultOffsets.antenna2.lon
      }
    }));

    // Update antenna positions in 3D view
    const antenaHeight = formData.h_bs;
    const positions = [
      window.Cesium.Cartographic.fromDegrees(
        center.lon + defaultOffsets.antenna1.lon,
        center.lat + defaultOffsets.antenna1.lat
      ),
      window.Cesium.Cartographic.fromDegrees(
        center.lon + defaultOffsets.antenna2.lon,
        center.lat + defaultOffsets.antenna2.lat
      )
    ];

    window.Cesium.sampleTerrainMostDetailed(viewerRef.current.terrainProvider, positions)
      .then((updatedPositions) => {
        const height1 = updatedPositions[0].height || 0;
        const height2 = updatedPositions[1].height || 0;

        if (entitiesRef.current.antenna1) {
          entitiesRef.current.antenna1.position = window.Cesium.Cartesian3.fromDegrees(
            center.lon + defaultOffsets.antenna1.lon,
            center.lat + defaultOffsets.antenna1.lat,
            height1 + antenaHeight
          );
        }

        if (entitiesRef.current.antenna2) {
          entitiesRef.current.antenna2.position = window.Cesium.Cartesian3.fromDegrees(
            center.lon + defaultOffsets.antenna2.lon,
            center.lat + defaultOffsets.antenna2.lat,
            height2 + antenaHeight
          );
        }
      });

    // Show alert to user
    alert("Las antenas estaban fuera del límite y han sido reposicionadas a su ubicación predeterminada.");
  }

  if (entitiesRef.current.boundary) {
    viewerRef.current.entities.remove(entitiesRef.current.boundary);
  }

  entitiesRef.current.boundary = viewerRef.current.entities.add({
    polygon: {
      hierarchy: window.Cesium.Cartesian3.fromDegreesArray([
        boundaryLimitsRef.current.minLon, boundaryLimitsRef.current.minLat,
        boundaryLimitsRef.current.maxLon, boundaryLimitsRef.current.minLat,
        boundaryLimitsRef.current.maxLon, boundaryLimitsRef.current.maxLat,
        boundaryLimitsRef.current.minLon, boundaryLimitsRef.current.maxLat,
      ]),
      material: window.Cesium.Color.YELLOW.withAlpha(0.5),
    },
  });

  updateBuildingsStyle();
};


  const isInBoundary = (lat, lon) => {
    return (
      lat >= boundaryLimitsRef.current.minLat &&
      lat <= boundaryLimitsRef.current.maxLat &&
      lon >= boundaryLimitsRef.current.minLon &&
      lon <= boundaryLimitsRef.current.maxLon
    );
  };

  const updateAntennaHeights = () => {
    if (!viewerRef.current) return;

    const positions = [
      window.Cesium.Cartographic.fromDegrees(formData.antena1.longitude, formData.antena1.latitude),
      window.Cesium.Cartographic.fromDegrees(formData.antena2.longitude, formData.antena2.latitude)
    ];

    window.Cesium.sampleTerrainMostDetailed(viewerRef.current.terrainProvider, positions)
      .then((updatedPositions) => {
        const height1 = updatedPositions[0].height || 0;
        const height2 = updatedPositions[1].height || 0;
        const antenaHeight = formData.h_bs;//10 o 25

        entitiesRef.current.antenna1.position = window.Cesium.Cartesian3.fromDegrees(
          formData.antena1.longitude,
          formData.antena1.latitude,
          height1 + antenaHeight
        );

        entitiesRef.current.antenna2.position = window.Cesium.Cartesian3.fromDegrees(
          formData.antena2.longitude,
          formData.antena2.latitude,
          height2 + antenaHeight
        );
      });
  };

  // Fix for antenna position updates to properly handle terrain height
  const updateAntennaPosition = (id, lat, lon) => {
    if (!viewerRef.current) return;

    const entity = id === 1 ? entitiesRef.current.antenna1 : entitiesRef.current.antenna2;
    const antenaHeight = formData.h_bs;

    if (isInBoundary(lat, lon)) {
      const position = window.Cesium.Cartographic.fromDegrees(lon, lat);

      window.Cesium.sampleTerrainMostDetailed(viewerRef.current.terrainProvider, [position])
        .then((updatedPositions) => {
          const height = updatedPositions[0].height || 0;
          entity.position = window.Cesium.Cartesian3.fromDegrees(lon, lat, height + antenaHeight);

          // Round the values to 6 decimal places for more precise coordinate representation
          const roundedLat = Number(lat.toFixed(6));
          const roundedLon = Number(lon.toFixed(6));

          setFormData(prev => ({
            ...prev,
            [`antena${id}`]: {
              ...prev[`antena${id}`],
              latitude: roundedLat,
              longitude: roundedLon
            }
          }));

          const offsets = {
            lat: roundedLat - formData.centerLatitude,
            lon: roundedLon - formData.centerLongitude
          };

          if (id === 1) {
            offsetsRef.current.antenna1 = offsets;
          } else {
            offsetsRef.current.antenna2 = offsets;
          }
        });
    } else {
      alert(`Antenna ${id} is out of bounds`);
    }
  };

  const updateCenter = (lat, lon) => {
    if (!viewerRef.current) return;

    // Round the values to 6 decimal places
    const roundedLat = Number(lat.toFixed(6));
    const roundedLon = Number(lon.toFixed(6));

    entitiesRef.current.center.position = window.Cesium.Cartesian3.fromDegrees(roundedLon, roundedLat);
    updateBoundary({ lat: roundedLat, lon: roundedLon });

    setFormData(prev => ({
      ...prev,
      centerLatitude: roundedLat,
      centerLongitude: roundedLon,
      antena1: {
        ...prev.antena1,
        latitude: roundedLat + offsetsRef.current.antenna1.lat,
        longitude: roundedLon + offsetsRef.current.antenna1.lon
      },
      antena2: {
        ...prev.antena2,
        latitude: roundedLat + offsetsRef.current.antenna2.lat,
        longitude: roundedLon + offsetsRef.current.antenna2.lon
      }
    }));

    const antenaHeight = formData.h_bs;
    const positions = [
      window.Cesium.Cartographic.fromDegrees(
        roundedLon + offsetsRef.current.antenna1.lon,
        roundedLat + offsetsRef.current.antenna1.lat
      ),
      window.Cesium.Cartographic.fromDegrees(
        roundedLon + offsetsRef.current.antenna2.lon,
        roundedLat + offsetsRef.current.antenna2.lat
      )
    ];

    window.Cesium.sampleTerrainMostDetailed(viewerRef.current.terrainProvider, positions)
      .then((updatedPositions) => {
        const height1 = updatedPositions[0].height || 0;
        const height2 = updatedPositions[1].height || 0;

        entitiesRef.current.antenna1.position = window.Cesium.Cartesian3.fromDegrees(
          roundedLon + offsetsRef.current.antenna1.lon,
          roundedLat + offsetsRef.current.antenna1.lat,
          height1 + antenaHeight
        );

        entitiesRef.current.antenna2.position = window.Cesium.Cartesian3.fromDegrees(
          roundedLon + offsetsRef.current.antenna2.lon,
          roundedLat + offsetsRef.current.antenna2.lat,
          height2 + antenaHeight
        );
      });

    // Center the camera on the new position
    viewerRef.current.camera.flyTo({
      destination: window.Cesium.Cartesian3.fromDegrees(
        roundedLon,
        roundedLat,
        3000
      ),
      orientation: {
        heading: window.Cesium.Math.toRadians(0.0),
        pitch: window.Cesium.Math.toRadians(-90.0),
        roll: 0.0,
      },
    });
  };

  useEffect(() => {
    if (status === "ready" && window.Cesium && cesiumContainerRef.current && !disabled) {
      window.Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZTAxYzI1NC1kNzg2LTQ5MTMtOTA4OC1kZTAzOWI4MmQ3MWIiLCJpZCI6MTk5NjExLCJpYXQiOjE3MDk1ODI5MTN9.kOkKk6-5jk-hBgh8sgVJO6LoecybmC6K72fuP9sE0Bc';

      viewerRef.current = new window.Cesium.Viewer(cesiumContainerRef.current, {
        terrainProvider: new window.Cesium.CesiumTerrainProvider({
          url: window.Cesium.IonResource.fromAssetId(1),
        }),
      });

      const antenaHeight = formData.h_bs;

      // Add OSM Buildings
      osmBuildingsRef.current = viewerRef.current.scene.primitives.add(
        window.Cesium.createOsmBuildings({
          style: new window.Cesium.Cesium3DTileStyle({
            color: "color('white')"
          })
        })
      );

      // Set initial camera view
      viewerRef.current.camera.setView({
        destination: window.Cesium.Cartesian3.fromDegrees(
          formData.centerLongitude,
          formData.centerLatitude,
          3000
        ),
        orientation: {
          heading: window.Cesium.Math.toRadians(0.0),
          pitch: window.Cesium.Math.toRadians(-90.0),
          roll: 0.0,
        },
      });

      entitiesRef.current.center = viewerRef.current.entities.add({
        position: window.Cesium.Cartesian3.fromDegrees(
          formData.centerLongitude,
          formData.centerLatitude
        ),
        point: { pixelSize: 10, color: window.Cesium.Color.GREEN },
      });

      entitiesRef.current.antenna1 = viewerRef.current.entities.add({
        position: window.Cesium.Cartesian3.fromDegrees(
          formData.antena1.longitude,
          formData.antena1.latitude,
          antenaHeight
        ),
        box: {
          dimensions: new window.Cesium.Cartesian3(10, 10, antenaHeight),
          material: window.Cesium.Color.BLUE.withAlpha(0.7),
        },
      });

      entitiesRef.current.antenna2 = viewerRef.current.entities.add({
        position: window.Cesium.Cartesian3.fromDegrees(
          formData.antena2.longitude,
          formData.antena2.latitude,
          antenaHeight
        ),
        box: {
          dimensions: new window.Cesium.Cartesian3(10, 10, antenaHeight),
          material: window.Cesium.Color.RED.withAlpha(0.7),
        },
      });

      updateBoundary({
        lat: formData.centerLatitude,
        lon: formData.centerLongitude
      });

      updateAntennaHeights();

      viewerRef.current.screenSpaceEventHandler.setInputAction((click) => {
        if (!activeUpdateMode) return;

        const ray = viewerRef.current.camera.getPickRay(click.position);
        const cartesian = viewerRef.current.scene.globe.pick(ray, viewerRef.current.scene);

        if (cartesian) {
          const cartographic = window.Cesium.Cartographic.fromCartesian(cartesian);
          const longitude = window.Cesium.Math.toDegrees(cartographic.longitude);
          const latitude = window.Cesium.Math.toDegrees(cartographic.latitude);

          if (activeUpdateMode === 'center') {
            updateCenter(latitude, longitude);
          } else if (activeUpdateMode === 'antenna1') {
            updateAntennaPosition(1, latitude, longitude);
          } else if (activeUpdateMode === 'antenna2') {
            updateAntennaPosition(2, latitude, longitude);
          }
        }
      }, window.Cesium.ScreenSpaceEventType.LEFT_CLICK);

      return () => {
        if (viewerRef.current) {
          viewerRef.current.destroy();
        }
      };
    }
  }, [status, activeUpdateMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onStartSimulation(formData);
    } catch (error) {
      console.error('Error en la simulación:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const [section, field] = name.split('.');

    if (field && section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: parseFloat(value)
        }
      }));

      if (field === 'frequency') {
        // Clamp the frequency value between 24.25 and 52.6 GHz
        const numValue = parseFloat(value);
        const clampedValue = Math.min(Math.max(numValue, 24.25), 52.6);
        
        setFormData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: clampedValue
          }
        }));
      } 
      if (field === 'latitude' || field === 'longitude') {
        const id = section === 'antena1' ? 1 : 2;
        const lat = field === 'latitude' ? parseFloat(value) : formData[section].latitude;
        const lon = field === 'longitude' ? parseFloat(value) : formData[section].longitude;
        updateAntennaPosition(id, lat, lon);
      }
    } else if (name === 'modelType') {
      const newHbs = value === 'Umi' ? 10 : 25;
      setFormData(prev => ({
        ...prev,
        modelType: value,
        h_bs: newHbs
      }));
      // Update antenna heights in the 3D view when model type changes
      if (viewerRef.current && entitiesRef.current.antenna1 && entitiesRef.current.antenna2) {
        // Update box dimensions for both antennas
        entitiesRef.current.antenna1.box.dimensions = new window.Cesium.Cartesian3(10, 10, newHbs);
        entitiesRef.current.antenna2.box.dimensions = new window.Cesium.Cartesian3(10, 10, newHbs);
        // Update positions to reflect new height
        const positions = [
          window.Cesium.Cartographic.fromDegrees(formData.antena1.longitude, formData.antena1.latitude),
          window.Cesium.Cartographic.fromDegrees(formData.antena2.longitude, formData.antena2.latitude)
        ];
        window.Cesium.sampleTerrainMostDetailed(viewerRef.current.terrainProvider, positions)
          .then((updatedPositions) => {
            const height1 = updatedPositions[0].height || 0;
            const height2 = updatedPositions[1].height || 0;
            entitiesRef.current.antenna1.position = window.Cesium.Cartesian3.fromDegrees(
              formData.antena1.longitude,
              formData.antena1.latitude,
              height1 + newHbs
            );
            entitiesRef.current.antenna2.position = window.Cesium.Cartesian3.fromDegrees(
              formData.antena2.longitude,
              formData.antena2.latitude,
              height2 + newHbs
            );
          });
      }
    } else if (name === 'centerLatitude' || name === 'centerLongitude') {
      const lat = name === 'centerLatitude' ? parseFloat(value) : formData.centerLatitude;
      const lon = name === 'centerLongitude' ? parseFloat(value) : formData.centerLongitude;
      updateCenter(lat, lon);
    } else if (section && field === undefined) {
      setFormData(prev => ({
        ...prev,
        [section]: value
      }));
    }
  };

  return (
    <>
      <Helmet>
        <link
          href="https://cesium.com/downloads/cesiumjs/releases/1.125/Build/Cesium/Widgets/widgets.css"
          rel="stylesheet"
        />
      </Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Container and Controls */}

        {!disabled && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="space-y-4">
                {/* Center Point Controls */}
                <h3 className="text-lg font-semibold text-white mb-4">Controles rápidos para reubicar las posiciones</h3>
                <div className="three-cols">

                  <div>
                    <h4 className="text-white mb-2">Punto central del cuadro amarillo</h4>
                    <button
                      className={`green-results-btn px-4 py-2 rounded w-full ${activeUpdateMode === 'center' ? 'bg-blue-600' : 'bg-blue-400'} text-white`}
                      onClick={() => setActiveUpdateMode(mode => mode === 'center' ? null : 'center')}
                    >
                      {activeUpdateMode === 'center' ? 'Cancelar Centro con Clic' : 'Actualizar Centro con Clic'}
                    </button>


                  </div>

                  {/* Antenna 1 Controls */}
                  <div>
                    <h4 className="text-white mb-2">Antena 1 (Azul)</h4>
                    <button
                      onClick={() => setActiveUpdateMode(mode => mode === 'antenna1' ? null : 'antenna1')}
                      className={`green-results-btn px-4 py-2 rounded w-full ${activeUpdateMode === 'antenna1' ? 'bg-blue-600' : 'bg-blue-400'} text-white`}
                    >
                      {activeUpdateMode === 'antenna1' ? 'Cancelar actualización Antena 1' : 'Actualizar Antena 1 con Clic'}
                    </button>
                  </div>

                  {/* Antenna 2 Controls */}
                  <div>
                    <h4 className="text-white mb-2">Antena 2 (Rojo)</h4>
                    <button
                      onClick={() => setActiveUpdateMode(mode => mode === 'antenna2' ? null : 'antenna2')}
                      className={`green-results-btn py-2 rounded w-full ${activeUpdateMode === 'antenna2' ? 'bg-blue-600' : 'bg-blue-400'} text-white`}
                    >
                      {activeUpdateMode === 'antenna2' ? 'Cancelar actualización Antena 2 ' : 'Actualizar Antena 2 con Clic'}
                    </button>
                  </div>
                </div>



              </div>
            </div>

            <div
              ref={cesiumContainerRef}
              id="cesiumContainer"
            /*ref={cesiumContainerRef}
            className="w-full h-[900px] bg-slate-900 rounded-lg"*/
            />
          </div>
        )}

        {/* Form Container */}
        <div className="w-full bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Configuraciones de simulación de la red</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Center Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white"> Coordenadas Centrales</h3>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Longitud (° )</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="centerLongitude"
                    value={formData.centerLongitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Latitud (° )</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="centerLatitude"
                    value={formData.centerLatitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
              </div>

       {/* In the General Settings section, add this new field: */}
       <div className="space-y-2">
            <label className="block text-sm text-gray-300">Longitud de Área de estudio (entre 500m y 2000m) </label>
            <input
              type="number"
              name="studyAreaSize"
              value={formData.studyAreaSize}
              onChange={(e) => {
                const value = Math.max(500, Math.min(2000, Number(e.target.value)));
                setFormData(prev => ({
                  ...prev,
                  studyAreaSize: value
                }));
                // Update boundary when study area size changes
                updateBoundary({
                  lat: formData.centerLatitude,
                  lon: formData.centerLongitude
                });
              }}
              min="500"
              max="2000"
              step="10"
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
              readOnly={disabled}
            />
          
          </div>

              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Configuraciones generales</h3>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Sensibilidad del Receptor (dBi)</label>
                  <input
                    type="number"
                    name="sensitivity"
                    value={formData.sensitivity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Ganancia del receptor (dBi)</label>
                  <input
                    type="number"
                    name="G_rx"
                    value={formData.G_rx}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Tipo de modelo</label>
                  <select
                    name="modelType"
                    value={formData.modelType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    disabled={disabled}
                  >
                    <option value="Umi">UMi</option>
                    <option value="Uma">UMa</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Altura de antena (m)</label>
                  <input
                    type="number"
                    name="h_bs"
                    value={formData.h_bs}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    {`Altura de la antena ${formData.h_bs}m predeterminado por el modelo ${formData.modelType}.`}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-gray-300"> Muestreo de los puntos (Grid Spacing) (metros)</label>
                  <input
                    type="number"
                    name="gridSpacing"
                    value={formData.gridSpacing}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300"> Cuadrantes por lado (Grid Size) (unidades)</label>
                  <input
                    type="number"
                    step="any"
                    name="gridSize"
                    value={formData.gridSize}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
              </div>
            </div>

            {/* Antennas Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Antenna 1 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Antena 1</h3>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Longitud (° )</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="antena1.longitude"
                    value={formData.antena1.longitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Latitud (° )</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="antena1.latitude"
                    value={formData.antena1.latitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Frecuencia (entre 24.25 GHz - 52.6 GHz) (GHz)</label>
                  <input
        
                    type="number"
                    name="antena1.frequency"
                    value={formData.antena1.frequency}
                    onChange={handleChange}
                    min="24.25"
                    max="52.6"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Potencia de transmisión (dBm)</label>
                  <input
                    type="number"
                    name="antena1.power"
                    value={formData.antena1.power}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
              </div>

              {/* Antenna 2 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Antena 2</h3>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Longitud (° )</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="antena2.longitude"
                    value={formData.antena2.longitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Latitud (° )</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="antena2.latitude"
                    value={formData.antena2.latitude}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Frecuencia (entre 24.25 GHz - 52.6 GHz) (GHz)</label>
                  <input
                    type="number"
                    name="antena2.frequency"
                    value={formData.antena2.frequency}
                    onChange={handleChange}
                    min="24.25"
                    max="52.6"
                    step="0.01"
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Potencia de transmisión (dBm)</label>
                  <input
                    type="number"
                    name="antena2.power"
                    value={formData.antena2.power}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    readOnly={disabled}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mt-6">
              {!disabled && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="green-results-btn px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Guardar Parámetros</span>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default NetworkSimulationForm;