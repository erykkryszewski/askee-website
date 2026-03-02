<div class="askee-sidebar">
    <h4 class="askee-sidebar__title">Najnowsze artykuły: </h4>
    <ul class="askee-sidebar__list askee-sidebar__list--articles">
        <?php
        $askee_latest_posts_query = new WP_Query([
            "post_type" => "post",
            "posts_per_page" => 3,
            "post_status" => "publish",
            "ignore_sticky_posts" => true,
        ]);

        if ($askee_latest_posts_query->have_posts()):
            while ($askee_latest_posts_query->have_posts()):
                $askee_latest_posts_query->the_post(); ?>
                <li class="askee-sidebar__list-element">
                    <a href="<?php echo esc_url(get_permalink()); ?>">
                        <div class="askee-sidebar__thumbnail">
                            <?php echo wp_get_attachment_image(get_post_thumbnail_id(), "large"); ?>
                        </div>
                    </a>
                    <a href="<?php echo esc_url(get_permalink()); ?>"><?php echo esc_html(
    get_the_title(),
); ?></a>
                </li>
            <?php
            endwhile;
        else:
             ?>
            <li><span><?php esc_html_e("Brak wpisów.", "askeetheme"); ?></span></li>
        <?php
        endif;

        wp_reset_postdata();
        ?>
    </ul>
    <a href="/blog/" class="askee-sidebar__link">Blog</a>
    <a href="/kategoria/aktualnosci/" class="askee-sidebar__link">Aktualności</a>
</div>
