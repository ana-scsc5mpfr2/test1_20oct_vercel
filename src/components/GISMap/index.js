import React, { useEffect, useRef, useState } from 'react';
import { useScript } from "@uidotdev/usehooks";
import { Helmet } from "react-helmet";
import './index.css';
import NetworkSimulationForm from '../NetworkSimulationForm';


// Utility functions - at the top level
const reorganizeGainVector = (originalGainVector) => {
    // Verificar que originalGainVector sea un array
    if (!Array.isArray(originalGainVector)) {
        console.error('originalGainVector debe ser un array');
        return [];
    }

    return originalGainVector.map(antenna => {
        if (!antenna || !antenna.gain_Vector) {
            console.error('Estructura de antena inválida:', antenna);
            return antenna;
        }

        const reorganizedGainVector = new Array(360);
        const originalVector = antenna.gain_Vector;

        // Reorganizar los valores de [180-359, 0-179] a [0-359]
        for (let i = 0; i < 360; i++) {
            let originalPosition = (i + 180) % 360;
            
            if (originalVector[originalPosition]) {
                reorganizedGainVector[i] = {
                    angle: i,
                    value: originalVector[originalPosition].value
                };
            }
        }

        return {
            ...antenna,
            gain_Vector: reorganizedGainVector,
            gtxMax: antenna.gtxMax
        };
    });
};

const getAnglefromVector = (angle, indexOfVector, reorganizedGainVector) => {
    // Normalizar el ángulo entre 0 y 359
    let normalizedAngle = Math.floor(angle % 360);
    if (normalizedAngle < 0) {
        normalizedAngle += 360;
    }

    // Verificar que el vector y el índice sean válidos
    if (!reorganizedGainVector || !reorganizedGainVector[indexOfVector]) {
        console.error('Vector de ganancia o índice inválido');
        return null;
    }

    const gainVectorData = reorganizedGainVector[indexOfVector].gain_Vector;

    // Si tenemos un valor exacto, lo retornamos
    if (gainVectorData[normalizedAngle]?.value !== undefined) {
        return gainVectorData[normalizedAngle].value;
    }

    // Búsqueda de valores cercanos para interpolación
    let lowerAngle = normalizedAngle;
    let upperAngle = normalizedAngle;
    
    while (lowerAngle >= 0 && !gainVectorData[lowerAngle]?.value) {
        lowerAngle--;
    }
    
    while (upperAngle < 360 && !gainVectorData[upperAngle]?.value) {
        upperAngle++;
    }

    if (lowerAngle < 0 && upperAngle >= 360) {
        console.warn('No se encontraron valores válidos para interpolación');
        return 0;//null;
    }

    if (lowerAngle < 0) {
        return gainVectorData[upperAngle].value;
    }

    if (upperAngle >= 360) {
        return gainVectorData[lowerAngle].value;
    }

    const lowerValue = gainVectorData[lowerAngle].value;
    const upperValue = gainVectorData[upperAngle].value;
    const rangeFraction = (normalizedAngle - lowerAngle) / (upperAngle - lowerAngle);
    
    return lowerValue + (upperValue - lowerValue) * rangeFraction;
};

const calcularLadoDelCuadrado = (area) => {
    if (area <= 0) {
        console.error("El área debe ser mayor que 0.");
        return null;
    }
    return Math.sqrt(area); // Calcula el lado
  };

const GISMap = ({ gainVector, params, proccessedImages }) => {
    const cesiumContainerRef = useRef(null);
    const coordinatesTableRef = useRef(null);
    const [isTableExpanded, setIsTableExpanded] = useState(false);
    const [vectorAnalysisResultsVisible, setVectorAnalysisResultsVisible] = useState([false, false]);
    const [precentageInScale, setPrecentageInScale] = useState(0);
    const [minGlobalValPot, setminGlobalValPot] = useState(0);
    const [maxGlobalValPot, setmaxGlobalValPot] = useState(0);

    const status = useScript(
        "https://cesium.com/downloads/cesiumjs/releases/1.106/Build/Cesium/Cesium.js",  //1.71
        {
            removeOnUnmount: true,
        }
    );

    useEffect(() => {
        if (status === "ready" && window.Cesium) {
            initializeMap();
        }
    }, [status]);

    const initializeMap = async () => {
        const Cesium = window.Cesium;
        let viewer;

        const reorganizedGainVector = reorganizeGainVector(gainVector);
        console.log("reorganizedGainVector", reorganizedGainVector);


        var centerLongitude = params.centerLongitude;
        var centerLatitude = params.centerLatitude;

        var antenaLongitude = params.antena1.longitude;
        var antenaLatitude = params.antena1.latitude;
        const antenaHeight = params.h_bs;  //10; // Kept constant
        console.log("params", params)
        console.log(" gainVector[0] ",  gainVector[0] )
        console.log(" gainVector[1].gain_Vector.value",  gainVector[1].gain_Vector.value )
       // function reorganizeGainVector(originalGainVector) {
            // Crear un nuevo array para almacenar los valores reorganizados
   
            const area = params.studyAreaSize; // Área en m², suponiendo que params.studyAreaSize ya contiene el área
            const ladoEnm = calcularLadoDelCuadrado(area); // Lado del cuadrado en kilómetros
          
            if (!ladoEnm) {
                console.error("No se pudo calcular el lado del cuadrado.");
                return;
            }
          
            //console.log(`Lado del cuadrado: ${ladoEnm} m`);
          
            // Convertir el lado del cuadrado en un radio en grados geográficos
            var radius = (ladoEnm ) / 11131.99 


       // var radius =   (params.studyAreaSize / 2) / 111319.9;//0.007;

        var c = 300000000;
        var fc = params.antena1.frequency;
        var fc1 = params.antena1.frequency * 1000000000;
        var h_BS = antenaHeight;
        var h_UT = 1.5;
        var d_BP = (4 * h_BS * h_UT * fc1) / c;

        var P_tx = params.antena1.power;
        var P_tx_2 = params.antena2.power;
        var G_rx = params.G_rx;

        var sensibilidad_rx = params.sensitivity;

        var antenaLongitude_2 = params.antena2.longitude;
        var antenaLatitude_2 = params.antena2.latitude;
        const antenaHeight_2 = params.h_bs;
        var fc_2 = params.antena2.frequency;
        var fc2 = params.antena2.frequency * 1000000000;
        var h_BS_2 = antenaHeight_2;
        var d_BP_2 = (4 * h_BS_2 * h_UT * fc2) / c;

        var minLon = centerLongitude - radius;
        var maxLon = centerLongitude + radius;
        var minLat = centerLatitude - radius;
        var maxLat = centerLatitude + radius;

        var gtxMax1 = Number(parseFloat(gainVector[0].gtxMax ).toFixed(6))  
        var gtxMax2 =  Number(parseFloat(gainVector[1].gtxMax ).toFixed(6))  //(gainVector[1].gtxMax )

        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZTAxYzI1NC1kNzg2LTQ5MTMtOTA4OC1kZTAzOWI4MmQ3MWIiLCJpZCI6MTk5NjExLCJpYXQiOjE3MDk1ODI5MTN9.kOkKk6-5jk-hBgh8sgVJO6LoecybmC6K72fuP9sE0Bc';

        viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: new Cesium.CesiumTerrainProvider({
                url: Cesium.IonResource.fromAssetId(1),
            }),
        });

        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude, 3500),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-90.0),
                roll: 0.0,
            },
        });

        viewer.entities.add({
            polygon: {
                hierarchy: Cesium.Cartesian3.fromDegreesArray([
                    minLon, maxLat,
                    maxLon, maxLat,
                    maxLon, minLat,
                    minLon, minLat,
                ]),
                material: Cesium.Color.YELLOW.withAlpha(0.5),
            },
        });

        viewer.scene.primitives.add(
            Cesium.createOsmBuildings({
                style: new Cesium.Cesium3DTileStyle({
                    defines: {
                        inRectangle: "(${feature['cesium#longitude']} >= " + minLon + " && " +
                            "${feature['cesium#longitude']} <= " + maxLon + " && " +
                            "${feature['cesium#latitude']} >= " + minLat + " && " +
                            "${feature['cesium#latitude']} <= " + maxLat + ")",
                    },
                    color: {
                        conditions: [
                            ['${inRectangle}', "color('rgba(255, 0, 255, 0.5)')"], // Rosa
                            [true, "color('white')"], // Blanco por defecto
                        ],
                    },
                }),
            })
        );

        var antenaCartographicPosition = Cesium.Cartographic.fromDegrees(antenaLongitude, antenaLatitude);
        var antenaCartographicPosition_2 = Cesium.Cartographic.fromDegrees(antenaLongitude_2, antenaLatitude_2);

        
        function getTerrainHeights(positions, callback) {
            var terrainProvider = viewer.terrainProvider;
            if (typeof Cesium.sampleTerrainMostDetailed === 'function')
                Cesium.sampleTerrainMostDetailed(terrainProvider, positions).then(() => {
                    callback();
                });
        }

        getTerrainHeights([antenaCartographicPosition], function () {
            var terrainHeight = antenaCartographicPosition.height || 0;
            var antenaTotalHeight = terrainHeight;
            var antenaPosition = Cesium.Cartesian3.fromDegrees(antenaLongitude, antenaLatitude, antenaTotalHeight);

            viewer.entities.add({
                position: antenaPosition,
                box: {
                    dimensions: new Cesium.Cartesian3(5, 5, antenaHeight),
                    material: Cesium.Color.BLUE.withAlpha(0.7),
                },
            });
        });

        getTerrainHeights([antenaCartographicPosition_2], function () {
            var terrainHeight = antenaCartographicPosition_2.height || 0;
            var antenaTotalHeight = terrainHeight;
            var antenaPosition = Cesium.Cartesian3.fromDegrees(antenaLongitude_2, antenaLatitude_2, antenaTotalHeight);

            viewer.entities.add({
                position: antenaPosition,
                box: {
                    dimensions: new Cesium.Cartesian3(5, 5, antenaHeight_2),
                    material: Cesium.Color.RED.withAlpha(0.7),
                },
            });
        });

        var gridSize = params.gridSize;
        const lonStep = (maxLon - minLon) / gridSize;
        const latStep = (maxLat - minLat) / gridSize;
        const quadrants = [];

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                quadrants.push({
                    minLon: minLon + j * lonStep,
                    maxLon: minLon + (j + 1) * lonStep,
                    minLat: minLat + i * latStep,
                    maxLat: minLat + (i + 1) * latStep,
                });
            }
        }

        async function getHeightOfBuilding(cartographic) {
            const cartesian = await Cesium.Ellipsoid.WGS84.cartographicToCartesian(cartographic);
            const latitude = Cesium.Math.toDegrees(cartographic.latitude);
            const longitude = Cesium.Math.toDegrees(cartographic.longitude);
            const terrainAltitude = (await viewer.scene.globe.getHeight(cartographic)) || 0;

            let buildingHeight = 0;
            let isBuilding = 0;
            const ray = new Cesium.Ray(viewer.scene.camera.position, Cesium.Cartesian3.subtract(cartesian, viewer.scene.camera.position, new Cesium.Cartesian3()));
            const result = await viewer.scene.pickFromRay(ray);
            const pickedFeature = result && result.object instanceof Cesium.Cesium3DTileFeature ? result.object : null;

            if (Cesium.defined(pickedFeature) && typeof pickedFeature.getProperty === 'function') {
                const heightProperty = pickedFeature.getProperty('height');
                const cesiumEstimatedHeight = pickedFeature.getProperty('cesium#estimatedHeight');
                const heightCalculated = Math.max(0, cartographic.height - terrainAltitude);

                buildingHeight = Math.max(heightProperty ? parseFloat(heightProperty) : heightCalculated, cesiumEstimatedHeight ? parseFloat(cesiumEstimatedHeight) : 0);
                isBuilding = buildingHeight > 0 ? 1 : 0;
            }

            return { buildingHeight, isBuilding };
        }

        async function checkLOS(antenaPosition, targetPosition) {
            const maxStepSize = 20; // Análisis cada 20 metros
            const distance = Cesium.Cartesian3.distance(targetPosition, antenaPosition);
            const direction = Cesium.Cartesian3.normalize(
                Cesium.Cartesian3.subtract(antenaPosition, targetPosition, new Cesium.Cartesian3()),
                new Cesium.Cartesian3()
            );

            let steps = Math.ceil(distance / maxStepSize);

            for (let i = 1; i <= steps; i++) {
                // Calcular la posición actual en el rayo (desde el punto verde hacia la antena)
                const currentPosition = Cesium.Cartesian3.add(
                    targetPosition,
                    Cesium.Cartesian3.multiplyByScalar(direction, i * maxStepSize, new Cesium.Cartesian3()),
                    new Cesium.Cartesian3()
                );

                const cartographic = Cesium.Cartographic.fromCartesian(currentPosition);

                // Obtener la altura del terreno y del edificio
                const terrainHeight = (await viewer.scene.globe.getHeight(cartographic)) || 0;
                const buildingInfo = await getHeightOfBuilding(cartographic);

                // Altura actual del rayo
                const rayHeight = cartographic.height;

                // Verificar si el rayo está obstruido
                if (buildingInfo.isBuilding && buildingInfo.buildingHeight + terrainHeight > rayHeight) {
                    return 0; // Obstrucción detectada
                }
            }

            return 1; // No se detectaron obstrucciones
        }

        function calculateUmiValue(losResult, distance3D, distance2D, fc, d_BP, h_BS, h_UT) {
            // Constantes para cálculos de pérdida de propagación
            var PL_1_umi_LOS = 32.4 + 21 * Math.log10(distance3D) + 20 * Math.log10(fc);
            var PL_2_umi_LOS =
                32.4 +
                40 * Math.log10(distance3D) +
                20 * Math.log10(fc) -
                9.5 * Math.log10(Math.pow(d_BP, 2) + Math.pow(h_BS - h_UT, 2));
            var PL_2_umi_NLOS =
                35.3 * Math.log10(distance3D) +
                22.4 +
                21.3 * Math.log10(fc) -
                0.3 * (h_UT - 1.5);

            // Determinar valores umiLOS y umiNLOS
            var umiLOS = distance2D <= d_BP ? PL_1_umi_LOS : PL_2_umi_LOS;
            var umiNLOS = Math.max(umiLOS, PL_2_umi_NLOS);

            // Determinar el valor final basado en línea de vista
            return losResult ? umiLOS : umiNLOS;
        }


        function calculateUmaValue(losResult, distance3D, distance2D, fc, d_BP, h_BS, h_UT) {
            // Constantes para cálculos de pérdida de propagación
            var PL_1_uma_LOS = 28 + 22 * Math.log10(distance3D) + 20 * Math.log10(fc);
            var PL_2_uma_LOS =
                28 +
                40 * Math.log10(distance3D) +
                20 * Math.log10(fc) -
                9 * Math.log10(Math.pow(d_BP, 2) + Math.pow(h_BS - h_UT, 2));
            var PL_uma_NLOS_ =
                13.54 +
                39.08 * Math.log10(distance3D) +
                20 * Math.log10(fc) -
                0.6 * (h_UT - 1.5);

            // Determinar valores umaLOS y umaNLOS
            var umaLOS;
            if (distance2D >= 1 && distance2D <= d_BP) {
                umaLOS = PL_1_uma_LOS;
            } else if (distance2D > d_BP && distance2D ) {//distance2D > d_BP && distance2D <= 5000
                umaLOS = PL_2_uma_LOS;
            } else {
                throw new Error("distance2D fuera de rango válido (10 <= d2D <= 5000).");
            }

            var umaNLOS = Math.max(umaLOS, PL_uma_NLOS_);

            // Determinar el valor final basado en línea de vista
            return losResult ? umaLOS : umaNLOS;
        }


        function calculateAngle(point1, point2) {
            var deltaLongitude = point2.longitude - point1.longitude;
            var deltaLatitude = point2.latitude - point1.latitude;
            var angle = Math.atan2(deltaLatitude, deltaLongitude);
            angle = Cesium.Math.toDegrees(angle);

            // Asegurar que los ángulos sean positivos
            if (angle < 0) {
                angle += 360;
            }
            return angle;
        }

 
/*
        function getAnglefromVector(angle, indexOfVector) {
            let flooredAngle = Math.floor(angle);
            let convertedPositon = null;
            let angleFromVector;
            if (flooredAngle >= 180) {
                convertedPositon = flooredAngle - 180
            } else if (flooredAngle < 180) {
                convertedPositon = flooredAngle + 180
            }

            angleFromVector = gainVector[indexOfVector]?.gain_Vector[convertedPositon]?.value;
            // console.log("gainVector[convertedPositon]?.value", gainVector[indexOfVector]?.gain_Vector[convertedPositon]?.value)
            // console.log("angle", angle)
            return angleFromVector;
        }
*/

        let heatmapPositions = [];
        let heatmapValues = [];
        let minGlobalVal = Infinity;
        let maxGlobalVal = -Infinity;

        async function createHeatmapForQuadrant(quadrant, spacing) {
            const positions = [];
            for (let lon = quadrant.minLon + spacing / 2; lon < quadrant.maxLon; lon += spacing) {
                for (let lat = quadrant.minLat + spacing / 2; lat < quadrant.maxLat; lat += spacing) {
                    positions.push(Cesium.Cartographic.fromDegrees(lon, lat));
                }
            }

            getTerrainHeights(positions, async () => {
                for (const position of positions) {
                    let { buildingHeight, isBuilding } = await getHeightOfBuilding(position);

                    const terrainHeight = position.height || 0;
                    // Si terrainHeight y buildingHeight son iguales, repite el cálculo
                    /*if (terrainHeight === buildingHeight) {
                        console.warn('Altura del terreno y del edificio son iguales en:', position);
                        ({ buildingHeight, isBuilding } = await getHeightOfBuilding(position));
                    }*/
                    let distance2D_1, distance3D_1, losResult_1 = null, calculatedValue_1;
                    let distance2D_2, distance3D_2, losResult_2 = null, calculatedValue_2;
                    let Pot = null; let P_rx_1 = null; let P_rx_2 = null;
                    let minCalculatedValue = null;
                    let associatedAntenna = null;
                    let losNlosAssociated = null;
                    let angle = null;
                    let G_tx = null;

                    if (!isBuilding) {
                        const pointPosition3D = Cesium.Cartesian3.fromRadians(
                            position.longitude,
                            position.latitude,
                            terrainHeight
                        );
                        
                        const pointPosition3D_user = Cesium.Cartesian3.fromRadians(
                            position.longitude,
                            position.latitude,
                            terrainHeight + h_UT //mas la altura del uduario promedio 1.5m
                        );

                        const antenaPosition3D_1 = Cesium.Cartesian3.fromDegrees(
                            antenaLongitude,
                            antenaLatitude,
                            terrainHeight + antenaHeight
                        );
                        const antenaPosition3D_2 = Cesium.Cartesian3.fromDegrees(
                            antenaLongitude_2,
                            antenaLatitude_2,
                            terrainHeight + antenaHeight_2
                        );

                        distance2D_1 = Cesium.Cartesian3.distance(
                            Cesium.Cartesian3.fromDegrees(antenaLongitude, antenaLatitude, terrainHeight),
                            pointPosition3D
                        );
                        distance3D_1 = Cesium.Cartesian3.distance(antenaPosition3D_1, pointPosition3D_user);
                        losResult_1 = await checkLOS(antenaPosition3D_1, pointPosition3D);
                        calculatedValue_1 = params.modelType === "Umi"
                            ? calculateUmiValue(losResult_1, distance3D_1, distance2D_1, fc, d_BP, h_BS, h_UT)
                            : calculateUmaValue(losResult_1, distance3D_1, distance2D_1, fc, d_BP, h_BS, h_UT);

                        distance2D_2 = Cesium.Cartesian3.distance(
                            Cesium.Cartesian3.fromDegrees(antenaLongitude_2, antenaLatitude_2, terrainHeight),
                            pointPosition3D
                        );
                        distance3D_2 = Cesium.Cartesian3.distance(antenaPosition3D_2, pointPosition3D_user);
                        losResult_2 = await checkLOS(antenaPosition3D_2, pointPosition3D);
                        calculatedValue_2 = params.modelType === "Umi"
                            ? calculateUmiValue(losResult_2, distance3D_2, distance2D_2, fc_2, d_BP_2, h_BS_2, h_UT)
                            : calculateUmaValue(losResult_2, distance3D_2, distance2D_2, fc_2, d_BP_2, h_BS_2, h_UT);

                        // P_tx = 30 + 8 +3-
                        // P_rx = P_tx + G_rx + G_rx - LOS 
                        P_rx_1 = P_tx +  G_rx - calculatedValue_1;//LOS 
                        P_rx_2 = P_tx_2 +  G_rx - calculatedValue_2;//LOS 

                        if (P_rx_1 > P_rx_2) {
                            // Pot = P_rx_1;
                            minCalculatedValue = calculatedValue_1;
                            associatedAntenna = "1";
                            losNlosAssociated = losResult_1 ? "LOS" : "NLOS";
                            angle = calculateAngle(antenaCartographicPosition, position);
                            G_tx = getAnglefromVector(angle, 0, reorganizedGainVector) + gtxMax1;
                            //G_tx =   getAnglefromVector(angle, 0) + gtxMax1 //Number(gtxMax1.toFixed(6));
                           // console.log("G_tx", G_tx)
                            Pot = P_rx_1 + G_tx;
                            //console.log("Pot", Pot)
                        } else {

                            minCalculatedValue = calculatedValue_2;
                            associatedAntenna = "2";
                            losNlosAssociated = losResult_2 ? "LOS" : "NLOS";
                            angle = calculateAngle(antenaCartographicPosition_2, position);
                            G_tx = getAnglefromVector(angle, 1, reorganizedGainVector) + gtxMax2;
                            //G_tx = getAnglefromVector(angle, 1) + gtxMax2 //getAnglefromVector(angle, 1) //gtxMax2 ++ gainVector[1].gtxMax 
                          //  console.log("G_tx", G_tx)
                            Pot = P_rx_2 + G_tx;
                           // console.log("Pot", Pot)
                        }

                        if (Pot !== null && Pot !== NaN) {
                            minGlobalVal = Math.min(minGlobalVal, Pot);
                            //   console.log("minGlobalVal", minGlobalVal)
                            maxGlobalVal = Math.max(maxGlobalVal, Pot);
                            // console.log("maxGlobalVal", maxGlobalVal,)
                        }
                    }

                    heatmapPositions.push(Cesium.Cartesian3.fromDegrees(
                        Cesium.Math.toDegrees(position.longitude),
                        Cesium.Math.toDegrees(position.latitude),
                        terrainHeight
                    ));
                    heatmapValues.push(Pot);

                    if (document) {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${Cesium.Math.toDegrees(position.latitude).toFixed(6)}°</td>
                            <td>${Cesium.Math.toDegrees(position.longitude).toFixed(6)}°</td>
                            <td>${terrainHeight.toFixed(2)}m</td>
                            <td>${isBuilding ? '1' : '0'} </td>
                            <td>${buildingHeight.toFixed(2)}m</td>
                            <td>${distance2D_1 ? distance2D_1.toFixed(2) : '-'}</td>
                            <td>${distance3D_1 ? distance3D_1.toFixed(2) : '-'}</td>
                            <td>${losNlosAssociated ? losNlosAssociated : '-'}</td>
                            <td>${minCalculatedValue !== null ? minCalculatedValue.toFixed(2) : '-'}</td>
                            <td>${associatedAntenna ? associatedAntenna : '-'}</td>
                            <td>${angle !== null ? angle.toFixed(2) : '-'}</td>
                            <td>${G_tx !== null ? G_tx.toFixed(2) : '-'}</td>
                            <td>${Pot !== null ? Pot.toFixed(2) : '-'} </td>
                        `;
                        document.getElementById('coordinatesTable').appendChild(row);
                    }
                }
            });
        }

        function showWarningMessage(mapContainerId) {
        // Encuentra y reemplaza la función WarningMessage

            // Check if the warning message already exists
            if (!document.getElementById('simulation-warning')) {
                // Create the warning message element
                const warningDiv = document.createElement('div');
                warningDiv.id = 'simulation-warning';
                warningDiv.style.position = 'absolute';
                warningDiv.style.top = '10px';
                warningDiv.style.left = '50%';
                warningDiv.style.transform = 'translateX(-50%)';
                warningDiv.style.backgroundColor = 'rgba(255, 81, 0, 0.9)';
                warningDiv.style.padding = '10px';
                warningDiv.style.border = '1px solid #ccc';
                warningDiv.style.borderRadius = '5px';
                warningDiv.style.zIndex = '1000';
                warningDiv.style.fontSize = '14px';
                warningDiv.style.fontWeight = 'bold';
                warningDiv.style.textAlign = 'center';
                warningDiv.textContent = 'Permita que la simulación se ejecute sin mover la cámara (vista); de lo contrario, los resultados podrían verse afectados.';

                // Append the warning message to the map container
                const mapContainer = document.getElementById('cesiumContainer'); // Cambiado de 'map-container' a 'cesiumContainer'
                if (mapContainer) {
                    mapContainer.style.position = 'relative'; // Ensure the container has relative positioning
                    mapContainer.appendChild(warningDiv);
                } else {
                    console.error(`Map container with ID "cesiumContainer" not found.`);
                }
            }
        }
        
        function removeWarningMessage() {
            const warningDiv = document.getElementById('simulation-warning');
            if (warningDiv) {
                warningDiv.remove();
            }
        }

        async function processAllQuadrants() {
            for (let index = 0; index < quadrants.length; index++) {
                const quadrant = quadrants[index]; // Obtén el cuadrante actual

                console.log(`Procesando cuadrante ${index + 1}`); // Registro de procesamiento de cuadrante

                // Establece la vista de la cámara en el centro del cuadrante
                viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(
                        (quadrant.minLon + quadrant.maxLon) / 2,
                        (quadrant.minLat + quadrant.maxLat) / 2,
                        2500 // Altura de la vista de la cámara
                    ),
                    duration: 1500, // Duración de la animación de la cámara
                });

                // Espera la duración de la animación de la cámara antes de continuar
                await new Promise(r => setTimeout(r, 1500));

                const spacingInMeters = params.gridSpacing;; // Define el espaciado en metros para el heatmap
                // Crea el heatmap para el cuadrante actual
                createHeatmapForQuadrant(quadrant, spacingInMeters / (111320 * Math.cos(Cesium.Math.toRadians(centerLatitude))), "Umi");
                showWarningMessage('cesiumContainer');//(cesiumContainerRef); // Muestra la advertencia
                
                // console.log(`Heatmap creado para cuadrante ${index + 1}`); // Registro de creación de heatmap

                // Espera adicional después de crear el heatmap (si es necesario)
                await new Promise(r => setTimeout(r, 1500));//15000
            }

            console.log('Procesamiento de todos los cuadrantes completado'); // Registro de finalización del procesamiento
            removeWarningMessage(); // Quita la advertencia

            // Registra el tiempo total de ejecución después de procesar todos los cuadrantes
            const totalExecutionTime = 30 * 1000 * quadrants.length + 15 * 1000;
            // console.log("Tiempo total de ejecución:", totalExecutionTime, "ms");
        }


        function visualizeHeatmap(positions, values) {
            // Eliminar leyenda existente si hay alguna
            const existingLegend = document.querySelector('.heatmap-legend');
            if (existingLegend) {
                existingLegend.remove();
            }
        
            // Crear nueva capa de puntos para el heatmap
            const heatmapLayer = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
            const minVal = minGlobalVal;
            const maxVal = maxGlobalVal;
        
            // Contadores para estadísticas
            let Ns = 0; // Número de puntos dentro de la sensibilidad del receptor
            let N = 0;  // Número total de puntos válidos
        
            // Configuración para el PDF
            const binCount = 50;
            const binWidth = (maxVal - minVal) / binCount;
            const bins = new Array(binCount).fill(0);
        
            // Filtrar valores válidos
            const validValues = values.filter(v => v !== null );//v => v !== null && v >= sensibilidad_rx
            N = validValues.length;
            Ns = validValues.filter(v => v >= sensibilidad_rx).length;
        
            // Calcular histograma
            validValues.forEach(value => {
                const binIndex = Math.min(Math.floor((value - minVal) / binWidth), binCount - 1);
                bins[binIndex]++;
            });
        
            // Calcular PDF normalizada
            // El área bajo la curva debe ser 1
            const totalArea = bins.reduce((sum, count) => sum + count * binWidth, 0);
            const normalizedBins = bins.map(count => count / (totalArea));
        
            // Mostrar en la consola
console.log('Bins:', bins);
console.log('Normalized PDF:', normalizedBins);
            // Procesar cada punto del mapa
            positions.forEach((position, i) => {
                const value = values[i];
                let color;
        
                if (value === null) {
                    color = Cesium.Color.WHITE;
                } else {
                    if (value >= sensibilidad_rx) {
                        const normalizedValue = (value - minVal) / (maxVal - minVal);
                        const hue = (1 - normalizedValue) * 0.28;
                        color = Cesium.Color.fromHsl(hue, 1, 0.5, 1);
                    } else {
                        color = Cesium.Color.GRAY;
                    }
                }
        
                heatmapLayer.add({
                    position,
                    color,
                    pixelSize: 16,
                });
            });
        
            // Configuración del gráfico SVG
            const svgWidth = 200;
            const svgHeight = 125;
            const graphMargin = { top: 5, right: 15, bottom:40, left: 55 };
            const graphWidth = svgWidth - graphMargin.left - graphMargin.right;
            const graphHeight = svgHeight - graphMargin.top - graphMargin.bottom;
        
            // Encontrar el valor máximo de la PDF normalizada para escalar el gráfico
            const maxPDFValue = Math.max(...normalizedBins);
        
            // Generar puntos para la curva PDF
            const points = normalizedBins.map((value, index) => {
                const x = graphMargin.left + (index / (binCount - 1)) * graphWidth;
                const y = graphMargin.top + graphHeight - (value / maxPDFValue * graphHeight);
                return `${x},${y}`;
            }).join(' ');
        
            // Calcular marcas del eje X (valores de potencia)
            const xAxisTicks = Array.from({ length: 5 }, (_, i) => {
                const value = minVal + (i * (maxVal - minVal) / 4);
                const x = graphMargin.left + (i * graphWidth / 4);
                return { value, x };
            });
        
            // Calcular marcas del eje Y (valores de densidad de probabilidad)
            const yAxisTicks = Array.from({ length: 5 }, (_, i) => {
                const value = (maxPDFValue * (4 - i) / 4);
                const y = graphMargin.top + (i * graphHeight / 4);
                return { value, y };
            });
        console.log("xAxisTicks", xAxisTicks)
            // Generar contenido HTML para la leyenda de potencia
            const powerLegendContainer = document.createElement("div");
            powerLegendContainer.className = 'heatmap-power-legend';
            powerLegendContainer.style.cssText = `
                position: absolute;
                top: 20px;
                right: 10px;
                background: rgba(42, 42, 42, 0.9);
                padding: 5px;
                border-radius: 5px;
                color: white;
                z-index: 1000;
                min-width: 100px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: move;
            `;
        
            // Generar paradas de gradiente para la escala de colores
            const gradientStops = [];
            for (let i = 0; i <= 1; i += 0.1) {
                const hue = i * 0.28;
                gradientStops.push(`hsl(${hue * 360}, 100%, 50%) ${i * 100}%`);
            }
        
            // Generar contenido HTML para la leyenda PDF
            const pdfLegendContainer = document.createElement("div");
            pdfLegendContainer.className = 'heatmap-pdf-legend';
            pdfLegendContainer.style.cssText = `
                position: absolute;
                top: 10px;
                left: 25px;
                background: rgba(42, 42, 42, 0.9);
                padding: 15px;
                border-radius: 5px;
                color: white;
                z-index: 1000;
                min-width: 200px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: move;
            `;
        
            // Contenido de la leyenda de potencia
            powerLegendContainer.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 10px; padding: 5px; background: rgba(0,0,0,0.2); cursor: move;" id="powerLegendHeader">
                    ▼ Potencia
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="background: linear-gradient(to bottom, ${gradientStops.join(', ')}); 
                                height: 200px; width: 20px; border-radius: 3px;"></div>
                    <div style="display: flex; flex-direction: column; justify-content: space-between; height: 200px;">
                        <span>${maxVal.toFixed(2)} dBm</span>
                        <span>${((maxVal + minVal) / 2).toFixed(2)} dBm</span>
                        <span>${minVal.toFixed(2)} dBm</span>
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: white; margin-right: 8px; border: 1px solid #666;"></div>
                        <span style="font-size: 12px;">Edificios</span>
                    </div>
                    <div style="display: flex; align-items: center; margin: 5px 0;">
                        <div style="width: 15px; height: 15px; background: gray; margin-right: 8px; border: 1px solid #666;"></div>
                        <span style="font-size: 12px;">Bajo Sensibilidad</span>
                    </div>
                </div>
            `;
        
            // Contenido de la leyenda PDF
            pdfLegendContainer.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 6px; padding: 5px; background: rgba(0,0,0,0.2); cursor: move;" id="pdfLegendHeader">
                    ▼ Distribución de Potencia
                </div>
                <div style="margin-top: 15px;">
                    <svg width="${svgWidth}" height="${svgHeight}" style="background: rgba(0,0,0,0.1); border-radius: 3px;">
                        <!-- Líneas de cuadrícula -->
                        ${xAxisTicks.map(tick => `
                            <line 
                                x1="${tick.x}" 
                                y1="${graphMargin.top}" 
                                x2="${tick.x}" 
                                y2="${graphHeight + graphMargin.top}" 
                                stroke="rgba(255,255,255,0.1)" 
                                stroke-dasharray="2,2"
                            />
                        `).join('')}
                        ${yAxisTicks.map(tick => `
                            <line 
                                x1="${graphMargin.left}" 
                                y1="${tick.y}" 
                                x2="${graphWidth + graphMargin.left}" 
                                y2="${tick.y}" 
                                stroke="rgba(255,255,255,0.1)" 
                                stroke-dasharray="2,2"
                            />
                        `).join('')}
                        
                        <!-- Curva PDF -->
                        <polyline
                            points="${points}"
                            fill="none"
                            stroke="white"
                            stroke-width="1.5"
                        />
                        
                        <!-- Ejes -->
                        <line 
                            x1="${graphMargin.left}" 
                            y1="${graphHeight + graphMargin.top}" 
                            x2="${graphWidth + graphMargin.left}" 
                            y2="${graphHeight + graphMargin.top}" 
                            stroke="white" 
                        />
                        <line 
                            x1="${graphMargin.left}" 
                            y1="${graphMargin.top}" 
                            x2="${graphMargin.left}" 
                            y2="${graphHeight + graphMargin.top}" 
                            stroke="white" 
                        />
                        
                        <!-- Etiquetas eje X -->
                        ${xAxisTicks.map(tick => `
                            <text 
                                x="${tick.x}" 
                                y="${graphHeight + graphMargin.top + 20}" 
                                fill="white" 
                                text-anchor="middle" 
                                font-size="10"
                            >${tick.value.toFixed(1)}</text>
                        `).join('')}
                        <text 
                            x="${svgWidth/2}" 
                            y="${svgHeight - 5}" 
                            fill="white" 
                            text-anchor="middle" 
                            font-size="10"
                        >Potencia (dBm)</text>
                        
                        <!-- Etiquetas eje Y -->
                        ${yAxisTicks.map(tick => `
                            <text 
                                x="${graphMargin.left - 5}" 
                                y="${tick.y}" 
                                fill="white" 
                                text-anchor="end" 
                                alignment-baseline="middle" 
                                font-size="10"
                            >${(tick.value).toFixed(4)}</text>
                        `).join('')}
                        <text 
                            x="${10}" 
                            y="${svgHeight/2}" 
                            fill="white" 
                            text-anchor="middle" 
                            transform="rotate(-90, 10, ${svgHeight/2})" 
                            font-size="10"
                        >Densidad de Probabilidad</text>
                    </svg>
                </div>
            `;
        
            // Función para hacer las leyendas arrastrables
            function makeDraggable(element, headerSelector) {
                let isDragging = false;
                let currentX;
                let currentY;
                let initialX;
                let initialY;
                let xOffset = 0;
                let yOffset = 0;
        
                const header = element.querySelector(headerSelector);
        
                const dragStart = (e) => {
                    if (e.type === "mousedown") {
                        initialX = e.clientX - xOffset;
                        initialY = e.clientY - yOffset;
                        isDragging = true;
                    }
                };
        
                const dragEnd = () => {
                    isDragging = false;
                };
        
                const drag = (e) => {
                    if (isDragging) {
                        e.preventDefault();
                        currentX = e.clientX - initialX;
                        currentY = e.clientY - initialY;
        
                        xOffset = currentX;
                        yOffset = currentY;
        
                        element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
                    }
                };
        
                header.addEventListener('mousedown', dragStart);
                document.addEventListener('mousemove', drag);
                document.addEventListener('mouseup', dragEnd);
            }
        
            // Agregar leyendas al contenedor
            const cesiumContainer = document.getElementById('cesiumContainer');
            if (cesiumContainer) {
                cesiumContainer.style.position = 'relative';
                cesiumContainer.appendChild(powerLegendContainer);
                cesiumContainer.appendChild(pdfLegendContainer);
        
                makeDraggable(powerLegendContainer, '#powerLegendHeader');
                makeDraggable(pdfLegendContainer, '#pdfLegendHeader');
            }
        
            // Calcular y establecer el porcentaje de puntos dentro de la escala
            const percentageInScale = (Ns / N) * 100;
            setPrecentageInScale(percentageInScale);
        }
/*
        function visualizeHeatmap(positions, values) {
            const heatmapLayer = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
            const minVal = minGlobalVal;
            const maxVal = maxGlobalVal;

            let Ns = 0; // Número de puntos en la escala
            let N = 0;  // Total de puntos excluyendo los valores nulos (blancos)

            positions.forEach((position, i) => {
                const value = values[i];
                let color;

                if (value === null) {
                    color = Cesium.Color.WHITE;
                } else {
                    N++; // Incrementar el contador total excluyendo los valores nulos (blancos)
                    if (value >= sensibilidad_rx) {
                        const normalizedValue = (value - minVal) / (maxVal - minVal);
                        const hue = ( 1 - normalizedValue) * 0.33;//28;//(normalizedValue - 1) * 0.25; // Ajuste para calcular el tono (hue) correctamente
                        color = Cesium.Color.fromHsl(hue, 1, 0.5, 1);
                        Ns++; // Incrementar el contador para los valores dentro de la escala
                    } else {
                        color = Cesium.Color.GRAY; // Azul marino NAVY DARKBLUE
                    }
                }

                heatmapLayer.add({
                    position,
                    color,
                    pixelSize: 16,
                });
            });

            // Calcular el porcentaje
            const percentageInScale = (Ns / N) * 100;
            setPrecentageInScale(percentageInScale);
            // console.log(`Porcentaje de puntos en la escala: ${percentageInScale.toFixed(2)}%`);
        }

*/

        processAllQuadrants().then(() => {

            viewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude, 4000),
                orientation: {
                    heading: Cesium.Math.toRadians(0.0),
                    pitch: Cesium.Math.toRadians(-90.0),
                    roll: 0.0,
                },
            });
            visualizeHeatmap(heatmapPositions, heatmapValues);
            console.log('All quadrants processed');
            console.log('Global Min Value:', minGlobalVal);
            console.log('Global Max Value:', maxGlobalVal);
            setminGlobalValPot(minGlobalVal);
            setmaxGlobalValPot(maxGlobalVal);
        });


    };

    const toggleTable = () => {
        setIsTableExpanded(!isTableExpanded);
    };

    const renderVectorResults = (vectorResults, index) => {
        if (!vectorResults.length) return null;

        // Group results by angle ranges
        const groupedResults = {};
        const angleStep = 45; // Group by 45-degree intervals

        vectorResults.forEach(result => {
            const angleGroup = Math.floor(result.angle / angleStep) * angleStep;
            if (!groupedResults[angleGroup]) {
                groupedResults[angleGroup] = [];
            }
            groupedResults[angleGroup].push(result);
        });

        return (
            <div className="results-container">
                <h2>Resultado del análisis  {index + 1}</h2>
                {
                    vectorAnalysisResultsVisible[index] ?
                        <div className="vector-groups">
                            {Object.entries(groupedResults).map(([angleGroup, results]) => (
                                <div key={angleGroup} className="vector-group">
                                    <h3>{`${angleGroup}° - ${Number(angleGroup) + angleStep}°`}</h3>
                                    <div className="vector-results">
                                        {results.map((result, index) => (
                                            <div key={index} className="result-item">
                                                <span className="result-angle">{result.angle.toFixed(1)}°</span>
                                                <span className="result-value">{result.value.toFixed(4)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        : null
                }

                <button className='show-results-btn' onClick={() => {
                    console.log("vectorAnalysisResultsVisible", vectorAnalysisResultsVisible)
                    let vectorAnalysisResultsVisibleVar = vectorAnalysisResultsVisible;
                    vectorAnalysisResultsVisibleVar[index] = !vectorAnalysisResultsVisible[index];
                    console.log("vectorAnalysisResultsVisibleVar", vectorAnalysisResultsVisibleVar)

                    setVectorAnalysisResultsVisible([...vectorAnalysisResultsVisibleVar])
                }} >
                    {
                        !vectorAnalysisResultsVisible[index] ? "Ver Todos Resultados" : "Esconder Resultados"}
                </button>
            </div>
        );
    };

    return (
        <>
            <Helmet>
                <link
                    href="https://cesium.com/downloads/cesiumjs/releases/1.126/Build/Cesium/Widgets/widgets.css"//1.106
                    rel="stylesheet"
                />
            </Helmet>

            <div>
                <h2 className="text-2xl font-bold text-white mb-6">Imágenes Procesadas</h2>
                {proccessedImages.map((image, index) => ((
                    <div>
                        <div className='images-container-container' key={`image-${index}`}>
                            <div className="images-container">
                                <div className="image-box">
                                    <h2>Imagen Original </h2>
                                    <div className="image-wrapper">
                                        <img src={image.originalImage} alt="Original" />
                                    </div>
                                </div>
                                <div className="image-box">
                                    <h2>Imagen Procesada</h2>
                                    <div className="image-wrapper">
                                        <img src={image.proccessedImage} alt="Procesada" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='gtx-container'>
                            <div className="gtx-text">Ganancia máxima {index + 1}:</div>
                            <input
                                type="number"
                                name="gtxMax"
                                value={gainVector[index].gtxMax}
                                className="styled-input-2"
                                readOnly
                            />
                        </div>
                        {renderVectorResults(image.vectorResults, index)}
                    </div>
                )))}
            </div>

            <NetworkSimulationForm disabled={true} simulationParams={params} />

            <div className="map-container">

            
            <div id="cesiumContainer" className="fullSize" ref={cesiumContainerRef} />
                <div className={`table-container ${isTableExpanded ? 'expanded' : ''}`}>

                    <table className="coordinates-table" ref={coordinatesTableRef}>
                        <thead>
                            <tr>
                                <th>Latitud </th>
                                <th>Longitud </th>
                                <th>Elevación</th>
                                <th>¿Es edificio?</th>
                                <th>Altura edificio</th>
                                <th>Distancia 2D (m)</th>
                                <th>Distancia 3D (m)</th>
                                <th>¿LOS?</th>
                                <th>Pérdida del modelo (dB) </th>
                                <th>Antena </th>
                                <th>Ángulo (°)</th>
                                <th>G_tx (dBi)</th>
                                <th>Potencia (dBm)</th>
                            </tr>
                        </thead>
                        <tbody id="coordinatesTable">
                        </tbody>
                    </table>

                </div>
                <button onClick={toggleTable} className="toggle-button">
                    {isTableExpanded ? 'Ocultar Tabla' : 'Mostrar Tabla'}
                </button>
                <div>
                <div className="space-y-2">
                    <label className="block text-sm text-gray-300">
                        La interpretación de los colores está normalizada con respecto a los valores de potencia máximo y mínimos arrojados en la simulación:
                    </label>
                    
                </div>

                <div className="space-y-2">

                        <li>Los puntos blancos son edificios (no se calcula nada, el modelo es para exteriores).</li>
                        <li>Los puntos grices representan la potencia de recepción menor a la sensibilidad del receptor.</li>
                        <li>Los puntos en la escala de rojo que degrada hacía el verde representan el desvanecimiento de la señal.</li>
                    
                </div>

                <div className="space-y-2">
                        <label className="block text-sm text-gray-300">Potencia mínima en la simulación  (dBm):</label>
                        <input
                            type="number"
                            name="minGlobalValPot"
                            value={minGlobalValPot.toFixed(2)}
                            className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                            readOnly
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm text-gray-300">Potencia máxima en la simulación (dBm):</label>
                        <input
                            type="number"
                            name="maxGlobalValPot"
                            value={maxGlobalValPot.toFixed(2)}
                            className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                            readOnly
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm text-gray-300">Porcentaje de cobertura (%):</label>
                        <input
                            type="number"
                            name="precetnageInScale"
                            value={precentageInScale.toFixed(2)}
                            className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                            readOnly
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default GISMap;