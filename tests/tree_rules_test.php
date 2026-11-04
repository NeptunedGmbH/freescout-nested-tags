<?php

require __DIR__.'/../Support/TreeRules.php';

use Modules\NestedTags\Support\TreeRules;

$failed = 0;

function expect($label, $condition)
{
    global $failed;
    if ($condition) {
        echo "ok  $label\n";

        return;
    }
    echo "FAIL $label\n";
    $failed++;
}

$mailbox = array(1 => 2, 2 => 2, 3 => 2, 4 => 2, 5 => 2, 6 => 4);
$custom = array(1, 2, 3, 4, 5);
$parentOf = array(2 => 1);

expect('valid edge', TreeRules::reject(2, 1, array(), $mailbox, 2, $custom) === null);
expect('self', TreeRules::reject(1, 1, array(), $mailbox, 2, $custom) === 'self');
expect('cycle', TreeRules::reject(1, 2, $parentOf, $mailbox, 2, $custom) === 'cycle');
expect('other mailbox', TreeRules::reject(6, 1, array(), $mailbox, 2, $custom) === 'mailbox');
expect('fifth level', TreeRules::reject(5, 4, array(2 => 1, 3 => 2, 4 => 3), $mailbox, 2, $custom) === null);
expect('forbidden', TreeRules::authorize(false) === 'forbidden');
expect('allowed', TreeRules::authorize(true) === null);

$moved = TreeRules::reparent(array(2 => 1, 3 => 2), 2, 4);
expect('subtree stays', isset($moved[3]) && $moved[3] === 2 && $moved[2] === 4);
expect('ancestors', TreeRules::ancestors(3, array(2 => 1, 3 => 2)) === array(2, 1));

$plan = TreeRules::deletePlan(1, array(2 => 1, 3 => 2), array(1 => 'personal', 2 => 'onboarding', 3 => 'payroll'), array('personal'));
expect('descendants deleted', $plan['delete'] === array(2, 3, 1) || $plan['delete'] === array(3, 2, 1) || count(array_diff(array(1, 2, 3), $plan['delete'])) === 0 && count($plan['delete']) === 3);
sort($plan['detach']);
expect('tags detached', $plan['detach'] === array('onboarding', 'payroll', 'personal'));
expect('tag kept for other mailbox', $plan['keep'] === array('personal'));

expect('stale parent', TreeRules::stale(9, array(1, 2)) === true);
expect('live parent', TreeRules::stale(1, array(1, 2)) === false);
expect('root is not stale', TreeRules::stale(null, array(1)) === false);

$folders = array(
    1 => array('name' => 'Personal', 'tag' => 'personal'),
    2 => array('name' => 'Onboarding', 'tag' => 'onboarding'),
);
$paths = TreeRules::tagPaths($folders, array(2 => 1));
expect('path', isset($paths['onboarding']) && $paths['onboarding'] === 'Personal/Onboarding');
$folders[1]['name'] = 'Team';
$paths = TreeRules::tagPaths($folders, array(2 => 1));
expect('renamed path', isset($paths['onboarding']) && $paths['onboarding'] === 'Team/Onboarding');
$folders[3] = array('name' => 'Onboarding two', 'tag' => 'onboarding');
$paths = TreeRules::tagPaths($folders, array(2 => 1));
expect('shared tag has no path', !isset($paths['onboarding']));

$nested = TreeRules::siblingOrder(array(
    0 => array(1, 2, 4),
    2 => array(3),
), 2, 1, null);
expect('onboarding under personal', $nested && $nested['parentOf'][2] === 1 && $nested['parentOf'][3] === 2);
expect('payroll stays under onboarding', $nested && $nested['order'] === array(1 => 1, 2 => 2, 3 => 3, 4 => 4));

$gap = TreeRules::siblingOrder(array(
    0 => array(2, 5, 3),
), 2, null, 3);
expect('gap keeps top level', $gap && $gap['parentOf'][2] === null && $gap['order'] === array(5 => 1, 2 => 2, 3 => 3));

$lifted = TreeRules::siblingOrder(array(
    0 => array(1, 4),
    1 => array(2),
    2 => array(3),
), 2, null, 4);
expect('top level clears parent', $lifted && $lifted['parentOf'][2] === null && $lifted['parentOf'][3] === 2);
expect('children follow lifted folder', $lifted && $lifted['order'][3] === $lifted['order'][2] + 1);

$delta = TreeRules::tagDelta(array('Personal', 'Team'), array('Projects', 'Team'), 'onboarding');
expect('personal tag leaves', $delta['remove'] === array('Personal'));
expect('projects tag arrives', $delta['add'] === array('Projects'));
expect('team tag stays', !in_array('Team', $delta['add'], true) && !in_array('Team', $delta['remove'], true));
expect('own tag stays out', !in_array('onboarding', $delta['add'], true) && !in_array('onboarding', $delta['remove'], true));

exit($failed === 0 ? 0 : 1);
