<?php

get_header();

?>

<div class="askee-chat askee-blog">
    <div class="container-fluid container-fluid--padding" data-askee-page="blog">
        <div class="row askee-blog__row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper askee-blog__wrapper">
                    <?php if (have_posts()) : ?>
                        <?php while (have_posts()) : the_post(); ?>

                        <div class="askee-chat__box askee-chat__box--blog" data-post-id="<?php the_ID(); ?>">
                            <div class="askee-chat__switch-sections">
                                <div class="askee-chat__content askee-chat__content--blog askee-chat__content--active" id="askee-chat-content-blog-<?php the_ID(); ?>">
                                    <p class="askee-chat__welcome askee-blog__welcome">
                                        <span class="askee-blog__date"><?php echo get_the_date('d.m.Y'); ?></span>
                                        <?php the_title(); ?>
                                    </p>
                                    <div class="askee-blog__excerpt"><?php the_excerpt(); ?></div>
                                </div>
                            </div>

                            <form class="askee-chat__form">
                                <textarea class="askee-chat__textarea" name="user_message" placeholder="Zapytaj Askee o ten wpis..." required></textarea>
                                <button type="submit" class="askee-chat__submit"><?php echo wp_get_attachment_image(5070, "large"); ?></button>
                            </form>
                        </div>

                    <?php endwhile; ?>
                    <?php endif; ?>
                </div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>
