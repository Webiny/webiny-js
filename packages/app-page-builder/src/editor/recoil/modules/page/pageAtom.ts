import { atom } from "recoil";

type PageCategoryType = {
    slug: string;
    name: string;
    url: string;
};

export type PageAtomType = {
    id?: string;
    title?: string;
    path?: string;
    settings?: {
        general?: {
            layout?: string;
        };
    };
    parent?: string;
    version: number;
    locked: boolean;
    published: boolean;
    savedOn?: Date;
    snippet: string | null;
    category?: PageCategoryType;
    createdBy: {
        id: string;
    };
};

export const pageAtom = atom<PageAtomType>({
    key: "pageAtom",
    default: {
        locked: false,
        version: 1,
        published: false,
        snippet: null,
        createdBy: {
            id: null
        }
    }
});
