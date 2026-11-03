"use strict";
/**
 * NestedTags browser surface. Compiled to Public/js/module.js.
 */
var boot = null;
var nodes = [];
var paths = {};
var pendingParent = '';
var fromSublabel = false;
function nestedtagsStart(config) {
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
function mailboxId() {
    if (boot && boot.mailboxId) {
        return boot.mailboxId;
    }
    var raw = getGlobalAttr('mailbox_id');
    var parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
}
function loadTree(id, done) {
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
function fieldsOf(data) {
    var out = {};
    if (typeof data === 'string') {
        var params = new URLSearchParams(data);
        params.forEach(function (value, key) {
            out[key] = value;
        });
        return out;
    }
    if (data) {
        for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                var value = data[key];
                if (typeof value === 'string' || typeof value === 'number') {
                    out[key] = String(value);
                }
            }
        }
    }
    return out;
}
function bindSave() {
    $.ajaxPrefilter(function (options) {
        if (!boot || !options.url || options.url.indexOf('custom-folders/ajax') === -1) {
            return;
        }
        var fields = fieldsOf(options.data);
        if (fields.action !== 'create' && fields.action !== 'update') {
            return;
        }
        if (!Object.prototype.hasOwnProperty.call(fields, 'parent_folder_id')) {
            return;
        }
        var previous = options.success;
        options.success = function (data) {
            var finish = function () {
                if (previous) {
                    previous(data);
                }
            };
            var id = data && data.id ? Number(data.id) : 0;
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
function bindDelete() {
    document.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || !target.closest) {
            return;
        }
        var button = target.closest('.folder-delete-trigger');
        if (!button || !boot) {
            return;
        }
        if (button.getAttribute('data-nestedtags-pass') === '1') {
            button.removeAttribute('data-nestedtags-pass');
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        var id = button.getAttribute('data-folder_id') || '';
        fsAjax({
            action: 'child_names',
            folder_id: id,
            mailbox_id: mailboxId()
        }, boot.url, function (response) {
            var names = response && response.names ? response.names : [];
            if (!names.length) {
                button.setAttribute('data-nestedtags-pass', '1');
                button.click();
                return;
            }
            var lines = names.map(escapeHtml).join('<br>');
            var confirmText = (boot ? boot.confirm : '') + '<br>' + lines;
            var deleteLabel = boot ? boot.deleteLabel : 'Delete';
            showModalConfirm(confirmText, 'nestedtags-delete-ok', {
                on_show: function (modal) {
                    modal.children().find('.nestedtags-delete-ok:first').click(function () {
                        modal.modal('hide');
                        if (!boot) {
                            return;
                        }
                        var foldersUrl = typeof laroute !== 'undefined' ? laroute.route('mailboxes.custom_folders.ajax') : '';
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
                                    var row = document.getElementById('folder-' + id);
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
function bindNewFolder() {
    var original = window.initNewFolder;
    window.initNewFolder = function (modal) {
        if (original) {
            original(modal);
        }
        var preset = pendingParent;
        pendingParent = '';
        var root = modal && modal.length ? modal.get(0) : document;
        injectParents(root || document, preset);
    };
    document.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || !target.closest) {
            return;
        }
        var opener = target.closest('a[data-modal-on-show="initNewFolder"]');
        if (!opener) {
            return;
        }
        if (!fromSublabel) {
            pendingParent = '';
        }
        fromSublabel = false;
    }, true);
}
function injectParents(root, preset) {
    if (!boot) {
        return;
    }
    var forms = root.querySelectorAll('.custom-folders-form, .new-folder-form');
    for (var i = 0; i < forms.length; i++) {
        var form = forms[i];
        if (form.querySelector('[name="parent_folder_id"]')) {
            continue;
        }
        var selfId = form.getAttribute('data-folder_id') || '';
        var wrap = document.createElement('div');
        wrap.className = 'form-group';
        var label = document.createElement('label');
        label.textContent = boot.nestUnder;
        var select = document.createElement('select');
        select.name = 'parent_folder_id';
        select.className = 'form-control';
        var empty = document.createElement('option');
        empty.value = '';
        empty.textContent = boot.topLevel;
        select.appendChild(empty);
        var blocked = blockedIds(selfId);
        for (var n = 0; n < nodes.length; n++) {
            var node = nodes[n];
            if (blocked[node.id]) {
                continue;
            }
            var option = document.createElement('option');
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
function blockedIds(selfId) {
    var blocked = {};
    var self = parseInt(selfId, 10);
    if (!self) {
        return blocked;
    }
    blocked[self] = true;
    var grew = true;
    while (grew) {
        grew = false;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.parent && blocked[node.parent] && !blocked[node.id]) {
                blocked[node.id] = true;
                grew = true;
            }
        }
    }
    return blocked;
}
function depthOf(id) {
    var depth = 0;
    var cursor = id;
    var seen = {};
    while (cursor && !seen[cursor]) {
        seen[cursor] = true;
        var parent_1 = null;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === cursor) {
                parent_1 = nodes[i].parent;
                break;
            }
        }
        if (!parent_1) {
            break;
        }
        depth++;
        cursor = parent_1;
    }
    return depth;
}
function indent(depth) {
    var text = '';
    for (var i = 0; i < depth; i++) {
        text += '\u00a0\u00a0';
    }
    return text;
}
function addSublabelLinks() {
    if (!boot) {
        return;
    }
    var opener = document.querySelector('a[data-modal-on-show="initNewFolder"]');
    if (!opener) {
        return;
    }
    var triggers = document.querySelectorAll('.folder-delete-trigger');
    var _loop_1 = function (i) {
        var trigger = triggers[i];
        var parent_2 = trigger.parentElement;
        if (!parent_2 || parent_2.querySelector('.nestedtags-sublabel')) {
            return "continue";
        }
        var link = document.createElement('a');
        link.href = '#';
        link.className = 'btn btn-link nestedtags-sublabel';
        link.textContent = boot.sublabel;
        var folderId = trigger.getAttribute('data-folder_id') || '';
        link.addEventListener('click', function (event) {
            event.preventDefault();
            fromSublabel = true;
            pendingParent = folderId;
            opener.click();
        });
        parent_2.insertBefore(link, trigger);
    };
    for (var i = 0; i < triggers.length; i++) {
        _loop_1(i);
    }
}
function paint() {
    nestSidebar();
    paintTags();
    paintPicker();
    injectParents(document, '');
}
function nestSidebar() {
    var root = document.querySelector('#folders');
    if (!root) {
        return;
    }
    var byId = {};
    var items = root.querySelectorAll('li[data-folder_id]');
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        if (id) {
            byId[id] = item;
        }
    }
    for (var n = 0; n < nodes.length; n++) {
        var node = nodes[n];
        var item = byId[node.id];
        var parentItem = node.parent ? byId[node.parent] : null;
        if (!item || !parentItem) {
            continue;
        }
        var list = parentItem.querySelector(':scope > ul.nestedtags-children');
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
function applyCollapse(root) {
    var key = 'nestedtags.collapse.' + mailboxId();
    var closed = [];
    try {
        var stored = localStorage.getItem(key);
        var parsed = stored ? JSON.parse(stored) : [];
        if (parsed && parsed.length !== undefined) {
            closed = parsed;
        }
    }
    catch (e) {
        closed = [];
    }
    var parents = root.querySelectorAll('li[data-folder_id]');
    var _loop_2 = function (i) {
        var item = parents[i];
        var list = item.querySelector(':scope > ul.nestedtags-children');
        if (!list) {
            return "continue";
        }
        var id = parseInt(item.getAttribute('data-folder_id') || '', 10);
        var isClosed = closed.indexOf(id) !== -1;
        if (isClosed) {
            item.classList.add('nestedtags-collapsed');
        }
        else {
            item.classList.remove('nestedtags-collapsed');
        }
        var toggle = item.querySelector(':scope > .nestedtags-toggle');
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
    };
    for (var i = 0; i < parents.length; i++) {
        _loop_2(i);
    }
}
function remember(key, id, collapsed) {
    var closed = [];
    try {
        var stored = localStorage.getItem(key);
        var parsed = stored ? JSON.parse(stored) : [];
        if (parsed && parsed.length !== undefined) {
            closed = parsed;
        }
    }
    catch (e) {
        closed = [];
    }
    var next = [];
    for (var i = 0; i < closed.length; i++) {
        if (closed[i] !== id) {
            next.push(closed[i]);
        }
    }
    if (collapsed) {
        next.push(id);
    }
    localStorage.setItem(key, JSON.stringify(next));
}
function paintTags() {
    var chips = document.querySelectorAll('.tag-name');
    for (var i = 0; i < chips.length; i++) {
        var chip = chips[i];
        var raw = chip.getAttribute('data-nestedtags-tag') || (chip.textContent || '').trim();
        chip.setAttribute('data-nestedtags-tag', raw);
        var path = paths[raw.toLowerCase()];
        if (path) {
            chip.textContent = path;
        }
    }
}
function paintPicker() {
    var selects = document.querySelectorAll('select[name="tag_name"], select.tag-input');
    for (var s = 0; s < selects.length; s++) {
        var select = selects[s];
        var options = select.querySelectorAll('option');
        for (var o = 0; o < options.length; o++) {
            var option = options[o];
            var value = option.value;
            if (!value || option.getAttribute('data-nestedtags-label')) {
                continue;
            }
            var match = folderForTag(value);
            if (!match) {
                continue;
            }
            option.setAttribute('data-nestedtags-label', '1');
            option.textContent = indent(depthOf(match.id)) + match.name;
        }
    }
}
function folderForTag(tag) {
    var found = null;
    var needle = tag.toLowerCase();
    for (var i = 0; i < nodes.length; i++) {
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
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
window.nestedtagsStart = nestedtagsStart;
