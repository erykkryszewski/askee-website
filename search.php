<?php

get_header(); global $post; $post = get_post(); $page_id = $post->ID; $s = get_search_query(); $args = [ "s" => $s, ];

?>

<?php get_footer(); ?>
