<?php

get_header(); the_post();

?>

<main id="main" class="main <?php if(!is_front_page()) { echo 'main--subpage'; } ?>"><?php the_content(); ?></main>
<?php get_footer(); ?>
