import AntenaCalculator from "../AntenaCalculator"
import GISMap from "../GISMap"


const ComponentMounter = ({ name }) => {
    if (name === "AntenaCalculator") {
        return <AntenaCalculator />
    } else if (name === "GISMap") {
        return <GISMap />
    } else {
        return <></>
    }
}


export default ComponentMounter;