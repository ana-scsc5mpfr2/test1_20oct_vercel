import React, { useState, useRef } from 'react';
import './index.css';
import { AlertCircle, Upload, Loader2 } from 'lucide-react';

const AntenaCalculator = () => {
    const [originalImage, setOriginalImage] = useState(null);
    const [vectorAnalysisResultsVisible, setVectorAnalysisResultsVisible] = useState(false)
    const [processedImage, setProcessedImage] = useState(null);
    const [vectorResults, setVectorResults] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleImageUpload = async (event) => {
        console.log("Hola!")
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
            setError('Please upload a valid image file (JPEG, PNG)');
            setIsLoading(false);
            return;
        }

        try {
            // Convert to base64
            const base64Image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Error reading file'));
                reader.readAsDataURL(file);
            });

            // Validate image dimensions
            const img = new Image();
            img.onload = async () => {
                try {
                    if (img.width > 2024 || img.height > 2024) {
                        throw new Error('Image dimensions must not exceed 2024x2024 pixels');
                    }
                    setOriginalImage(base64Image);
                    await processImage(base64Image);
                } catch (err) {
                    setError(err.message);
                    setIsLoading(false);
                }
            };
            img.onerror = () => {
                setError('Error loading image');
                setIsLoading(false);
            };
            img.src = base64Image;
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const processImage = async (imageData) => {
        try {
           // const response = await fetch('http://127.0.0.1:5000/process-image', {
            const response = await fetch('https://scsc-5-mpfr-2-api.vercel.app/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process image');
            }

            setProcessedImage(data.processed_image);
            setVectorResults(data.vector_results || []);
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
                <h2>Vector Analysis Results</h2>
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

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Image Analysis Tool</h1>
                <p>Upload an image (max 2024x2024px) for vector analysis</p>
            </header>

            <main className="app-main">
                <div className="upload-section">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        className="upload-button"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                <span>Upload Image</span>
                            </>
                        )}
                    </button>
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
                            <h2>Original Image</h2>
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
                            <h2>Processed Image</h2>
                            <div className="image-wrapper">
                                <img src={processedImage} alt="Processed" />
                            </div>
                        </div>
                    )}
                </div>

                {renderVectorResults()}
            </main>
        </div>
    );
}



export default AntenaCalculator
