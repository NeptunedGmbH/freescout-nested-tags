<?php

namespace Modules\NestedTags\Support;

/**
 * Pure hierarchy rules. No database and no Laravel.
 */
class TreeRules
{
    /**
     * @param array<int,int|null> $parentOf
     * @param array<int,int> $folderMailbox
     * @param int[] $customIds
     */
    public static function reject($folderId, $parentId, array $parentOf, array $folderMailbox, $mailboxId, array $customIds)
    {
        $folderId = (int) $folderId;
        $mailboxId = (int) $mailboxId;
        $parentId = $parentId === null || $parentId === '' ? null : (int) $parentId;
        if (!isset($folderMailbox[$folderId]) || (int) $folderMailbox[$folderId] !== $mailboxId) {
            return 'mailbox';
        }
        if (!in_array($folderId, $customIds, true)) {
            return 'type';
        }
        if ($parentId === null) {
            return null;
        }
        if ($parentId === $folderId) {
            return 'self';
        }
        if (!isset($folderMailbox[$parentId]) || (int) $folderMailbox[$parentId] !== $mailboxId) {
            return 'mailbox';
        }
        if (!in_array($parentId, $customIds, true)) {
            return 'type';
        }
        $cursor = $parentId;
        $seen = array();
        while ($cursor !== null) {
            if (isset($seen[$cursor]) || $cursor === $folderId) {
                return 'cycle';
            }
            $seen[$cursor] = true;
            if (!array_key_exists($cursor, $parentOf) || $parentOf[$cursor] === null) {
                break;
            }
            $cursor = (int) $parentOf[$cursor];
        }

        return null;
    }

    public static function authorize($can)
    {
        return $can ? null : 'forbidden';
    }

    /**
     * Changing one parent leaves every other edge, including descendants, in place.
     *
     * @param array<int,int|null> $parentOf
     * @return array<int,int|null>
     */
    public static function reparent(array $parentOf, $folderId, $parentId)
    {
        $folderId = (int) $folderId;
        if ($parentId === null || $parentId === '') {
            unset($parentOf[$folderId]);

            return $parentOf;
        }
        $parentOf[$folderId] = (int) $parentId;

        return $parentOf;
    }

    /**
     * Folder ids from the parent upward, not including $id.
     *
     * @param array<int,int|null> $parentOf
     * @return int[]
     */
    public static function ancestors($id, array $parentOf)
    {
        $out = array();
        $seen = array();
        $cursor = array_key_exists((int) $id, $parentOf) ? $parentOf[(int) $id] : null;
        while ($cursor !== null && !isset($seen[(int) $cursor])) {
            $cursor = (int) $cursor;
            $seen[$cursor] = true;
            $out[] = $cursor;
            if (!array_key_exists($cursor, $parentOf) || $parentOf[$cursor] === null) {
                break;
            }
            $cursor = $parentOf[$cursor];
        }

        return $out;
    }

    public static function descendants($id, array $parentOf)
    {
        $id = (int) $id;
        $out = array();
        foreach ($parentOf as $child => $parent) {
            if ((int) $parent !== $id) {
                continue;
            }
            $child = (int) $child;
            $out[] = $child;
            foreach (self::descendants($child, $parentOf) as $next) {
                $out[] = $next;
            }
        }

        return $out;
    }

    /**
     * @param array<int,string> $folderTags
     * @param string[] $tagsUsedElsewhere
     * @return array{delete:int[],detach:string[],keep:string[]}
     */
    public static function deletePlan($root, array $parentOf, array $folderTags, array $tagsUsedElsewhere)
    {
        $delete = self::descendants($root, $parentOf);
        $delete[] = (int) $root;
        $detach = array();
        $keep = array();
        foreach ($delete as $id) {
            if (!isset($folderTags[$id]) || $folderTags[$id] === '') {
                continue;
            }
            $tag = (string) $folderTags[$id];
            $detach[$tag] = $tag;
            if (in_array($tag, $tagsUsedElsewhere, true)) {
                $keep[$tag] = $tag;
            }
        }

        return array(
            'delete' => array_values($delete),
            'detach' => array_values($detach),
            'keep' => array_values($keep),
        );
    }

    /**
     * @param int[] $existingIds
     */
    public static function stale($parentId, array $existingIds)
    {
        if ($parentId === null || $parentId === '') {
            return false;
        }

        return !in_array((int) $parentId, $existingIds, true);
    }

    /**
     * @param array<int,array{name:string,tag:string}> $folders
     * @param array<int,int|null> $parentOf
     * @return array<string,string>
     */
    public static function tagPaths(array $folders, array $parentOf)
    {
        $byTag = array();
        foreach ($folders as $id => $folder) {
            $tag = isset($folder['tag']) ? (string) $folder['tag'] : '';
            if ($tag === '') {
                continue;
            }
            $byTag[$tag][] = self::path((int) $id, $folders, $parentOf);
        }
        $out = array();
        foreach ($byTag as $tag => $paths) {
            $unique = array_values(array_unique($paths));
            if (count($unique) === 1 && strpos($unique[0], '/') !== false) {
                $out[$tag] = $unique[0];
            }
        }

        return $out;
    }

    /**
     * @param array<int,array{name:string,tag:string}> $folders
     * @param array<int,int|null> $parentOf
     */
    public static function path($id, array $folders, array $parentOf)
    {
        $parts = array();
        $seen = array();
        $cursor = (int) $id;
        while (!isset($seen[$cursor]) && isset($folders[$cursor])) {
            $seen[$cursor] = true;
            array_unshift($parts, (string) $folders[$cursor]['name']);
            if (!array_key_exists($cursor, $parentOf) || $parentOf[$cursor] === null) {
                break;
            }
            $cursor = (int) $parentOf[$cursor];
        }

        return implode('/', $parts);
    }

    /**
     * Move one folder in the sibling lists and number every custom folder in depth-first order.
     * $childLists keys are parent ids, 0 is the top level. Descendants of the moved folder stay in their lists.
     * Returns null when $beforeId is set and is not a sibling under the new parent.
     *
     * @param array<int,int[]> $childLists
     * @return array{order:array<int,int>, parentOf:array<int,int|null>}|null
     */
    public static function siblingOrder(array $childLists, $movedId, $newParent, $beforeId)
    {
        $movedId = (int) $movedId;
        $newParent = ($newParent === null || $newParent === '' || (int) $newParent === 0) ? 0 : (int) $newParent;
        $beforeId = ($beforeId === null || $beforeId === '' || (int) $beforeId === 0) ? 0 : (int) $beforeId;
        $lists = array();
        foreach ($childLists as $parent => $kids) {
            $clean = array();
            foreach ($kids as $kid) {
                $kid = (int) $kid;
                if ($kid === $movedId || $kid === 0) {
                    continue;
                }
                $clean[] = $kid;
            }
            $lists[(int) $parent] = $clean;
        }
        if (!isset($lists[$newParent])) {
            $lists[$newParent] = array();
        }
        $siblings = $lists[$newParent];
        $index = count($siblings);
        if ($beforeId !== 0) {
            $found = array_search($beforeId, $siblings, true);
            if ($found === false) {
                return null;
            }
            $index = (int) $found;
        }
        array_splice($siblings, $index, 0, array($movedId));
        $lists[$newParent] = $siblings;

        $order = array();
        $parentOf = array();
        $next = 1;
        $visit = function ($parent) use (&$visit, &$lists, &$order, &$parentOf, &$next) {
            $kids = isset($lists[$parent]) ? $lists[$parent] : array();
            foreach ($kids as $kid) {
                if (isset($order[$kid])) {
                    continue;
                }
                $order[$kid] = $next;
                $next++;
                $parentOf[$kid] = $parent === 0 ? null : $parent;
                $visit($kid);
            }
        };
        $visit(0);

        return array(
            'order' => $order,
            'parentOf' => $parentOf,
        );
    }

    /**
     * Ancestor tags to add and remove. The folder's own tag is never part of the result.
     *
     * @param string[] $oldAncestors
     * @param string[] $newAncestors
     * @return array{add:string[], remove:string[]}
     */
    public static function tagDelta(array $oldAncestors, array $newAncestors, $ownTag = '')
    {
        $own = strtolower(trim((string) $ownTag));
        $pack = function (array $list) use ($own) {
            $out = array();
            foreach ($list as $tag) {
                $tag = trim((string) $tag);
                if ($tag === '') {
                    continue;
                }
                $key = strtolower($tag);
                if ($own !== '' && $key === $own) {
                    continue;
                }
                if (!isset($out[$key])) {
                    $out[$key] = $tag;
                }
            }

            return $out;
        };
        $old = $pack($oldAncestors);
        $new = $pack($newAncestors);
        $add = array();
        $remove = array();
        foreach ($new as $key => $tag) {
            if (!isset($old[$key])) {
                $add[] = $tag;
            }
        }
        foreach ($old as $key => $tag) {
            if (!isset($new[$key])) {
                $remove[] = $tag;
            }
        }

        return array(
            'add' => $add,
            'remove' => $remove,
        );
    }

    /**
     * Turn a mailbox folder list into short tags and parent links.
     * System folders and the Gmail container are left out.
     * A parent is the lowercase tag of the segment above, or null.
     *
     * @param array<int,array{name:string,delimiter?:string,system?:bool}> $folders
     * @return array<int,array{tag:string,name:string,parent:?string}>
     */
    public static function labelTree(array $folders)
    {
        $nodes = array();
        $order = array();
        foreach ($folders as $folder) {
            $name = isset($folder['name']) ? trim((string) $folder['name']) : '';
            $delimiter = isset($folder['delimiter']) && (string) $folder['delimiter'] !== ''
                ? (string) $folder['delimiter']
                : '/';
            if ($name === '' || !empty($folder['system']) || self::systemMailboxFolder($name, $delimiter)) {
                continue;
            }
            $parts = array();
            foreach (explode($delimiter, $name) as $part) {
                $part = trim($part);
                if ($part !== '') {
                    $parts[] = $part;
                }
            }
            $parent = null;
            foreach ($parts as $part) {
                $key = strtolower($part);
                if (!isset($nodes[$key])) {
                    $nodes[$key] = array(
                        'tag' => $part,
                        'name' => $part,
                        'parent' => $parent,
                    );
                    $order[] = $key;
                }
                $parent = $key;
            }
        }
        $out = array();
        foreach ($order as $key) {
            $out[] = $nodes[$key];
        }

        return $out;
    }

    /**
     * @param array<int,array{name:string,delimiter?:string,system?:bool}> $listed
     * @param array<int,array{tag:string,name:string}> $existing
     * @return array{create:array,edges:array<string,?string>,untouched:int[]}
     */
    public static function labelWrites(array $listed, array $existing)
    {
        $have = array();
        foreach ($existing as $folder) {
            $tag = isset($folder['tag']) ? strtolower(trim((string) $folder['tag'])) : '';
            if ($tag !== '') {
                $have[$tag] = true;
            }
        }
        $planned = array();
        $create = array();
        $edges = array();
        foreach (self::labelTree($listed) as $node) {
            $key = strtolower($node['tag']);
            $planned[$key] = true;
            $edges[$key] = $node['parent'];
            if (!isset($have[$key])) {
                $create[] = $node;
            }
        }
        $untouched = array();
        foreach ($existing as $id => $folder) {
            $tag = isset($folder['tag']) ? strtolower(trim((string) $folder['tag'])) : '';
            if ($tag === '' || !isset($planned[$tag])) {
                $untouched[] = (int) $id;
            }
        }

        return array(
            'create' => $create,
            'edges' => $edges,
            'untouched' => $untouched,
        );
    }

    public static function systemMailboxFolder($name, $delimiter = '/')
    {
        $name = trim((string) $name);
        if ($name === '') {
            return true;
        }
        if (strcasecmp($name, 'INBOX') === 0) {
            return true;
        }
        if (strcasecmp($name, '[Gmail]') === 0) {
            return true;
        }
        $prefix = '[Gmail]'.$delimiter;

        return stripos($name, $prefix) === 0;
    }
}
