<div class="askee-sidebar">
    <h4 class="askee-sidebar__title">Najnowsze artykuły: </h4>
    <ul class="askee-sidebar__list askee-sidebar__list--articles">
        <?php
        $askee_latest_posts_query = new WP_Query([
            "post_type" => "post",
            "posts_per_page" => 3,
            "post_status" => "publish",
            "ignore_sticky_posts" => true,
            "post__not_in" => is_single() ? [get_queried_object_id()] : [],
        ]);

        if ($askee_latest_posts_query->have_posts()):
            while ($askee_latest_posts_query->have_posts()):
                $askee_latest_posts_query->the_post(); ?>
                <li>
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

    <ul class="askee-social-media">
        <!-- <li>
            <a href="#" target="_blank">
                <?php echo wp_get_attachment_image(5069, "large"); ?>
            </a>
        </li>
        <li>
            <a href="#" target="_blank">
                <?php echo wp_get_attachment_image(5068, "large"); ?>
            </a>
        </li> -->
        <li>
            <a href="#" target="_blank">
                <?php echo wp_get_attachment_image(5067, "large"); ?>
            </a>
        </li>
    </ul>
</div>
