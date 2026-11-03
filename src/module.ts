/**
 * NestedTags browser surface. Compiled to Public/js/module.js.
 */
let boot: NestedBoot | null = null;
let nodes: NestedNode[] = [];
let paths: Record<string, string> = {};
let pendingParent = '';
let fromSublabel = false;

function nestedtagsStart(config: NestedBoot): void {
    boot = config;
    nodes = config.nodes || [];
    paths = config.paths || {};
    bindDelete();
    bindSave();
    bindNewFolder();
    paint();
    if (!nodes.length) {
        loadTree(mailboxId(), paint);
    }
}

function mailboxId(): number {
    if (boot && boot.mailboxId) {
        return boot.mailboxId;
    }
    const raw = getGlobalAttr('mailbox_id');
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
}

function loadTree(id: number, done: () => void): void {
    if (!boot || !id) {
        done();
        return;
    }
    fsAjax({ action: 'tree', mailbox_id: id }, boot.url, function (response) {
        if (response && response.nodes) {
            nodes = response.nodes;
        }
        if (response && response.paths) {
            paths = response.paths;
        }
        done();
    }, true, done);
}

function fieldsOf(data: string | Record<string, unknown> | undefined): Record<string, string> {
    const out: Record<string, string> = {};
    if (typeof data === 'string') {
        const params = new URLSearchParams(data);
        params.forEach(function (value, key) {
            out[key] = value;
        });
        return out;
    }
    if (data) {
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                if (typeof value === 'string' || typeof value === 'number') {
                    out[key] = String(value);
                }
            }
        }
    }
    return out;
}

function bindSave(): void {
    $.ajaxPrefilter(function (options) {
        if (!boot || !options.url || options.url.indexOf('custom-folders/ajax') === -1) {
            return;
        }
        const fields = fieldsOf(options.data);
        if (fields.action !== 'create' && fields.action !== 'update') {
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(fields, 'parent_folder_id')) {
            return;
        }
        const previous = options.success;
        options.success = function (data) {
            const finish = function () {
                if (previous) {
                    previous(data);
                }
            };
            const id = data && data.id ? Number(data.id) : 0;
            if (!id || !boot) {
                finish();
                return;
            }
            fsAjax({
                action: 'set_parent',
                mailbox_id: fields.mailbox_id || mailboxId(),
                folder_id: id,
                parent_folder_id: fields.parent_folder_id
            }, boot.url, finish, true, finish);
        };
    });
}

function bindDelete(): void {
    document.addEventListener('click', function (event) {
        const target = event.target as Element | null;
        if (!target || !target.closest) {
            return;
        }
        const button = target.closest('.folder-delete-trigger') as HTMLElement | null;
        if (!button || !boot) {
            return;
        }
        if (button.getAttribute('data-nestedtags-pass') === '1') {
            button.removeAttribute('data-nestedtags-pass');
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        const id = button.getAttribute('data-folder_id') || '';
        fsAjax({
            action: 'child_names',
            folder_id: id,
            mailbox_id: mailboxId()
        }, boot.url, function (response) {
            const names = response && response.names ? response.names : [];
            if (!names.length) {
                button.setAttribute('data-nestedtags-pass', '1');
                button.click();
                return;
            }
            const lines = names.map(escapeHtml).join('<br>');
            const confirmText = (boot ? boot.confirm : '') + '<br>' + lines;
            const deleteLabel = boot ? boot.deleteLabel : 'Delete';
            showModalConfirm(confirmText, 'nestedtags-delete-ok', {
                on_show: function (modal) {
                    modal.children().find('.nestedtags-delete-ok:first').click(function () {
                        modal.modal('hide');
                        if (!boot) {
                            return;
                        }
                        const foldersUrl = typeof laroute !== 'undefined' ? laroute.route('mailboxes.custom_folders.ajax') : '';
                        fsAjax({
                            action: 'delete_children',
                            folder_id: id,
                            mailbox_id: mailboxId()
                        }, boot.url, function (result) {
                            if (!result || typeof result.msg_success === 'undefined' || !foldersUrl) {
                                showAjaxResult(result);
                                return;
                            }
                            fsAjax({
                                action: 'delete',
                                folder_id: id
                            }, foldersUrl, function (deleted) {
                                showAjaxResult(deleted);
                                if (deleted && typeof deleted.msg_success !== 'undefined') {
                                    const row = document.getElementById('folder-' + id);
                                    if (row && row.parentNode) {
                                        row.parentNode.removeChild(row);
                                    }
                                }
                            }, true);
                        }, true);
                    });
                }
            }, deleteLabel);
        }, true);
    }, true);
}

function bindNewFolder(): void {
    const original = window.initNewFolder;
    window.initNewFolder = function (modal) {
        if (original) {
            original(modal);
        }
        const preset = pendingParent;
        pendingParent = '';
        const root = modal && modal.length ? modal.get(0) : document;
        injectParents(root || document, preset);
    };
    document.addEventListener('click', function (event) {
        const target = event.target as Element | null;
        if (!target || !target.closest) {
            return;
        }
        const opener = target.closest('a[data-modal-on-show="initNewFolder"]');
        if (!opener) {
            return;
        }
        if (!fromSublabel) {
            pendingParent = '';
        }
        fromSublabel = false;
    }, true);
}

function injectParents(root: Document | HTMLElement, preset: string): void {
    if (!boot) {
        return;
    }
    const forms = root.querySelectorAll('.custom-folders-form, .new-folder-form');
    for (let i = 0; i < forms.length; i++) {
        const form = forms[i] as HTMLElement;
        if (form.querySelector('[name="parent_folder_id"]')) {
            continue;
        }
        const selfId = form.getAttribute('data-folder_id') || '';
        const wrap = document.createElement('div');
        wrap.className = 'form-group';
        const label = document.createElement('label');
        label.textContent = boot.nestUnder;
        const select = document.createElement('select');
        select.name = 'parent_folder_id';
        select.className = 'form-control';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = boot.topLevel;
        select.appendChild(empty);
        const blocked = blockedIds(selfId);
        for (let n = 0; n < nodes.length; n++) {
            const node = nodes[n];
            if (blocked[node.id]) {
                continue;
            }
            const option = document.createElement('option');
            option.value = String(node.id);
            option.textContent = indent(depthOf(node.id)) + node.name;
            if (preset && String(node.id) === preset) {
                option.selected = true;
            }
            select.appendChild(option);
        }
        wrap.appendChild(label);
        wrap.appendChild(select);
        form.insertBefore(wrap, form.firstChild);
    }
    addSublabelLinks();
    paintPicker();
}

function blockedIds(selfId: string): Record<number, boolean> {
    const blocked: Record<number, boolean> = {};
    const self = parseInt(selfId, 10);
    if (!self) {
        return blocked;
    }
    blocked[self] = true;
    let grew = true;
    while (grew) {
        grew = false;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.parent && blocked[node.parent] && !blocked[node.id]) {
                blocked[node.id] = true;
                grew = true;
            }
        }
    }
    return blocked;
}

function depthOf(id: number): number {
    let depth = 0;
    let cursor: number | null = id;
    const seen: Record<number, boolean> = {};
    while (cursor && !seen[cursor]) {
        seen[cursor] = true;
        let parent: number | null = null;
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === cursor) {
                parent = nodes[i].parent;
                break;
            }
        }
        if (!parent) {
            break;
        }
        depth++;
        cursor = parent;
    }
    return depth;
}

function indent(depth: number): string {
    let text = '';
    for (let i = 0; i < depth; i++) {
        text += '\u00a0\u00a0';
    }
    return text;
}

function addSublabelLinks(): void {
    if (!boot) {
        return;
    }
    const opener = document.querySelector('a[data-modal-on-show="initNewFolder"]');
    if (!opener) {
        return;
    }
    const triggers = document.querySelectorAll('.folder-delete-trigger');
    for (let i = 0; i < triggers.length; i++) {
        const trigger = triggers[i] as HTMLElement;
        const parent = trigger.parentElement;
        if (!parent || parent.querySelector('.nestedtags-sublabel')) {
            continue;
        }
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'btn btn-link nestedtags-sublabel';
        link.textContent = boot.sublabel;
        const folderId = trigger.getAttribute('data-folder_id') || '';
        link.addEventListener('click', function (event) {
            event.preventDefault();
            fromSublabel = true;
            pendingParent = folderId;
            (opener as HTMLElement).click();
        });
        parent.insertBefore(link, trigger);
    }
}

function paint(): void {
    nestSidebar();
    paintTags();
    paintPicker();
    injectParents(document, '');
}

function nestSidebar(): void {
    const root = document.querySelector('#folders');
    if (!root) {
        return;
    }
    const byId: Record<number, HTMLElement> = {};
    const items = root.querySelectorAll('li[data-folder_id]');
    for (let i = 0; i < items.length; i++) {
        const item = items[i] as HTMLElement;
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (id) {
            byId[id] = item;
        }
    }
    for (let n = 0; n < nodes.length; n++) {
        const node = nodes[n];
        const item = byId[node.id];
        const parentItem = node.parent ? byId[node.parent] : null;
        if (!item || !parentItem) {
            continue;
        }
        let list = parentItem.querySelector(':scope > ul.nestedtags-children') as HTMLElement | null;
        if (!list) {
            list = document.createElement('ul');
            list.className = 'nestedtags-children';
            parentItem.appendChild(list);
        }
        if (item.parentElement !== list) {
            list.appendChild(item);
        }
    }
    applyCollapse(root);
}

function applyCollapse(root: Element): void {
    const key = 'nestedtags.collapse.' + mailboxId();
    let closed: number[] = [];
    try {
        const stored = localStorage.getItem(key);
        const parsed = stored ? JSON.parse(stored) : [];
        if (parsed && parsed.length !== undefined) {
            closed = parsed;
        }
    } catch (e) {
        closed = [];
    }
    const parents = root.querySelectorAll('li[data-folder_id]');
    for (let i = 0; i < parents.length; i++) {
        const item = parents[i] as HTMLElement;
        const list = item.querySelector(':scope > ul.nestedtags-children');
        if (!list) {
            continue;
        }
        const id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        const isClosed = closed.indexOf(id) !== -1;
        if (isClosed) {
            item.classList.add('nestedtags-collapsed');
        } else {
            item.classList.remove('nestedtags-collapsed');
        }
        let toggle = item.querySelector(':scope > .nestedtags-toggle') as HTMLButtonElement | null;
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'nestedtags-toggle';
            toggle.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                item.classList.toggle('nestedtags-collapsed');
                remember(key, id, item.classList.contains('nestedtags-collapsed'));
                if (toggle) {
                    toggle.setAttribute('aria-expanded', item.classList.contains('nestedtags-collapsed') ? 'false' : 'true');
                }
            });
            item.insertBefore(toggle, item.firstChild);
        }
        toggle.textContent = item.classList.contains('nestedtags-collapsed') ? '\u25b8' : '\u25be';
        toggle.setAttribute('aria-expanded', isClosed ? 'false' : 'true');
    }
}

function remember(key: string, id: number, collapsed: boolean): void {
    let closed: number[] = [];
    try {
        const stored = localStorage.getItem(key);
        const parsed = stored ? JSON.parse(stored) : [];
        if (parsed && parsed.length !== undefined) {
            closed = parsed;
        }
    } catch (e) {
        closed = [];
    }
    const next: number[] = [];
    for (let i = 0; i < closed.length; i++) {
        if (closed[i] !== id) {
            next.push(closed[i]);
        }
    }
    if (collapsed) {
        next.push(id);
    }
    localStorage.setItem(key, JSON.stringify(next));
}

function paintTags(): void {
    const chips = document.querySelectorAll('.tag-name');
    for (let i = 0; i < chips.length; i++) {
        const chip = chips[i] as HTMLElement;
        const raw = chip.getAttribute('data-nestedtags-tag') || (chip.textContent || '').trim();
        chip.setAttribute('data-nestedtags-tag', raw);
        const path = paths[raw.toLowerCase()];
        if (path) {
            chip.textContent = path;
        }
    }
}

function paintPicker(): void {
    const selects = document.querySelectorAll('select[name="tag_name"], select.tag-input');
    for (let s = 0; s < selects.length; s++) {
        const select = selects[s] as HTMLSelectElement;
        const options = select.querySelectorAll('option');
        for (let o = 0; o < options.length; o++) {
            const option = options[o];
            const value = option.value;
            if (!value || option.getAttribute('data-nestedtags-label')) {
                continue;
            }
            const match = folderForTag(value);
            if (!match) {
                continue;
            }
            option.setAttribute('data-nestedtags-label', '1');
            option.textContent = indent(depthOf(match.id)) + match.name;
        }
    }
}

function folderForTag(tag: string): NestedNode | null {
    let found: NestedNode | null = null;
    const needle = tag.toLowerCase();
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].tag.toLowerCase() !== needle) {
            continue;
        }
        if (found) {
            return null;
        }
        found = nodes[i];
    }
    return found;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

window.nestedtagsStart = nestedtagsStart;
