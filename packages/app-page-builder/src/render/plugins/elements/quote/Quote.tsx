import React from "react";
import { PbElement } from "../../../../types";
import Text from "../../../components/Text";

type TextPropsType = {
    element: PbElement;
};
const Quote: React.FunctionComponent<TextPropsType> = ({ element }) => {
    return (
        <Text
            element={element}
            rootClassName={"webiny-pb-base-page-element-style webiny-pb-page-element-text"}
        />
    );
};

export default Quote;
