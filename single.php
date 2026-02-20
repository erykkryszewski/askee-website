<?php

/**
 * This file contains single post content
 *
 * @package askeetheme
 * @license GPL-3.0-or-later
 */

get_header();

?>

<div class="askee-chat askee-blog">
    <div class="container-fluid container-fluid--padding" data-askee-page="single">
        <div class="row askee-blog__row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper askee-blog__wrapper"><?php get_template_part("template-parts/single"); ?></div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>

<?php get_footer(); ?>
