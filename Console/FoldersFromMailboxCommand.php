<?php

namespace Modules\NestedTags\Console;

use App\Mailbox;
use Illuminate\Console\Command;
use Modules\NestedTags\Support\FolderTree;

/**
 * Beta. Builds custom folders from the folders of a mailbox FreeScout already fetches.
 */
class FoldersFromMailboxCommand extends Command
{
    protected $signature = 'nestedtags:folders-from-mailbox {mailbox_id : Mailbox whose saved connection is read}';

    protected $description = 'Beta. Build custom folders from the folders of a connected mailbox';

    public function handle()
    {
        $this->line('Beta. Builds custom folders from the mailbox folder list. Conversations stay as they are.');
        $mailbox = Mailbox::find((int) $this->argument('mailbox_id'));
        if (!$mailbox) {
            $this->error('Mailbox not found.');

            return 1;
        }
        $listed = FolderTree::listMailboxFolders($mailbox);
        if ($listed === null) {
            $this->error('Folder list incomplete. Nothing was written.');

            return 1;
        }
        FolderTree::buildFromMailboxLabels($mailbox, $listed);
        $this->line('Beta. Mailbox folders applied.');

        return 0;
    }
}
