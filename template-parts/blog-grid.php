<?php

$askee_category_icon_map = [
    "biznes" => "https://cdn-icons-png.flaticon.com/512/2608/2608249.png",
    "sztuczna-inteligencja" => "https://cdn-icons-png.flaticon.com/512/3480/3480066.png",
    "hr" => "https://cdn-icons-png.flaticon.com/512/4126/4126442.png",
    "aktualnosci" => "https://cdn-icons-png.flaticon.com/512/12900/12900230.png",
];
$askee_default_category_icon = $askee_category_icon_map["aktualnosci"];
$askee_default_thumbnail_id = 5091;
$askee_post_index = 0;

if (have_posts()) :
    ?>
    <div class="askee-blog__list">
        <?php while (have_posts()) : the_post(); ?>
            <?php
            $askee_post_index++;
            $askee_is_featured_post = 1 === $askee_post_index;

            $askee_post_categories = get_the_category();
            $askee_post_category =
                !empty($askee_post_categories) && isset($askee_post_categories[0])
                    ? $askee_post_categories[0]
                    : null;

            $askee_post_category_slug =
                $askee_post_category instanceof WP_Term ? $askee_post_category->slug : "";
            $askee_post_category_name =
                $askee_post_category instanceof WP_Term
                    ? $askee_post_category->name
                    : __("Aktualnosci", "askeetheme");

            $askee_post_category_icon = isset($askee_category_icon_map[$askee_post_category_slug])
                ? $askee_category_icon_map[$askee_post_category_slug]
                : $askee_default_category_icon;

            $askee_author_id = (int) get_the_author_meta("ID");
            $askee_author_pseudonim = trim(
                (string) get_the_author_meta("pseudonim", $askee_author_id),
            );
            if ("" === $askee_author_pseudonim) {
                $askee_author_pseudonim = trim(
                    (string) get_user_meta($askee_author_id, "pseudonim", true),
                );
            }
            if ("" === $askee_author_pseudonim) {
                $askee_author_pseudonim = trim(
                    (string) get_the_author_meta("nickname", $askee_author_id),
                );
            }
            if ("" === $askee_author_pseudonim) {
                $askee_author_pseudonim = trim(
                    (string) get_the_author_meta("display_name", $askee_author_id),
                );
            }

            $askee_post_image_id = has_post_thumbnail()
                ? get_post_thumbnail_id()
                : $askee_default_thumbnail_id;

            $askee_post_excerpt = "";
            if ($askee_is_featured_post) {
                if (has_excerpt()) {
                    $askee_post_excerpt = trim((string) get_the_excerpt());
                } else {
                    $askee_raw_content = (string) get_the_content(null, false, get_the_ID());
                    $askee_clean_content = trim(
                        wp_strip_all_tags(strip_shortcodes($askee_raw_content)),
                    );
                    $askee_clean_content = preg_replace("/\s+/", " ", $askee_clean_content);
                    if (!empty($askee_clean_content)) {
                        if (
                            preg_match(
                                "/^(.+?[.!?])(\s|$)/u",
                                $askee_clean_content,
                                $askee_sentence_match,
                            )
                        ) {
                            $askee_post_excerpt = trim($askee_sentence_match[1]);
                        } else {
                            $askee_post_excerpt = wp_trim_words($askee_clean_content, 24, "...");
                        }
                    }
                }
            }
            ?>
            <article class="askee-blog__post<?php if ($askee_is_featured_post) {
                echo " askee-blog__post--featured";
            } ?>">
                <a class="askee-blog__post-link" href="<?php the_permalink(); ?>">
                    <div class="askee-blog__post-media">
                        <?php echo wp_get_attachment_image(
                            $askee_post_image_id,
                            "large",
                            false,
                            [
                                "class" => "askee-blog__post-image object-fit-cover",
                                "loading" => "lazy",
                            ],
                        ); ?>
                    </div>

                    <div class="askee-blog__post-content">
                        <span class="askee-blog__post-category text-small">
                            <img
                                class="askee-blog__post-category-icon"
                                src="<?php echo esc_url($askee_post_category_icon); ?>"
                                alt="<?php echo esc_attr(
                                    sprintf(
                                        __("Ikona kategorii %s", "askeetheme"),
                                        $askee_post_category_name,
                                    ),
                                ); ?>"
                                loading="lazy"
                                decoding="async"
                            />
                            <span><?php echo esc_html($askee_post_category_name); ?></span>
                        </span>

                        <h2 class="askee-blog__post-title h3"><?php the_title(); ?></h2>

                        <?php if ($askee_is_featured_post && "" !== $askee_post_excerpt) : ?>
                            <p class="askee-blog__post-excerpt paragraph text-medium"><?php echo esc_html(
                                $askee_post_excerpt,
                            ); ?></p>
                        <?php endif; ?>

                        <div class="askee-blog__post-meta">
                            <span class="askee-blog__post-author text-small">
                                <span class="askee-blog__post-author-avatar">
                                    <?php echo get_avatar($askee_author_id, 32, "", "", [
                                        "class" => "askee-blog__post-author-image object-fit-cover",
                                    ]); ?>
                                </span>
                                <span class="askee-blog__post-author-name"><?php echo esc_html(
                                    $askee_author_pseudonim,
                                ); ?></span>
                            </span>

                            <time
                                class="askee-blog__post-date text-small"
                                datetime="<?php echo esc_attr(get_the_date("c")); ?>"
                            >
                                <?php echo esc_html(get_the_date()); ?>
                            </time>
                        </div>
                    </div>
                </a>
            </article>
        <?php endwhile; ?>
    </div>
<?php else : ?>
    <p class="askee-blog__empty paragraph"><?php esc_html_e(
        "Brak wpisow do wyswietlenia.",
        "askeetheme",
    ); ?></p>
<?php
endif;
?>
