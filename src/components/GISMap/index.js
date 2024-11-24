import React, { useEffect, useRef, useState } from 'react';
import { useScript } from "@uidotdev/usehooks";
import { Helmet } from "react-helmet";
import './index.css';

const centerLongitude = -99.166110;
const centerLatitude = 19.426450;
const radius = 0.007;

const GISMap = () => {
    const cesiumContainerRef = useRef(null);
    const coordinatesTableRef = useRef(null);

    const status = useScript(
        "https://cesium.com/downloads/cesiumjs/releases/1.71/Build/Cesium/Cesium.js",
        {
            removeOnUnmount: true,
        }
    );

    useEffect(() => {
        // Ensure Cesium script has been loaded
        if (status === "ready" && window.Cesium) {
            console.log("Windwon", window.Cesium)


            console.log(cesiumContainerRef)


            var Cesium = window.Cesium;
            Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZTAxYzI1NC1kNzg2LTQ5MTMtOTA4OC1kZTAzOWI4MmQ3MWIiLCJpZCI6MTk5NjExLCJpYXQiOjE3MDk1ODI5MTN9.kOkKk6-5jk-hBgh8sgVJO6LoecybmC6K72fuP9sE0Bc';


            const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
                terrainProvider: new Cesium.CesiumTerrainProvider({
                    url: Cesium.IonResource.fromAssetId(1),
                }),
                scene3DOnly: true,
                selectionIndicator: false,
                baseLayerPicker: false,
            });

            viewer.scene.primitives.add(Cesium.createOsmBuildings({
                style: new Cesium.Cesium3DTileStyle({
                    defines: {
                        distance: `distance(vec2(\${feature['cesium#longitude']}, \${feature['cesium#latitude']}), vec2(${centerLongitude}, ${centerLatitude}))`,
                    },
                    color: {
                        conditions: [
                            [`\${distance} < ${radius}`, "color('rgba(255, 0, 255, 0.5)')"],
                            [true, "color('white')"],
                        ],
                    },
                })
            }));

            // Añadir cuadrado amarillo en el suelo
            viewer.entities.add({
                polygon: {
                    hierarchy: Cesium.Cartesian3.fromDegreesArray([
                        centerLongitude - radius, centerLatitude + radius,
                        centerLongitude + radius, centerLatitude + radius,
                        centerLongitude + radius, centerLatitude - radius,
                        centerLongitude - radius, centerLatitude - radius
                    ]),
                    material: Cesium.Color.YELLOW.withAlpha(0.5)
                }
            });

            let blueBoxPosition;
            let gridEntities = [];

            calculateTerrainHeight(Cesium.Cartographic.fromDegrees(centerLongitude, centerLatitude), function (terrainHeight) {
                const boxHeight = 150;
                blueBoxPosition = Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude, terrainHeight + boxHeight);
                viewer.entities.add({
                    position: blueBoxPosition,
                    box: {
                        dimensions: new Cesium.Cartesian3(1, 1, 0.5),
                        material: Cesium.Color.BLUE.withAlpha(0.5),
                    }
                });
                createBlueGrid(0.00009);
            });

            // Calcular la altura del terreno en una posición específica
            function calculateTerrainHeight(cartographicPosition, callback) {
                const terrainProvider = viewer.terrainProvider;
                Cesium.sampleTerrainMostDetailed(terrainProvider, [cartographicPosition]).then(function (updatedPositions) {
                    callback(updatedPositions[0].height);
                });
            }

            // Crear la malla y los puntos rojos con cálculo de distancias
            function createBlueGrid(spacing) {
                for (let i = 0; i < gridEntities.length; i++) {
                    viewer.entities.remove(gridEntities[i]);
                }
                gridEntities = [];

                const positions = [];
                for (let lon = centerLongitude - radius; lon <= centerLongitude + radius; lon += spacing) {
                    for (let lat = centerLatitude - radius; lat <= centerLatitude + radius; lat += spacing) {
                        positions.push(Cesium.Cartographic.fromDegrees(lon + spacing / 2, lat + spacing / 2));
                    }
                }

                getTerrainHeights(positions, function (updatedPositions) {
                    updatedPositions.forEach((pos, i) => {
                        const pointPosition3D = Cesium.Cartesian3.fromRadians(pos.longitude, pos.latitude, pos.height);

                        const blueBoxPosition2D = Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude, pos.height);
                        const distance2D = Cesium.Cartesian3.distance(blueBoxPosition2D, pointPosition3D);
                        const distance3D = Cesium.Cartesian3.distance(blueBoxPosition, pointPosition3D);

                        checkLineOfSight(blueBoxPosition, pointPosition3D, function (hasLineOfSight) {
                            const point = viewer.entities.add({
                                position: pointPosition3D,
                                point: {
                                    pixelSize: 10,
                                    color: Cesium.Color.RED,
                                    outlineColor: Cesium.Color.BLACK,
                                    outlineWidth: 2
                                }
                            });
                            gridEntities.push(point);

                            const row = document.createElement("tr");
                            row.innerHTML = `
                                <td>${Cesium.Math.toDegrees(pos.latitude).toFixed(6)}</td>
                                <td>${Cesium.Math.toDegrees(pos.longitude).toFixed(6)}</td>
                                <td>${pos.height.toFixed(2)}</td>
                                <td>${distance2D.toFixed(2)}</td>
                                <td>${distance3D.toFixed(2)}</td>
                                <td>${hasLineOfSight ? 1 : 0}</td>
                            `;
                            // coordinatesTableRef.current.appendChild(row);
                            console.log(" coordinatesTableRef.current.appendChild(row);")

                            viewer.entities.add({
                                polyline: {
                                    positions: [blueBoxPosition, pointPosition3D],
                                    width: 2,
                                    material: hasLineOfSight ? Cesium.Color.GREEN.withAlpha(0.5) : Cesium.Color.RED.withAlpha(0.5)
                                }
                            });
                        });
                    });
                });
            }

            function checkLineOfSight(start, end, callback) {
                const direction = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(end, start, new Cesium.Cartesian3()), new Cesium.Cartesian3());
                const distance = Cesium.Cartesian3.distance(start, end);

                const samples = [];
                for (let i = 0; i <= distance; i += 10) {
                    const offset = Cesium.Cartesian3.multiplyByScalar(direction, i, new Cesium.Cartesian3());
                    const samplePoint = Cesium.Cartesian3.add(start, offset, new Cesium.Cartesian3());
                    samples.push(Cesium.Cartographic.fromCartesian(samplePoint));
                }

                Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, samples).then(function (heights) {
                    let hasLineOfSight = true;
                    for (let j = 0; j < heights.length; j++) {
                        const cartHeight = heights[j].height;
                        const cartPosition = Cesium.Cartographic.toCartesian(heights[j]);
                        if (Cesium.Cartesian3.distance(cartPosition, start) < distance && cartHeight > start.height) {
                            hasLineOfSight = false;
                            break;
                        }
                    }
                    callback(hasLineOfSight);
                });
            }

            function getTerrainHeights(positions, callback) {
                const terrainProvider = viewer.terrainProvider;
                Cesium.sampleTerrainMostDetailed(terrainProvider, positions).then(function (updatedPositions) {
                    callback(updatedPositions);
                });
            }

            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude, 1000),
                orientation: {
                    heading: Cesium.Math.toRadians(360.0),
                    pitch: Cesium.Math.toRadians(-10.0)
                }
            });
        }
    }, [status])

    return (
        <div className="app-container">
            <Helmet>
                <link
                    href="https://cesium.com/downloads/cesiumjs/releases/1.71/Build/Cesium/Widgets/widgets.css"
                    rel="stylesheet"
                />
            </Helmet>
            <div id="cesiumContainer" ref={cesiumContainerRef}></div>
            <div id="coordinates">
                <p>Coordenadas centrales:</p>
                <table>
                    <thead>
                        <tr>
                            <th>Latitud</th>
                            <th>Longitud</th>
                            <th>Altura</th>
                            <th>Distancia 2D (m)</th>
                            <th>Distancia 3D (m)</th>
                            <th>Línea de Vista</th>
                        </tr>
                    </thead>
                    {/* <tbody id="coordinatesTable" ref={coordinatesTableRef}>
                    </tbody> */}
                </table>
            </div>
        </div>
    );
}



export default GISMap