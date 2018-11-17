// @flow
import * as React from "react";
import { AutoComplete } from "webiny-ui/AutoComplete";
import { withAutoComplete } from "webiny-app/components";
import { compose } from "recompose";
import gql from "graphql-tag";
import { get } from "lodash";

const PagesAutoComplete = props => <AutoComplete {...props} textProp={"title"} />;

export default compose(
    withAutoComplete({
        response: data => get(data, "cms.pages"),
        variables: search => ({ search }),
        query: gql`
            query LoadPages($search: String) {
                cms {
                    pages: listPages(search: $search) {
                        data {
                            id
                            title
                        }
                    }
                }
            }
        `
    })
)(PagesAutoComplete);
