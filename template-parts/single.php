<?php

$askee_category_icon_map = [
    "biznes" => "fa-regular fa-briefcase",
    "sztuczna-inteligencja" => "fa-regular fa-lightbulb",
    "hr" => "fa-solid fa-user-group",
    "aktualnosci" => "fa-regular fa-newspaper",
];
$askee_default_category_icon = $askee_category_icon_map["aktualnosci"];
$askee_default_thumbnail_id = 5091;

if (have_posts()):
    while (have_posts()):

        the_post();

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

        $askee_post_category_link = "";
        if ($askee_post_category instanceof WP_Term) {
            $askee_post_category_link_candidate = get_category_link($askee_post_category->term_id);
            if (!is_wp_error($askee_post_category_link_candidate)) {
                $askee_post_category_link = $askee_post_category_link_candidate;
            }
        }

        $askee_author_id = (int) get_the_author_meta("ID");
        $askee_author_pseudonim = trim((string) get_the_author_meta("pseudonim", $askee_author_id));
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

        $askee_post_excerpt = trim((string) get_the_excerpt());
        if ("" === $askee_post_excerpt) {
            $askee_raw_content = (string) get_the_content(null, false, get_the_ID());
            $askee_clean_content = trim(wp_strip_all_tags(strip_shortcodes($askee_raw_content)));
            $askee_clean_content = preg_replace("/\s+/", " ", $askee_clean_content);
            if (!empty($askee_clean_content)) {
                if (
                    preg_match("/^(.+?[.!?])(\s|$)/u", $askee_clean_content, $askee_sentence_match)
                ) {
                    $askee_post_excerpt = trim($askee_sentence_match[1]);
                } else {
                    $askee_post_excerpt = wp_trim_words($askee_clean_content, 24, "...");
                }
            }
        }

        $askee_permalink = get_permalink();
        $askee_post_title = get_the_title();

        $askee_share_facebook_url =
            "https://www.facebook.com/sharer/sharer.php?u=" . rawurlencode($askee_permalink);
        $askee_share_x_url =
            "https://twitter.com/intent/tweet?url=" .
            rawurlencode($askee_permalink) .
            "&text=" .
            rawurlencode($askee_post_title);
        $askee_share_link_url =
            "mailto:?subject=" .
            rawurlencode($askee_post_title) .
            "&body=" .
            rawurlencode($askee_permalink);
        ?>

        <article class="askee-blog__single">
            <nav class="askee-blog__single-breadcrumbs" aria-label="Breadcrumb">
                <ul class="askee-blog__single-breadcrumbs-list text-small">
                    <li class="askee-blog__single-breadcrumb-item">
                        <a href="<?php echo esc_url(home_url("/")); ?>"><?php esc_html_e(
    "Home",
    "askeetheme",
); ?></a>
                    </li>
                    <?php if ($askee_post_category instanceof WP_Term): ?>
                        <li
                            class="askee-blog__single-breadcrumb-item askee-blog__single-breadcrumb-item--separator"
                            aria-hidden="true"
                        >
                            <span>&gt;</span>
                        </li>
                        <li class="askee-blog__single-breadcrumb-item">
                            <?php if ("" !== $askee_post_category_link): ?>
                                <a href="<?php echo esc_url(
                                    $askee_post_category_link,
                                ); ?>"><?php echo esc_html($askee_post_category_name); ?></a>
                            <?php else: ?>
                                <span><?php echo esc_html($askee_post_category_name); ?></span>
                            <?php endif; ?>
                        </li>
                    <?php endif; ?>
                    <li
                        class="askee-blog__single-breadcrumb-item askee-blog__single-breadcrumb-item--separator"
                        aria-hidden="true"
                    >
                        <span>&gt;</span>
                    </li>
                    <li class="askee-blog__single-breadcrumb-item askee-blog__single-breadcrumb-item--current">
                        <span><?php echo esc_html($askee_post_title); ?></span>
                    </li>
                </ul>
            </nav>

            <header class="askee-blog__single-header">
                <div class="askee-blog__single-main">
                    <span class="askee-blog__post-category text-small">
                        <i
                            class="askee-blog__post-category-icon <?php echo esc_attr(
                                $askee_post_category_icon ?: "fa-regular fa-folder",
                            ); ?>"
                            aria-hidden="true"
                        ></i>
                        <span><?php echo esc_html($askee_post_category_name); ?></span>
                    </span>

                    <h1 class="askee-blog__single-title h1"><?php echo esc_html(
                        $askee_post_title,
                    ); ?></h1>

                    <?php if ("" !== $askee_post_excerpt): ?>
                        <p class="askee-blog__single-excerpt paragraph"><?php echo esc_html(
                            $askee_post_excerpt,
                        ); ?></p>
                    <?php endif; ?>
                </div>

                <div class="askee-blog__single-meta">
                    <span class="askee-blog__post-author askee-blog__single-author text-small">
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
                        class="askee-blog__single-date text-small"
                        datetime="<?php echo esc_attr(get_the_date("c")); ?>"
                    >
                        <?php echo esc_html(get_the_date()); ?>
                    </time>

                    <div class="askee-blog__single-share">
                        <span class="askee-blog__single-share-label text-small"><?php esc_html_e(
                            "Share",
                            "askeetheme",
                        ); ?></span>
                        <ul class="askee-social-media askee-blog__single-share-list">
                            <li>
                                <a href="<?php echo esc_url(
                                    $askee_share_facebook_url,
                                ); ?>" target="_blank" rel="noopener noreferrer">
                                    <?php echo wp_get_attachment_image(5069, "large"); ?>
                                </a>
                            </li>
                            <li>
                                <a href="<?php echo esc_url(
                                    $askee_share_x_url,
                                ); ?>" target="_blank" rel="noopener noreferrer">
                                    <?php echo wp_get_attachment_image(5068, "large"); ?>
                                </a>
                            </li>
                            <li>
                                <a href="<?php echo esc_url($askee_share_link_url); ?>">
                                    <?php echo wp_get_attachment_image(5067, "large"); ?>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </header>

            <figure class="askee-blog__single-image">
                <?php echo wp_get_attachment_image($askee_post_image_id, "large", false, [
                    "class" => "askee-blog__single-image-file object-fit-cover",
                    "loading" => "lazy",
                ]); ?>
            </figure>

            <div class="askee-blog__single-content">
                <?php the_content(); ?>
            </div>
        </article>
    <?php
    endwhile;
else:
     ?>
    <p class="askee-blog__empty paragraph"><?php esc_html_e(
        "Brak wpisu do wyswietlenia.",
        "askeetheme",
    ); ?></p>
<?php
endif;
?>
