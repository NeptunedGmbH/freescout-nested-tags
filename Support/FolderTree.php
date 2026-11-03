<?php

namespace Modules\NestedTags\Support;

use App\Folder;
use App\Mailbox;
use Illuminate\Support\Facades\DB;

class FolderTree
{
    const TYPE_CUSTOM = 200;

    public static function mailboxForUser($mailboxId)
    {
        $mailbox = Mailbox::find((int) $mailboxId);
        $user = auth()->user();
        if (!$mailbox || !$user) {
            return null;
        }
        if ($user->isAdmin() || $mailbox->userHasAccess($user->id)) {
            return $mailbox;
        }

        return null;
    }

    public static function canUpdate($mailbox)
    {
        if (!$mailbox || !class_exists(\CustomFolder::class)) {
            return false;
        }

        return (bool) \CustomFolder::canUserUpdateMailboxCustomFolders($mailbox);
    }

    /**
     * @return array{nodes:array<int,array>,paths:array<string,string>}
     */
    public static function tree($mailboxId)
    {
        $mailboxId = (int) $mailboxId;
        $folders = self::customFolders($mailboxId);
        $ids = array_map('intval', array_keys($folders));
        self::dropStale($ids);
        $parentOf = self::parents($ids);
        $nodes = array();
        foreach ($folders as $id => $folder) {
            $parent = isset($parentOf[$id]) ? (int) $parentOf[$id] : null;
            $nodes[] = array(
                'id' => (int) $id,
                'parent' => $parent,
                'name' => $folder['name'],
                'tag' => $folder['tag'],
            );
        }

        return array(
            'nodes' => $nodes,
            'paths' => TreeRules::tagPaths($folders, $parentOf),
        );
    }

    /**
     * @return string|null error code, null when stored
     */
    public static function setParent($mailbox, $folderId, $parentId)
    {
        if (TreeRules::authorize(self::canUpdate($mailbox)) !== null) {
            return 'forbidden';
        }
        $mailboxId = (int) $mailbox->id;
        $folderId = (int) $folderId;
        $parentId = $parentId === null || $parentId === '' ? null : (int) $parentId;
        $folders = self::customFolders($mailboxId);
        $parentOf = self::parents(array_map('intval', array_keys($folders)));
        $folderMailbox = array();
        $customIds = array();
        foreach ($folders as $id => $folder) {
            $folderMailbox[(int) $id] = $mailboxId;
            $customIds[] = (int) $id;
        }
        $error = TreeRules::reject($folderId, $parentId, $parentOf, $folderMailbox, $mailboxId, $customIds);
        if ($error !== null) {
            return $error;
        }
        if ($parentId === null) {
            DB::table('folder_tree')->where('folder_id', $folderId)->delete();

            return null;
        }
        $exists = DB::table('folder_tree')->where('folder_id', $folderId)->exists();
        if ($exists) {
            DB::table('folder_tree')->where('folder_id', $folderId)->update(array(
                'parent_folder_id' => $parentId,
            ));
        } else {
            DB::table('folder_tree')->insert(array(
                'folder_id' => $folderId,
                'parent_folder_id' => $parentId,
            ));
        }
        self::inheritFromFolder($mailboxId, $folderId);

        return null;
    }

    /**
     * Tag names of the folders above this one, nearest parent first.
     *
     * @return string[]
     */
    public static function ancestorTagNames($folderId)
    {
        $folder = Folder::find((int) $folderId);
        if (!$folder) {
            return array();
        }
        $mailboxId = (int) $folder->mailbox_id;
        $folders = self::customFolders($mailboxId);
        $parentOf = self::parents(array_map('intval', array_keys($folders)));
        $names = array();
        foreach (TreeRules::ancestors((int) $folderId, $parentOf) as $id) {
            if (!empty($folders[$id]['tag'])) {
                $names[] = $folders[$id]['tag'];
            }
        }

        return $names;
    }

    /**
     * Conversations that carry a nested folder's tag also receive every folder tag above it.
     */
    public static function inheritFromFolder($mailboxId, $folderId)
    {
        $mailboxId = (int) $mailboxId;
        $folderId = (int) $folderId;
        $folders = self::customFolders($mailboxId);
        $parentOf = self::parents(array_map('intval', array_keys($folders)));
        $ids = array_merge(array($folderId), TreeRules::descendants($folderId, $parentOf));
        foreach ($ids as $id) {
            self::inheritOne($mailboxId, (int) $id, $folders, $parentOf);
        }
    }

    public static function inheritAll()
    {
        if (!\Schema::hasTable('folder_tree')) {
            return;
        }
        $mailboxIds = DB::table('folder_tree')
            ->join('folders', 'folders.id', '=', 'folder_tree.folder_id')
            ->distinct()
            ->pluck('folders.mailbox_id');
        foreach ($mailboxIds as $mailboxId) {
            $folders = self::customFolders((int) $mailboxId);
            $parentOf = self::parents(array_map('intval', array_keys($folders)));
            foreach (array_keys($parentOf) as $id) {
                self::inheritOne((int) $mailboxId, (int) $id, $folders, $parentOf);
            }
        }
    }

    /**
     * @param array<int,array{name:string,tag:string}> $folders
     * @param array<int,int> $parentOf
     */
    protected static function inheritOne($mailboxId, $folderId, array $folders, array $parentOf)
    {
        if (empty($folders[$folderId]['tag']) || !class_exists(\Modules\Tags\Entities\Tag::class)) {
            return;
        }
        $ancestors = array();
        foreach (TreeRules::ancestors($folderId, $parentOf) as $id) {
            if (!empty($folders[$id]['tag'])) {
                $ancestors[] = $folders[$id]['tag'];
            }
        }
        if (!$ancestors) {
            return;
        }
        $tag = \Modules\Tags\Entities\Tag::where('name', $folders[$folderId]['tag'])->first();
        if (!$tag) {
            return;
        }
        $conversationIds = DB::table('conversation_tag')
            ->join('conversations', 'conversations.id', '=', 'conversation_tag.conversation_id')
            ->where('conversation_tag.tag_id', $tag->id)
            ->where('conversations.mailbox_id', (int) $mailboxId)
            ->pluck('conversations.id');
        foreach ($conversationIds as $conversationId) {
            foreach ($ancestors as $name) {
                \Modules\Tags\Entities\Tag::attachByName($name, (int) $conversationId);
            }
        }
    }

    /**
     * @return string[]
     */
    public static function childNames($mailboxId, $folderId)
    {
        $folders = self::customFolders((int) $mailboxId);
        $parentOf = self::parents(array_map('intval', array_keys($folders)));
        $names = array();
        foreach (TreeRules::descendants((int) $folderId, $parentOf) as $id) {
            if (isset($folders[$id])) {
                $names[] = $folders[$id]['name'];
            }
        }

        return $names;
    }

    /**
     * Deletes descendant folders and detaches tags of the deleted set, including the root folder's tag.
     * The root folder row is left for Custom Folders.
     *
     * @return string|null
     */
    public static function deleteChildren($mailbox, $folderId)
    {
        if (TreeRules::authorize(self::canUpdate($mailbox)) !== null) {
            return 'forbidden';
        }
        $mailboxId = (int) $mailbox->id;
        $folderId = (int) $folderId;
        $folders = self::customFolders($mailboxId);
        if (!isset($folders[$folderId])) {
            return 'type';
        }
        $parentOf = self::parents(array_map('intval', array_keys($folders)));
        $folderTags = array();
        foreach ($folders as $id => $folder) {
            $folderTags[(int) $id] = $folder['tag'];
        }
        $descendants = TreeRules::descendants($folderId, $parentOf);
        $deletedIds = array_merge($descendants, array($folderId));
        $usedHere = self::tagNames($mailboxId, $deletedIds, true);
        $usedAway = self::tagNames($mailboxId, $deletedIds, false);
        $plan = TreeRules::deletePlan($folderId, $parentOf, $folderTags, $usedAway);
        foreach ($plan['detach'] as $tagName) {
            if (in_array($tagName, $usedHere, true)) {
                continue;
            }
            self::detachTagFromMailbox($tagName, $mailboxId, in_array($tagName, $plan['keep'], true));
        }
        if ($descendants) {
            Folder::where('mailbox_id', $mailboxId)
                ->where('type', self::customType())
                ->whereIn('id', $descendants)
                ->delete();
            DB::table('folder_tree')->whereIn('folder_id', $descendants)->delete();
        }
        DB::table('folder_tree')->where('folder_id', $folderId)->delete();
        DB::table('folder_tree')->whereIn('parent_folder_id', array_merge($descendants, array($folderId)))->delete();

        return null;
    }

    /**
     * @param int[] $ids
     */
    protected static function dropStale(array $ids)
    {
        if (!$ids || !\Schema::hasTable('folder_tree')) {
            return;
        }
        $rows = DB::table('folder_tree')->whereIn('folder_id', $ids)->get();
        foreach ($rows as $row) {
            if (TreeRules::stale($row->parent_folder_id, $ids)) {
                DB::table('folder_tree')->where('folder_id', (int) $row->folder_id)->delete();
            }
        }
    }

    /**
     * @param int[] $ids
     * @return array<int,int>
     */
    protected static function parents(array $ids)
    {
        $parentOf = array();
        if (!$ids || !\Schema::hasTable('folder_tree')) {
            return $parentOf;
        }
        $rows = DB::table('folder_tree')->whereIn('folder_id', $ids)->get();
        foreach ($rows as $row) {
            if ($row->parent_folder_id === null) {
                continue;
            }
            $parent = (int) $row->parent_folder_id;
            if (!in_array($parent, $ids, true)) {
                continue;
            }
            $parentOf[(int) $row->folder_id] = $parent;
        }

        return $parentOf;
    }

    /**
     * @return array<int,array{name:string,tag:string}>
     */
    protected static function customFolders($mailboxId)
    {
        $out = array();
        $type = self::customType();
        $rows = Folder::where('mailbox_id', (int) $mailboxId)->where('type', $type)->get();
        foreach ($rows as $folder) {
            $meta = is_array($folder->meta) ? $folder->meta : array();
            $name = isset($meta['name']) ? (string) $meta['name'] : '';
            $tag = '';
            $tagId = isset($meta['tag_id']) ? (int) $meta['tag_id'] : 0;
            if ($tagId && class_exists(\Modules\Tags\Entities\Tag::class)) {
                $tagRow = \Modules\Tags\Entities\Tag::find($tagId);
                if ($tagRow) {
                    $tag = (string) $tagRow->name;
                }
            }
            $out[(int) $folder->id] = array(
                'name' => $name,
                'tag' => $tag,
            );
        }

        return $out;
    }

    /**
     * Tag names still referenced by a remaining custom folder.
     * $sameMailbox true keeps this mailbox, false keeps every other mailbox.
     *
     * @param int[] $deletedIds
     * @return string[]
     */
    protected static function tagNames($mailboxId, array $deletedIds, $sameMailbox)
    {
        $used = array();
        $query = Folder::where('type', self::customType())->whereNotIn('id', $deletedIds);
        if ($sameMailbox) {
            $query->where('mailbox_id', (int) $mailboxId);
        } else {
            $query->where('mailbox_id', '!=', (int) $mailboxId);
        }
        foreach ($query->get() as $folder) {
            $meta = is_array($folder->meta) ? $folder->meta : array();
            $tagId = isset($meta['tag_id']) ? (int) $meta['tag_id'] : 0;
            if (!$tagId || !class_exists(\Modules\Tags\Entities\Tag::class)) {
                continue;
            }
            $tagRow = \Modules\Tags\Entities\Tag::find($tagId);
            if ($tagRow) {
                $used[] = (string) $tagRow->name;
            }
        }

        return array_values(array_unique($used));
    }

    protected static function detachTagFromMailbox($tagName, $mailboxId, $keepRow)
    {
        if (!class_exists(\Modules\Tags\Entities\Tag::class)) {
            return;
        }
        $tag = \Modules\Tags\Entities\Tag::where('name', $tagName)->first();
        if (!$tag) {
            return;
        }
        $conversationIds = DB::table('conversations')->where('mailbox_id', (int) $mailboxId)->pluck('id')->all();
        foreach (array_chunk($conversationIds, 500) as $chunk) {
            if (!$chunk) {
                continue;
            }
            DB::table('conversation_tag')->where('tag_id', $tag->id)->whereIn('conversation_id', $chunk)->delete();
        }
        $remaining = (int) DB::table('conversation_tag')->where('tag_id', $tag->id)->count();
        if ($remaining === 0 && !$keepRow) {
            $tag->delete();

            return;
        }
        $tag->counter = $remaining;
        $tag->save();
    }

    protected static function customType()
    {
        if (class_exists(\CustomFolder::class) && defined('\CustomFolder::TYPE_CUSTOM')) {
            return (int) \CustomFolder::TYPE_CUSTOM;
        }

        return self::TYPE_CUSTOM;
    }
}
