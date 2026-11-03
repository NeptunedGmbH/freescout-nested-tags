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
}
