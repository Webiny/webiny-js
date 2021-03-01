import React from "react";
import { css } from "emotion";
import { i18n } from "@webiny/app/i18n";
import { Cell, Grid } from "@webiny/ui/Grid";
import { ButtonDefault } from "@webiny/ui/Button";
import { CmsEditorField } from "../../../types";
import { FormElementMessage } from "@webiny/ui/FormElementMessage";

const t = i18n.ns("app-headless-cms/admin/fields/text");

const style = {
    addButton: css({
        textAlign: "center",
        width: "100%"
    })
};

type Props = {
    field: CmsEditorField;
    getBind(index?: number): React.ComponentType<any>;
    Label: React.ComponentType<any>;
    children: (params: any) => React.ReactNode;
    emptyValue?: any;
};

const DynamicSection = ({ field, getBind, Label, children, emptyValue = "" }: Props) => {
    const Bind = getBind();
    const FirstFieldBind = getBind(0);

    return (
        <Bind>
            {bindField => {
                const { value, appendValue } = bindField;

                const bindFieldValue = value || [];
                return (
                    <Grid>
                        <Cell span={12}>
                            {field.label && <Label>{field.label}</Label>}
                            <FirstFieldBind>
                                {bindIndex =>
                                    children({
                                        field,
                                        bind: { index: bindIndex, field: bindField },
                                        index: 0
                                    })
                                }
                            </FirstFieldBind>
                        </Cell>

                        {bindFieldValue.slice(1).map((item, index) => {
                            const realIndex = index + 1;
                            const BindField = getBind(realIndex);
                            return (
                                <Cell span={12} key={realIndex}>
                                    <BindField>
                                        {bindIndex =>
                                            children({
                                                field,
                                                bind: { index: bindIndex, field: bindField },
                                                index: realIndex
                                            })
                                        }
                                    </BindField>
                                </Cell>
                            );
                        })}

                        {bindField.validation.isValid === false && (
                            <Cell span={12}>
                                <FormElementMessage error>
                                    {bindField.validation.message}
                                </FormElementMessage>
                            </Cell>
                        )}
                        <Cell span={12} className={style.addButton}>
                            <ButtonDefault
                                disabled={bindFieldValue[0] === undefined}
                                onClick={() => appendValue(emptyValue)}
                            >{t`+ Add value`}</ButtonDefault>
                        </Cell>
                    </Grid>
                );
            }}
        </Bind>
    );
};

export default DynamicSection;
