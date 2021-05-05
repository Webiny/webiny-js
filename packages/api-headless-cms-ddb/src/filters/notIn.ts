import { CmsFieldValueFilterPlugin } from "../types";

export default (): CmsFieldValueFilterPlugin<string, string[]> => ({
    type: "cms-field-value-filter",
    name: "cms-field-value-filter-not-in",
    operation: "not_in",
    matches: ({ inputValue, compareValue }) => {
        return compareValue.includes(inputValue) === false;
    }
});
