import { css } from "emotion";

export const fieldsWrapperStyle = css`
    border-left: 2px solid var(--mdc-theme-on-background);
    padding-left: 16px;

    &:focus-within {
        border-color: var(--mdc-theme-primary);
    }
`;

export const dynamicSectionTitleStyle = css`
    margin-top: 24px;
`;

export const dynamicSectionGridStyle = css`
    & > .mdc-layout-grid__inner {
        grid-gap: 8px;
    }
`;

export const fieldsGridStyle = css`
    &.mdc-layout-grid {
        padding: 8px;
    }
`;
