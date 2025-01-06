import React, { useState } from 'react';
import AntenaCalculator from "../AntenaCalculator";
import GISMap from "../GISMap";
import NetworkSimulationForm from "../NetworkSimulationForm";

const ComponentMounter = ({ name, gainVector, setGainVector, setProccesedImages, proccessedImages }) => {
  const [simulationParams, setSimulationParams] = useState(null);

  const handleStartSimulation = (formData) => {
    setSimulationParams(formData);
  };

  if (name === "AntenaCalculator") {
    return <AntenaCalculator gainVector={gainVector} setGainVector={setGainVector} setProccesedImages={setProccesedImages} proccessedImages={proccessedImages} />;
  } else if (name === "NetworkSimultionForm") {
    return (
      <NetworkSimulationForm simulationParams={simulationParams} onStartSimulation={handleStartSimulation} />
    );
  } else if (name === "GISMap") {
    return (
      <GISMap gainVector={gainVector} params={simulationParams} proccessedImages={proccessedImages} />
    );
  } else {
    return <></>;
  }
};

export default ComponentMounter;

/*import AntenaCalculator from "../AntenaCalculator"
import GISMap from "../GISMap"


const ComponentMounter = ({ name, gainVector, setGainVector }) => {
    if (name === "AntenaCalculator") {
        return <AntenaCalculator setGainVector={setGainVector} />
    } else if (name === "GISMap") {
        return <GISMap gainVector={gainVector} />
    } else {
        return <></>
    }
}


export default ComponentMounter;*/