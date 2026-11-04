interface NestedResponse {
    status?: string;
    id?: number;
    msg_success?: string;
    msg?: string;
    names?: string[];
    nodes?: NestedNode[];
    paths?: Record<string, string>;
}

interface NestedNode {
    id: number;
    parent: number | null;
    name: string;
    tag: string;
}

interface NestedBoot {
    url: string;
    mailboxId: number;
    nodes: NestedNode[];
    paths: Record<string, string>;
    nestUnder: string;
    topLevel: string;
    sublabel: string;
    confirm: string;
    deleteLabel: string;
    dragHint: string;
    canEdit: boolean;
    createUrl: string;
    formUrl: string;
    edit: string;
    addFolder: string;
    addSubfolder: string;
    moreSettings: string;
    nameIsTag: string;
    deleteFolder: string;
    folderActions: string;
    folder: string;
}

interface JQueryModal {
    children(): JQueryModal;
    find(selector: string): { click(handler: () => void): void };
    modal(action: string): void;
}

interface AjaxOptions {
    url?: string;
    data?: string | Record<string, unknown>;
    success?: (data: NestedResponse) => void;
}

interface JQueryStatic {
    (selector: string | Element | Document): JQueryCollection;
    ajaxPrefilter(handler: (options: AjaxOptions) => void): void;
}

interface JQueryCollection {
    length: number;
    get(index: number): HTMLElement | undefined;
    each(handler: (this: HTMLElement, index: number) => void): JQueryCollection;
    on(event: string, handler: () => void): JQueryCollection;
    data(key: string): unknown;
}

declare const $: JQueryStatic;
declare function fsAjax(
    data: Record<string, unknown> | string,
    url: string,
    success: (response: NestedResponse) => void,
    noLoader?: boolean,
    error?: () => void
): void;
declare function showAjaxResult(response: NestedResponse): void;
declare function showModalConfirm(
    text: string,
    okClass: string,
    options: { on_show: (modal: JQueryModal) => void },
    okText?: string
): void;
declare function getGlobalAttr(name: string): string;
declare const laroute: { route(name: string): string } | undefined;

interface ModalParams {
    remote?: string;
    title?: string;
    no_footer?: boolean;
    size?: string;
    on_show?: (modal: JQueryCollection) => void;
}

interface Window {
    initNewFolder?: (modal: JQueryCollection) => void;
    initCustomFoldersForm?: (selector: string, action: string) => void;
    nestedtagsStart?: (boot: NestedBoot) => void;
}

declare function showModal(params: ModalParams): void;
