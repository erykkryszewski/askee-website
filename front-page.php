<?php

get_header(); the_post(); $current_view_name = "default"; if (isset($_GET["view"])) { $current_view_name = sanitize_text_field(wp_unslash($_GET["view"])); }

?>

<div class="askee-front-navigation mt-200">
    <div class="container">
        <div class="askee-front-navigation__buttons">
            <a class="button" href="<?php echo esc_url(add_query_arg("view", "section-one", home_url("/"))); ?>">Sekcja pierwsza</a>
            <a class="button" href="<?php echo esc_url(add_query_arg("view", "section-two", home_url("/"))); ?>">Sekcja druga</a>
            <a class="button" href="<?php echo esc_url(home_url("/")); ?>">Widok domyślny</a>
        </div>
    </div>
</div>

<div class="askee-front-content">
    <div class="container">
        <?php
        if ($current_view_name === "section-one") {
            get_template_part("template-parts/askee/section", "one");
        } elseif ($current_view_name === "section-two") {
            get_template_part("template-parts/askee/section", "two");
        } else {
            ?>
        <div class="askee-section askee-section--default">
            <h1>Widok domyślny</h1>
            <p>To jest podstawowy widok strony głównej.</p>
        </div>
        <?php } ?>
    </div>
</div>

<?php get_footer(); ?>
