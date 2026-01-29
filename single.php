<?php

/**
 * This file contains single post content
 *
 * @package askeetheme
 * @license GPL-3.0-or-later
 */

get_header();
global $post;

$post = get_post();
$page_id = $post->ID;

$prev_post = get_previous_post();
$next_post = get_next_post();

?>

<?php get_footer(); ?>
