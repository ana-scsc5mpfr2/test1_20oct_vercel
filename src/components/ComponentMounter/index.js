import AntenaCalculator from "../AntenaCalculator"


const ComponentMounter = ({ name }) => {
    if (name == "AntenaCalculator") {
        return <AntenaCalculator />
    } else {
        return <></>
    }
}


export default ComponentMounter;