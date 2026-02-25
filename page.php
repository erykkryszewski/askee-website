<?php

get_header();
the_post();

$url = "http://" . $_SERVER["SERVER_NAME"] . $_SERVER["REQUEST_URI"];

?>

<div class="askee-chat askee-privacy">
    <div class="container-fluid container-fluid--padding" data-askee-page="contact" data-askee-topic="kontakt">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper"><?php echo apply_filters('the_title', get_the_content()); ?></div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"></div>
        </div>
    </div>
</div>

<?php get_footer(); ?>
