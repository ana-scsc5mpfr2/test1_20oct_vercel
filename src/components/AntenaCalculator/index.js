import React, { useState, useRef } from 'react';
import './index.css';
import { AlertCircle, Upload, Loader2 } from 'lucide-react';
import { defaultVector, defaultOriginalImage, defaultProccessedImage } from './constants';

const AntenaCalculator = ({ gainVector, setGainVector, setProccesedImages, proccessedImages }) => {
    const [originalImage, setOriginalImage] = useState(null);
    const [vectorAnalysisResultsVisible, setVectorAnalysisResultsVisible] = useState(false)
    const [processedImage, setProcessedImage] = useState(null);
    const [vectorResults, setVectorResults] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uvValue, setUvValue] = useState(null);
    const [ncValue, setNcValue] = useState(null);
    const [gtxMaxValue, setGtxMaxValue] = useState(null);
    const [hideUploadButton2, setHideUploadButton2] = useState(true);
    const fileInputRef = useRef(null);

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Reset states
        setError(null);
        setProcessedImage(null);
        setVectorResults([]);
        setIsLoading(true);

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setError('Cargue un archivo de imagen válido (JPEG, PNG)');
            setIsLoading(false);
            return;
        }

        try {
            // Convert to base64
            const base64Image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Error leyendo la imagen'));
                reader.readAsDataURL(file);
            });
            console.log('Base64 Image:', base64Image);

            // Validate image dimensions
            const img = new Image();
            img.onload = async () => {
                try {
                    if (img.width > 2024 || img.height > 2024) {
                        throw new Error('Las dimensiones de la imagen no deben exceder los 2024x2024 píxeles.');
                    }
                    setOriginalImage(base64Image);
                    await processImage(base64Image);
                } catch (err) {
                    setError(err.message);
                    setIsLoading(false);
                }
            };
            img.onerror = () => {
                setError('Error cargando la imagen');
                setIsLoading(false);
            };
            img.src = base64Image;
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };


    const onFileUploadClick = (e) => {
        e.target.value = ""
    }

    const processImage = async (imageData) => {
        try {
            // const response = await fetch('http://127.0.0.1:5000/process-image', {
            const response = await fetch('https://scsc-5-mpfr-2-api.vercel.app/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData, uv: uvValue, nc: ncValue }),
            });


            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fallo el proceso de carga de la imagen');
            }

            setProcessedImage(data.processed_image);
            setProccesedImages([...proccessedImages, { originalImage: imageData, proccessedImage: data.processed_image, vectorResults: data.vector_results || [] }]);
            setVectorResults(data.vector_results || []);
            setGainVector(gainVector.length > 0 ? [gainVector[0], { gain_Vector: data.vector_results, gtxMax: gtxMaxValue }] : [{ gain_Vector: data.vector_results, gtxMax: gtxMaxValue }]);
            if (proccessedImages.length === 0) setHideUploadButton2(false)
        } catch (err) {
            setError(err.message);
            setProcessedImage(null);
            setVectorResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderVectorResults = () => {
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
                <h2>Resultado del análisis </h2>
                {
                    vectorAnalysisResultsVisible ?
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
                    setVectorAnalysisResultsVisible(!vectorAnalysisResultsVisible)
                }} >
                    {
                        !vectorAnalysisResultsVisible ? "Ver Todos Resultados" : "Esconder Resultados"}
                </button>
            </div>
        );
    };

    const handleUVChange = (e) => {
        setUvValue(e.target.value);
    };

    const handleNcChange = (e) => {
        setNcValue(e.target.value);
    }

    const handleGTXMaxChange = (e) => {
        setGtxMaxValue(e.target.value);
    };

    const resetVlauesForImage2 = () => {
        // Reset states
        setError(null);
        setProcessedImage(null);
        setVectorResults([]);
        setIsLoading(false);
        setOriginalImage(null);
        setVectorAnalysisResultsVisible(false);
        setHideUploadButton2(true);
    }


    const setDefaultImage = () => {
        setUvValue(15);
        setNcValue(5);
        setGtxMaxValue(7.89);
        setOriginalImage(defaultOriginalImage);
        setProcessedImage(defaultProccessedImage);
        setProccesedImages([...proccessedImages, { originalImage: defaultOriginalImage, proccessedImage: defaultProccessedImage, vectorResults: defaultVector || [] }]);
        setVectorResults(defaultVector || []);
        setGainVector(gainVector.length > 0 ? [gainVector[0], { gain_Vector: defaultVector, gtxMax: 7.89 }] : [{ gain_Vector: defaultVector, gtxMax: 7.89 }]);
    }


    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Herramienta de análisis de imágenes</h1>
                <p>Carga una imagen (max 2024x2024px)del patrón normalizado de ganancia de la antena en el eje transversal xy para procesar sus pérdidas</p>
            </header>

            <main className="app-main">

                <div className="upload-section">
                    <div className="space-y-2">
                        <label className="block text-sm text-gray-300">Ingresar Valor Mínimo (sin signo):</label>
                        <input
                            type="number"
                            value={uvValue}
                            onChange={handleUVChange}
                            placeholder="UV"
                            className="styled-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm text-gray-300">Ingresar Número de Círculos :</label>
                        <input
                            type="number"
                            value={ncValue}
                            onChange={handleNcChange}
                            placeholder="Nc"
                            className="styled-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm text-gray-300">Ingresar GTX Máximo (dBi):</label>
                        <input
                            type="number"
                            value={gtxMaxValue}
                            onChange={handleGTXMaxChange}
                            placeholder="GTX Max"
                            className="styled-input"
                        />
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        onClick={onFileUploadClick}
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                    />

                    {
                        proccessedImages.length == 2 ?
                            null :
                            <button
                                onClick={() => fileInputRef.current.click()}
                                className="upload-button default-image-button"
                                disabled={isLoading || uvValue === null || gtxMaxValue === null || !hideUploadButton2}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={20} />
                                        <span>Cargar Imagen</span>
                                    </>
                                )}
                            </button>
                    }

                    <br></br>
                    {gainVector.length > 0 && !hideUploadButton2 && proccessedImages.length !== 2 ? <button className='upload-button default-image-button' onClick={resetVlauesForImage2} > <Upload size={20} /> <span>Cargar Imagen 2</span></button> : null}
                    <div>
                        Contador de Imagenes procesadas: {proccessedImages.length}
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        <AlertCircle />
                        <span>{error}</span>
                    </div>
                )}

                <div className="images-container">
                    {originalImage && (
                        <div className="image-box">
                            <h2>Imagen Original </h2>
                            <div className="image-wrapper">
                                <img src={originalImage} alt="Original" />
                                {isLoading && (
                                    <div className="loading-overlay">
                                        <Loader2 className="loading-spinner animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {processedImage && (
                        <div className="image-box">
                            <h2>Imagen Procesada</h2>
                            <div className="image-wrapper">
                                <img src={processedImage} alt="Processed" />
                            </div>
                        </div>
                    )}

                </div>

                {renderVectorResults()}
            </main>
            <div className="default-images-title-text">Haga clic en el botón para elegir la imagen predeterminada. Al hacer clic dos veces, ambas antenas serán las predeterminadas:</div>
            <div className="images-container">
                {defaultOriginalImage && (
                    <div className="image-box">
                        <h2>Imagen Original por Default </h2>
                        <div className="image-wrapper">
                            <img src={defaultOriginalImage} alt="Original" />
                        </div>
                    </div>
                )}

                {defaultProccessedImage && (
                    <div className="image-box">
                        <h2>Imagen procesada por Default</h2>
                        <div className="image-wrapper">
                            <img src={defaultProccessedImage} alt="Processed" />
                        </div>
                    </div>
                )}

            </div>
            {
                proccessedImages.length == 2 ?
                    null :
                    <div className='default-image-button-container'>
                        <button
                            onClick={() => { setDefaultImage() }}
                            className="upload-button default-image-button"
                        >

                            <>
                                <span> Patrón de ganancia por Default </span>
                            </>
                        </button>
                    </div>
            }

        </div>
    );
}



export default AntenaCalculator
