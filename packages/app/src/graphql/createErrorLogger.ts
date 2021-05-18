import { onError } from "apollo-link-error";
import { print } from "graphql/language";
import createOverlay from "./errorOverlay";
import { boolean } from "boolean";

export default () => {
    return onError(({ networkError, operation }) => {
        const debug = boolean(process.env.REACT_APP_DEBUG);

        if (networkError && debug) {
            createOverlay({ query: print(operation.query), networkError });
        }
    });
};
