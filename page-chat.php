<?php

get_header();
the_post();

get_template_part("template-parts/app-nav");
?>

<div class="container" data-askee-page="chat">
    <h1>Czat</h1>
    <p>To jest strona czatu.</p>
</div>

<?php get_footer(); ?>
