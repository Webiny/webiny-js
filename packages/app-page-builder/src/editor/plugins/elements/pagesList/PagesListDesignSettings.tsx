import * as React from "react";
import { plugins } from "@webiny/plugins";
import { validation } from "@webiny/validation";
import { PbPageElementPagesListComponentPlugin } from "@webiny/app-page-builder/types";
import Accordion from "../../elementSettings/components/Accordion";
import Wrapper from "../../elementSettings/components/Wrapper";
import InputField from "../../elementSettings/components/InputField";
import SelectField from "../../elementSettings/components/SelectField";
import {
    ButtonContainer,
    classes,
    SimpleButton
} from "../../elementSettings/components/StyledComponents";
import { Cell, Grid } from "@webiny/ui/Grid";

const PagesListDesignSettings = ({ Bind, submit }) => {
    const components = plugins.byType<PbPageElementPagesListComponentPlugin>(
        "pb-page-element-pages-list-component"
    );

    return (
        <Accordion title={"Design"} defaultValue={true}>
            <React.Fragment>
                <Wrapper
                    label={"Component"}
                    containerClassName={classes.simpleGrid}
                    leftCellSpan={5}
                    rightCellSpan={7}
                >
                    <Bind
                        name={"component"}
                        defaultValue={components[0] ? components[0].componentName : null}
                    >
                        {({ value, onChange }) => (
                            <SelectField
                                value={value}
                                onChange={onChange}
                                description={"Select a component to render the list"}
                            >
                                {components.map(cmp => (
                                    <option key={cmp.name} value={cmp.componentName}>
                                        {cmp.title}
                                    </option>
                                ))}
                            </SelectField>
                        )}
                    </Bind>
                </Wrapper>
                <Wrapper
                    label={"Results per page"}
                    containerClassName={classes.simpleGrid}
                    leftCellSpan={5}
                    rightCellSpan={7}
                >
                    <Bind name={"resultsPerPage"} validators={validation.create("numeric")}>
                        <InputField />
                    </Bind>
                </Wrapper>
                <Grid className={classes.simpleGrid}>
                    <Cell span={12}>
                        <ButtonContainer>
                            <SimpleButton onClick={submit}>Save</SimpleButton>
                        </ButtonContainer>
                    </Cell>
                </Grid>
            </React.Fragment>
        </Accordion>
    );
};

export default PagesListDesignSettings;
