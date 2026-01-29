<?php

get_header();
global $post;

$post = get_post();
$page_id = $post->ID;
$blog_page = filter_input(INPUT_GET, "blog-page", FILTER_SANITIZE_NUMBER_INT);
$current_blog_page = $blog_page ? $blog_page : 1;

$args = [
    "post_status" => "publish",
    "posts_per_page" => 10,
    "orderby" => "title",
    "paged" => $current_blog_page,
];

?>

<?php get_footer(); ?>
