<?php

namespace Modules\NestedTags\Http\Controllers;

use App\Folder;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\NestedTags\Support\FolderTree;

class NestedTagsController extends Controller
{
    public function ajax(Request $request)
    {
        $action = (string) $request->input('action');
        $mailbox = $this->mailbox($request);
        if (!$mailbox) {
            return $this->fail(__('You do not have access to this mailbox.'));
        }
        if ($action === 'tree') {
            $tree = FolderTree::tree($mailbox->id);

            return response()->json(array(
                'status' => 'success',
                'nodes' => $tree['nodes'],
                'paths' => $tree['paths'],
            ));
        }
        if ($action === 'child_names') {
            return response()->json(array(
                'status' => 'success',
                'names' => FolderTree::childNames($mailbox->id, (int) $request->input('folder_id')),
            ));
        }
        if ($action === 'set_parent') {
            $error = FolderTree::setParent(
                $mailbox,
                (int) $request->input('folder_id'),
                $request->input('parent_folder_id')
            );

            return $error ? $this->fail($this->message($error)) : $this->ok();
        }
        if ($action === 'delete_children') {
            $error = FolderTree::deleteChildren($mailbox, (int) $request->input('folder_id'));

            return $error ? $this->fail($this->message($error)) : $this->ok();
        }

        return $this->fail(__('Unknown action.'));
    }

    protected function mailbox(Request $request)
    {
        $mailboxId = (int) $request->input('mailbox_id');
        if ($mailboxId === 0) {
            $folder = Folder::find((int) $request->input('folder_id'));
            $mailboxId = $folder ? (int) $folder->mailbox_id : 0;
        }

        return FolderTree::mailboxForUser($mailboxId);
    }

    protected function ok()
    {
        return response()->json(array(
            'status' => 'success',
            'msg_success' => __('Saved'),
        ));
    }

    protected function fail($message)
    {
        return response()->json(array(
            'status' => 'error',
            'msg' => $message,
            'msg_error' => $message,
        ));
    }

    protected function message($error)
    {
        if ($error === 'forbidden') {
            return __('You do not have permission to manage folders.');
        }
        if ($error === 'cycle' || $error === 'self') {
            return __('A folder cannot sit inside itself.');
        }
        if ($error === 'mailbox') {
            return __('The folder belongs to another mailbox.');
        }

        return __('Only a custom folder can be nested.');
    }
}
