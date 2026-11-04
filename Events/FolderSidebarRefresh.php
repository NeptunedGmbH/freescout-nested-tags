<?php

namespace Modules\NestedTags\Events;

use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class FolderSidebarRefresh implements ShouldBroadcastNow
{
    /**
     * Stored broadcast payload: the mailbox id and nothing else.
     *
     * @var int
     */
    public $mailbox_id;

    /**
     * @param int $mailboxId
     */
    public function __construct($mailboxId)
    {
        $this->mailbox_id = (int) $mailboxId;
    }

    /**
     * @return \Illuminate\Broadcasting\Channel
     */
    public function broadcastOn()
    {
        return new \Illuminate\Broadcasting\Channel('nestedtags.folders.'.$this->mailbox_id);
    }

    /**
     * @param int $mailboxId
     */
    public static function send($mailboxId)
    {
        $mailboxId = (int) $mailboxId;
        if ($mailboxId < 1) {
            return;
        }
        event(new self($mailboxId));
    }

    /**
     * Render the folder rows for the user who is polling.
     * The active row in that HTML is not the recipient's open folder.
     *
     * @param object $payload
     * @return object|array
     */
    public static function processPayload($payload)
    {
        $mailboxId = 0;
        if (is_object($payload) && isset($payload->mailbox_id)) {
            $mailboxId = (int) $payload->mailbox_id;
        }
        $user = auth()->user();
        $mailbox = $mailboxId > 0 ? \App\Mailbox::rememberForever()->find($mailboxId) : null;
        if (!$user || !$mailbox || !$user->can('viewCached', $mailbox)) {
            return array();
        }

        $folders = $mailbox->getAssesibleFolders();
        $folder = null;
        foreach ($folders as $item) {
            $folder = $item;
            break;
        }
        if (!$folder) {
            $folder = new \App\Folder();
        }
        $html = \View::make('mailboxes/partials/folders')->with(array(
            'mailbox' => $mailbox,
            'folders' => $folders,
            'folder' => $folder,
        ))->render();

        $payload = array(
            'mailbox_id' => (int) $mailbox->id,
            'folders_html' => $html,
        );
        $icons = self::iconsFor($mailbox->id);
        if (is_array($icons)) {
            $payload['icons'] = $icons['icons'];
            $payload['icon_revision'] = $icons['revision'];
        }

        return (object) $payload;
    }

    /**
     * Lucide and emoji live outside the folder partial. Read them when the
     * recipient polls, so a reload is not required to see a new icon.
     * Null means the read failed and the client must keep its current icons.
     *
     * @param int $mailboxId
     * @return array{icons: object, revision: int}|null
     */
    protected static function iconsFor($mailboxId)
    {
        if (!class_exists(\Modules\IconPicker\Support\FolderIcons::class)) {
            return null;
        }
        try {
            $map = \Modules\IconPicker\Support\FolderIcons::map((int) $mailboxId);
            $revision = \Modules\IconPicker\Support\FolderIcons::revision((int) $mailboxId);
        } catch (\Throwable $e) {
            return null;
        }
        if (!is_array($map)) {
            return null;
        }
        $icons = new \stdClass();
        foreach ($map as $folderId => $row) {
            if (!is_array($row)) {
                continue;
            }
            $icons->{(string) $folderId} = array(
                'kind' => isset($row['kind']) ? (string) $row['kind'] : '',
                'value' => isset($row['value']) ? (string) $row['value'] : '',
                'color' => isset($row['color']) ? (string) $row['color'] : '',
            );
        }

        return array(
            'icons' => $icons,
            'revision' => (int) $revision,
        );
    }
}
