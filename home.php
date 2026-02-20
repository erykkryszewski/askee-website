<?php

get_header();

?>

<div class="askee-chat askee-blog">
    <div class="container-fluid container-fluid--padding" data-askee-page="blog">
        <div class="row askee-blog__row">
            <div class="col-12 col-xl-8 offset-xl-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper askee-blog__wrapper"><?php get_template_part("template-parts/blog-grid"); ?></div>
            </div>

            <div class="col-12 col-xl-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>
