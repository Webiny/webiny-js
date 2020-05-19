import { pipe, onGet, fields, withFields, withProps } from "@webiny/commodo";
import { validation } from "@webiny/validation";
import { Context as CommodoContext } from "@webiny/api-plugin-commodo-db-proxy/types";
import { Context as I18NContext } from "@webiny/api-i18n/types";
import isEqual from "fast-deep-equal";

const getRawData = value => {
    return { values: value.values.map(v => ({ locale: v.locale, value: v.value })) };
};

export type I18NField = {
    field: any;
    context: CommodoContext & I18NContext;
    [key: string]: any;
};

export const getI18NValues = (value: { [key: string]: any }[], i18n: I18NContext["i18n"]) => {
    // Let's make current locale's value the first element of the array.
    if (value.length < 2) {
        return value;
    }

    const currentLocale = i18n.getLocale();
    const currentLocaleItemIndex = value.findIndex(item => item.locale === currentLocale.id);

    const output = [...value];
    const [currentLocaleItem] = output.splice(currentLocaleItemIndex, 1);

    output.unshift(currentLocaleItem);

    return output;
};

export const i18nField = ({ field, context: { i18n, commodo }, ...rest }: I18NField) => {
    const { id } = commodo.fields;

    const i18nFields = fields({
        ...rest,
        value: {},
        instanceOf: pipe(
            withFields({
                values: onGet(value => getI18NValues(value, i18n))(
                    fields({
                        list: true,
                        value: [],
                        instanceOf: withFields({
                            locale: id({ validation: validation.create("required") }),
                            value: field
                        })()
                    })
                )
            }),
            withProps({
                value(code: string) {
                    let locale;
                    if (code) {
                        locale = i18n.getLocales().find(l => l.code === code);
                    }

                    if (!locale) {
                        locale = i18n.getLocale();
                    }

                    const value = this.values.find(value => value.locale === locale.id);
                    return value ? value.value : undefined;
                }
            })
        )()
    });

    return withProps(instance => {
        return {
            isDirty() {
                return this.state.dirty;
            },
            isDifferentFrom(newValue) {
                if (newValue === null || instance.current === null) {
                    return true;
                }

                return !isEqual(getRawData(instance.current), getRawData(newValue));
            }
        };
    })(i18nFields);
};
