import { ErrorResponse, Response, ListResponse } from "@webiny/handler-graphql/responses";
import { Context } from "@webiny/handler/types";
import { I18NContext } from "@webiny/api-i18n/types";
import { hasPermission, NotAuthorizedResponse } from "@webiny/api-security";
import { SecurityContext } from "@webiny/api-security/types";
import { pipe } from "@webiny/handler-graphql";
import { hasI18NContentPermission } from "@webiny/api-i18n-content";
import exportFormSubmissions from "./formSubmissionResolvers/exportFormSubmissions";
import createFormSubmission from "./formSubmissionResolvers/createFormSubmission";
import { getBaseFormId } from "./formResolvers/utils/formResolversUtils";
import { FormsCRUD, FormSubmissionsCRUD } from "../../types";
import { hasRwd } from "./formResolvers/utils/formResolversUtils";

type ResolverContext = Context<I18NContext, SecurityContext>;

export default {
    typeDefs: /* GraphQL*/ `
        type FormSubmission {
            id: ID
            data: JSON
            meta: FormMeta
            form: FormSubmissionParentRevision
        }
        
        type FormSubmissionParentRevision {
            parent: Form
            revision: Form
        }
        
        type FormMeta {
            ip: String
            submittedOn: DateTime
        }
        
        # Response types
        type FormSubmissionsListResponse {
            data: [FormSubmission]
            meta: FormListMeta
            error: FormError
        }
        
        type FormSubmissionResponse {
            error: FormError
            data: FormSubmission
        }
        
        type ExportFormSubmissionsFile {
            src: String
            id: ID
        }
        
        type ExportFormSubmissionsResponse {
            error: FormError
            data: ExportFormSubmissionsFile
        }
        
        extend type FormsQuery {
            getFormSubmission(
                id: ID 
                where: JSON
                sort: String
            ): FormSubmissionResponse
            
            listFormSubmissions(
                sort: JSON
                search: String
                where: JSON
                limit: Int
                after: String
                before: String
            ): FormSubmissionsListResponse
        }
        
        extend type FormsMutation {
            # Submits a form
            createFormSubmission(
                id: ID! 
                data: JSON!
                reCaptchaResponseToken: String
                meta: JSON
            ): FormSubmissionResponse
            
             exportFormSubmissions(
                ids: [ID] 
                parent: ID!
                form: ID 
            ): ExportFormSubmissionsResponse
        }
    `,
    resolvers: {
        FormSubmission: {
            form: async (formSubmission, args, context: ResolverContext) => {
                const forms: FormsCRUD = context?.formBuilder?.crud?.forms;

                const formData = await forms.getForm(formSubmission.form.revision);
                const parentData = await forms.getForm(formSubmission.form.revision);

                return {
                    parent: parentData,
                    revision: formData
                };
            }
        },
        FormsQuery: {
            listFormSubmissions: pipe(
                hasPermission("fb.submission"),
                hasI18NContentPermission()
            )(async (_, args, context: ResolverContext) => {
                // If permission has "rwd" property set, but "r" is not part of it, bail.
                const formBuilderFormPermission = await context.security.getPermission(
                    "fb.submission"
                );
                if (formBuilderFormPermission && !hasRwd({ formBuilderFormPermission, rwd: "r" })) {
                    return new NotAuthorizedResponse();
                }

                try {
                    const formSubmission: FormSubmissionsCRUD =
                        context?.formBuilder?.crud?.formSubmission;
                    const forms: FormsCRUD = context?.formBuilder?.crud?.forms;
                    const { where, limit = 10, sort = { savedOn: 1 } } = args;
                    const [SK] = Object.values(sort);

                    // If user can only manage own records, let's check if he owns the loaded one.
                    if (formBuilderFormPermission?.own === true) {
                        const identity = context.security.getIdentity();
                        const form = await forms.getForm(where.form.parent);
                        if (form.createdBy.id !== identity.id) {
                            return new NotAuthorizedResponse();
                        }
                    }

                    const data = await formSubmission.listAllSubmissions({
                        parentFormId: getBaseFormId(where.form.parent),
                        sort: { SK },
                        limit
                    });
                    return new ListResponse(data);
                } catch (err) {
                    return new ErrorResponse(err);
                }
            }),
            getFormSubmission: pipe(
                hasPermission("fb.submission"),
                hasI18NContentPermission()
            )(async (_, args, context: ResolverContext) => {
                // If permission has "rwd" property set, but "r" is not part of it, bail.
                const formBuilderFormPermission = await context.security.getPermission(
                    "fb.submission"
                );
                if (formBuilderFormPermission && !hasRwd({ formBuilderFormPermission, rwd: "r" })) {
                    return new NotAuthorizedResponse();
                }

                try {
                    const formSubmission: FormSubmissionsCRUD =
                        context?.formBuilder?.crud?.formSubmission;
                    const forms: FormsCRUD = context?.formBuilder?.crud?.forms;

                    const { id, where } = args;

                    // If user can only manage own records, let's check if he owns the loaded one.
                    if (formBuilderFormPermission?.own === true) {
                        const identity = context.security.getIdentity();
                        const form = await forms.getForm(where.formId);
                        if (form.createdBy.id !== identity.id) {
                            return new NotAuthorizedResponse();
                        }
                    }

                    const data = await formSubmission.getSubmission({
                        parentFormId: where.formId,
                        submissionId: id
                    });
                    return new Response(data);
                } catch (err) {
                    return new ErrorResponse(err);
                }
            })
        },
        FormsMutation: {
            createFormSubmission,
            // Note: We'll test it manually using admin app.
            exportFormSubmissions: pipe(
                hasPermission("fb.submission"),
                hasI18NContentPermission()
            )(exportFormSubmissions)
        }
    }
};
