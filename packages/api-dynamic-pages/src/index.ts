import { PagePlugin } from "@webiny/api-page-builder/plugins/PagePlugin";
import { IndexPageDataPlugin } from "@webiny/api-page-builder/plugins/IndexPageDataPlugin";
import { SearchPublishedPagesPlugin } from "@webiny/api-page-builder/plugins/SearchPublishedPagesPlugin";
import { GraphQLSchemaPlugin } from "@webiny/handler-graphql/plugins/GraphQLSchemaPlugin";
import { PbContext } from "@webiny/api-page-builder/graphql/types";
import { DynamicPage } from "./types";
import { loadDynamicPage } from "./loadDynamicPage";
import { interpolateValue } from "./interpolateValue";
import { loadDataSources } from "./loadDataSources";

export default () => [
    new PagePlugin<DynamicPage>({
        // - Store "dynamic" flag into DB if page URL is a pattern
        beforeUpdate({ updateData }) {
            if (updateData.path && updateData.path.includes("{")) {
                updateData.dynamic = true;
            }
        },
        // - Attempt to load dynamic page using patterns
        async notFound({ args, context }) {
            return await loadDynamicPage(args, context);
        }
    }),
    // - Store "dynamic" flag into ES if page URL is a pattern
    new IndexPageDataPlugin<DynamicPage>(({ page, data }) => {
        data.dynamic = page.dynamic;
    }),
    // - Add `dynamic` filter to ES search
    new SearchPublishedPagesPlugin({
        modifyQuery({ query, args }) {
            const { where } = args;

            if (where && where.dynamic) {
                query.filter.push({ term: { dynamic: where.dynamic } });
            }
        }
    }),
    // - Add dataSources settings, and dataSources GQL page field
    new GraphQLSchemaPlugin<PbContext>({
        typeDefs: /* GraphQL */ `
            extend type PbPage {
                dynamic: Boolean
                dataSources: [JSON]
            }

            extend type PbPageListItem {
                dynamic: Boolean
            }

            extend type PbPageSettings {
                dataSources: [JSON]
            }

            extend input PbPageSettingsInput {
                dataSources: [JSON]
            }
        `,
        resolvers: {
            // - Add `Page.title` field resolver to interpolate title pattern
            PbPage: {
                title(page: DynamicPage) {
                    if (
                        page.dynamic &&
                        page.title.includes("{") &&
                        Array.isArray(page.dataSources)
                    ) {
                        const [ds] = page.title.substring(1, page.title.length - 1).split(".");
                        const dataSource = page.dataSources.find(d => d.id === ds);

                        if (dataSource) {
                            return interpolateValue(page.title, dataSource.data);
                        }
                    }

                    return page.title;
                },
                dataSources(page, args, context) {
                    if (page.dataSources) {
                        return page.dataSources;
                    }

                    // Load preview data
                    return loadDataSources(page.settings.dataSources || [], {}, context);
                }
            }
        }
    })
];
