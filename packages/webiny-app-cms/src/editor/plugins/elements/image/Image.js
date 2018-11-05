// @flow
import * as React from "react";
import { withFileUpload } from "webiny-app/components";
import { SingleImageUpload } from "webiny-ui/ImageUpload";

const Image = props => {
    return <SingleImageUpload {...props} showRemoveImageButton={false} />;
};

export default withFileUpload()(Image);
