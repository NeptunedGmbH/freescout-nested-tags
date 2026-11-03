<div class="row-container">
    <form class="form-horizontal custom-folders-form" method="POST" action="" data-folder_id="{{ $folder->id }}">
        @include('customfolders::partials/form_update', ['mode' => 'update'])

        <div class="form-group margin-top margin-bottom-10">
            <div class="col-sm-10 col-sm-offset-2">
                <button class="btn btn-primary" data-loading-text="{{ __('Saving') }}…">{{ __('Save') }}</button>
                <a href="#" class="btn btn-link text-danger folder-delete-trigger" data-loading-text="{{ __('Deleting') }}…" data-folder_id="{{ $folder->id }}">{{ __('Delete') }}</a>
            </div>
        </div>
    </form>
</div>
