import React from "react";
import { I18NValue } from "@webiny/app-i18n/components";
import { ButtonDefault } from "@webiny/ui/Button";
import { i18n } from "@webiny/app/i18n";
import { Cell, Grid } from "@webiny/ui/Grid";
import { css } from "emotion";

const t = i18n.ns("app-headless-cms/admin/fields/text");

const style = {
    addButton: css({
        textAlign: "center",
        width: "100%"
    })
};

const DynamicListMultipleValues = ({ field, getBind, Label, children }) => {
    const Bind = getBind();
    const FirstFieldBind = getBind(0);

    return (
        <Bind>
            {bindField => {
                const { value, appendValue } = bindField;
                return (
                    <Grid>
                        <Cell span={12}>
                            <Label>
                                <I18NValue value={field.label} />
                            </Label>
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

                        {bindField.value.slice(1).map((item, index) => {
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
                        <Cell span={12} className={style.addButton}>
                            <ButtonDefault
                                disabled={value[0] === undefined}
                                onClick={() => appendValue("")}
                            >{t`+ Add value`}</ButtonDefault>
                        </Cell>
                    </Grid>
                );
            }}
        </Bind>
    );
};

export default DynamicListMultipleValues;
